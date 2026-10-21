import { readFileSync } from 'node:fs';
import { Ajv, type ErrorObject, type ValidateFunction } from 'ajv';
import addFormatsModule from 'ajv-formats';
import { parse } from 'yaml';
import { badRequest, validation, type FieldErrors, type FieldReason } from './errors.js';

// ajv-formats публикуется как CommonJS с default-экспортом
const addFormats = addFormatsModule as unknown as (ajv: Ajv) => Ajv;

type Schema = Record<string, any>;

interface Operation {
  id: string;
  method: string;
  path: string;
  permission: string | null;
  isPublic: boolean;
  query: Array<{ name: string; schema: Schema }>;
  bodySchema: Schema | null;
  bodyValidator: ValidateFunction | null;
  queryValidator: ValidateFunction | null;
  responses: Record<string, ValidateFunction | null>;
}

/** Поля, которые не обрезаются по краям: пароли сравниваются как есть */
const NO_TRIM = new Set(['password', 'current', 'next']);
/** Поля, у которых длина проверяется по обрезанному тексту, а хранится исходный (markdown) */
const KEEP_RAW = new Set(['body']);
const REASON_RANK: FieldReason[] = ['required', 'too_long', 'too_many', 'duplicate', 'invalid'];

/**
 * Контракт из openapi.yaml: по нему проверяются тела и query-параметры запросов,
 * а в тестах - ответы. Ошибки схемы переводятся в причины FieldErrorReason (00, раздел 3).
 */
export class Contract {
  readonly doc: Schema;
  private readonly ajv: Ajv;
  private readonly ops = new Map<string, Operation>();

  constructor(openapiPath: string) {
    this.doc = parse(readFileSync(openapiPath, 'utf8'));
    this.ajv = new Ajv({ strict: false, allErrors: true });
    addFormats(this.ajv);
    this.ajv.addSchema({ $id: 'openapi', definitions: convert({ definitions: this.doc.components.schemas }).definitions });

    for (const [path, item] of Object.entries<Schema>(this.doc.paths)) {
      for (const [method, op] of Object.entries<Schema>(item)) {
        if (!op?.operationId) continue;
        const params = (op.parameters ?? []).map((p: Schema) => this.deref(p));
        const query = params
          .filter((p: Schema) => p.in === 'query')
          .map((p: Schema) => ({ name: p.name as string, schema: p.schema as Schema }));
        const bodySchema = op.requestBody?.content?.['application/json']?.schema ?? null;
        const responses: Record<string, ValidateFunction | null> = {};
        for (const [status, resp] of Object.entries<Schema>(op.responses ?? {})) {
          const schema = this.deref(resp).content?.['application/json']?.schema;
          responses[status] = schema ? this.ajv.compile(convert(schema)) : null;
        }
        this.ops.set(op.operationId, {
          id: op.operationId,
          method: method.toUpperCase(),
          path,
          permission: op['x-permission'] ?? null,
          isPublic: op['x-public'] === true,
          query,
          bodySchema,
          bodyValidator: bodySchema ? this.ajv.compile(convert(bodySchema)) : null,
          queryValidator: query.length
            ? this.ajv.compile({
                type: 'object',
                properties: Object.fromEntries(query.map((q: { name: string; schema: Schema }) => [q.name, convert(q.schema)])),
                required: params.filter((p: Schema) => p.in === 'query' && p.required).map((p: Schema) => p.name),
              })
            : null,
          responses,
        });
      }
    }
  }

  operations(): Operation[] {
    return [...this.ops.values()];
  }

  op(id: string): Operation {
    const op = this.ops.get(id);
    if (!op) throw new Error(`Операции ${id} нет в контракте`);
    return op;
  }

  /**
   * Проверяет тело запроса. Строки обрезаются (trim); пустая необязательная строка - null;
   * в POST null равен отсутствию поля; поле, которого нет в схеме, - invalid.
   * Возвращает очищенное тело и исходное (для полей, где хранится исходный текст).
   */
  body<T = Record<string, any>>(opId: string, raw: unknown): { data: T; raw: Record<string, any> } {
    const op = this.op(opId);
    if (raw === undefined || raw === null) raw = {};
    if (typeof raw !== 'object' || Array.isArray(raw)) throw badRequest('Тело запроса должно быть JSON-объектом');
    const input = raw as Record<string, any>;
    const schema = this.deref(op.bodySchema ?? { type: 'object', properties: {} });
    const props: Record<string, Schema> = schema.properties ?? {};
    const fields: FieldErrors = {};
    const data: Record<string, any> = {};

    for (const [key, value] of Object.entries(input)) {
      const def = props[key];
      if (!def) {
        fields[key] = 'invalid';
        continue;
      }
      let v = value;
      if (typeof v === 'string' && !NO_TRIM.has(key)) {
        v = v.trim();
        if (v === '') {
          if (isNullable(def)) v = null;
          else {
            fields[key] = 'required';
            continue;
          }
        }
      }
      if (v === null && op.method === 'POST') continue;
      data[key] = v;
    }

    if (op.bodyValidator && !op.bodyValidator(data)) {
      for (const [field, reason] of Object.entries(mapErrors(op.bodyValidator.errors ?? [], data))) {
        fields[field] ??= reason;
      }
    }
    if (Object.keys(fields).length) throw validation(fields);
    const rawOut: Record<string, any> = {};
    for (const k of KEEP_RAW) if (typeof input[k] === 'string') rawOut[k] = input[k];
    return { data: data as T, raw: rawOut };
  }

