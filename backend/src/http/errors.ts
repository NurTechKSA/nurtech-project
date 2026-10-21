export type ErrorCode =
  | 'unauthenticated'
  | 'invalid_credentials'
  | 'forbidden'
  | 'not_found'
  | 'invitation_invalid'
  | 'bad_request'
  | 'validation_failed'
  | 'too_many_attempts'
  | 'internal_error'
  | 'username_taken'
  | 'name_taken'
  | 'link_exists'
  | 'link_cycle'
  | 'stale_position';

export type FieldReason =
  | 'required'
  | 'invalid'
  | 'too_long'
  | 'too_many'
  | 'taken'
  | 'duplicate'
  | 'not_found'
  | 'not_member'
  | 'not_allowed'
  | 'reason_required'
  | 'same_task'
  | 'in_future';

export type FieldErrors = Record<string, FieldReason>;

/** Ошибка API: превращается фильтром в ErrorResponse с нужным HTTP-статусом */
export class ApiError extends Error {
  constructor(
    readonly status: number,
    readonly code: ErrorCode,
    message: string,
    readonly fields?: FieldErrors,
    readonly headers?: Record<string, string>,
  ) {
    super(message);
  }
}

export const badRequest = (message = 'Неверный формат запроса') => new ApiError(400, 'bad_request', message);
export const unauthenticated = () => new ApiError(401, 'unauthenticated', 'Войдите, чтобы продолжить');
export const invalidCredentials = () => new ApiError(401, 'invalid_credentials', 'Неверный логин или пароль');
export const forbidden = (message = 'Недостаточно прав для этого действия') => new ApiError(403, 'forbidden', message);
export const notFound = (message = 'Не найдено') => new ApiError(404, 'not_found', message);
export const invitationInvalid = () =>
  new ApiError(404, 'invitation_invalid', 'Ссылка-приглашение недействительна: она уже использована, устарела или заменена новой');
export const tooManyAttempts = (retryAfterSec: number) =>
  new ApiError(429, 'too_many_attempts', 'Слишком много попыток. Попробуйте позже', undefined, {
    'Retry-After': String(Math.max(1, Math.ceil(retryAfterSec))),
  });

const FIELD_MESSAGES: Partial<Record<FieldReason, string>> = {
  required: 'Заполните обязательные поля',
  too_long: 'Слишком длинное значение',
};

export function validation(fields: FieldErrors, message?: string): ApiError {
  const reasons = Object.values(fields);
  const auto = reasons.length === 1 ? FIELD_MESSAGES[reasons[0]] : undefined;
  return new ApiError(422, 'validation_failed', message ?? auto ?? 'Проверьте поля формы', fields);
}

export const conflict = (code: ErrorCode, message: string, fields?: FieldErrors) =>
  new ApiError(409, code, message, fields);
