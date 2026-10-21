import { hash, verify } from '@node-rs/argon2';
import type { FieldErrors } from '../http/errors.js';

// argon2id с параметрами по умолчанию библиотеки (m=19 МиБ, t=2)
export async function hashPassword(password: string): Promise<string> {
  return hash(password);
}

// Хеш-пустышка: проверка для несуществующего логина занимает столько же времени
let dummyHash: Promise<string> | null = null;

export async function verifyPassword(stored: string | null, password: string): Promise<boolean> {
  if (!stored) {
    dummyHash ??= hash('dummy-password-1');
    await verify(await dummyHash, password).catch(() => false);
    return false;
  }
  return verify(stored, password).catch(() => false);
}

/** Пароль: 8–128 символов, хотя бы одна буква и одна цифра. Длину и пустоту проверяет контракт. */
export function passwordStrengthError(field: string, password: string): FieldErrors | null {
  if (password.length > 128) return { [field]: 'too_long' };
  if (password.length < 8 || !/\p{L}/u.test(password) || !/\p{Nd}/u.test(password)) return { [field]: 'invalid' };
  return null;
}