  /**
   * Проверяет query-параметры: списки через запятую (дубли отбрасываются), целые числа,
   * пустой после trim параметр - как отсутствующий. Неизвестные параметры игнорируются.
   */
  query<T = Record<string, any>>(opId: string, raw: Record<string, unknown>): T {
    const op = this.op(opId);
    const data: Record<string, any> = {};
    for (const { name, schema } of op.query) {
      let v = raw[name];
      if (v === undefined) continue;
      if (Array.isArray(v)) v = v.join(',');
      if (typeof v !== 'string') {
        data[name] = v;
        continue;
      }
      const s = this.deref(schema);
      if (s.type === 'array') {
        const items = [...new Set(v.split(',').map((x) => x.trim()).filter(Boolean))];
        if (items.length) data[name] = items;
      } else if (s.type === 'integer') {
        const t = v.trim();
        data[name] = /^-?\d+$/.test(t) ? Number(t) : t;
      } else {
        const t = v.trim();
        if (t !== '') data[name] = t;
      }
    }
    if (op.queryValidator && !op.queryValidator(data)) {
      throw validation(mapErrors(op.queryValidator.errors ?? [], data));
    }
    for (const { name, schema } of op.query) {
      const d = this.deref(schema).default;
      if (data[name] === undefined && d !== undefined) data[name] = d;
    }
    return data as T;
  }

  /** Для тестов: проверить ответ по схеме контракта. Возвращает текст ошибок или null. */
  checkResponse(opId: string, status: number, body: unknown): string | null {
    const op = this.op(opId);
    if (!(String(status) in op.responses)) return `статус ${status} не объявлен у ${opId}`;
    const v = op.responses[String(status)];
    if (!v) return body === undefined || body === '' || (typeof body === 'object' && body !== null && !Object.keys(body).length) ? null : `у ${opId} ${status} не должно быть тела`;
    return v(body) ? null : this.ajv.errorsText(v.errors, { dataVar: 'body' });
  }

  private deref(s: Schema): Schema {
    let cur = s;
    while (cur && cur.$ref) {
      const path = (cur.$ref as string).replace(/^#\//, '').split('/');
      cur = path.reduce((acc: Schema, k) => acc[k], this.doc);
    }
    return cur;
  }
}

function isNullable(def: Schema): boolean {
  return def.nullable === true;
}

/** OpenAPI 3.0 -> JSON Schema для ajv: $ref на общий документ, nullable -> anyOf с null */
function convert(s: any): any {
  if (Array.isArray(s)) return s.map(convert);
  if (!s || typeof s !== 'object') return s;
  if (typeof s.$ref === 'string') {
    return { $ref: s.$ref.replace('#/components/schemas/', 'openapi#/definitions/') };
  }
  const out: Record<string, any> = {};
  for (const [k, v] of Object.entries(s)) {
    if (k === 'nullable' || k.startsWith('x-') || k === 'example') continue;
    if (k === 'properties' || k === 'definitions') {
      out[k] = Object.fromEntries(Object.entries(v as object).map(([pk, pv]) => [pk, convert(pv)]));
    } else if (['items', 'additionalProperties', 'allOf', 'anyOf', 'oneOf', 'not'].includes(k)) {
      out[k] = convert(v);
    } else {
      out[k] = v;
    }
  }
  if (s.nullable === true) return { anyOf: [{ type: 'null' }, out] };
  return out;
}

function mapErrors(errors: ErrorObject[], data: Record<string, any>): FieldErrors {
  const found: Record<string, FieldReason[]> = {};
  for (const e of errors) {
    let field: string | undefined;
    let reason: FieldReason;
    if (e.keyword === 'required') {
      field = (e.params as { missingProperty: string }).missingProperty;
      reason = 'required';
    } else if (e.keyword === 'additionalProperties') {
      field = (e.params as { additionalProperty: string }).additionalProperty;
      reason = 'invalid';
    } else {
      field = e.instancePath.split('/')[1];
      const depth = e.instancePath.split('/').length - 1;
      switch (e.keyword) {
        case 'maxLength':
          reason = 'too_long';
          break;
        case 'minLength':
          reason = field && depth === 1 && data[field] === '' ? 'required' : 'invalid';
          break;
        case 'maxItems':
          reason = 'too_many';
          break;
        case 'uniqueItems':
          reason = 'duplicate';
          break;
        default:
          reason = 'invalid';
      }
    }
    if (!field) continue;
    (found[field] ??= []).push(reason);
  }
  const out: FieldErrors = {};
  for (const [field, reasons] of Object.entries(found)) {
    out[field] = REASON_RANK.find((r) => reasons.includes(r)) ?? 'invalid';
  }
  return out;
}
