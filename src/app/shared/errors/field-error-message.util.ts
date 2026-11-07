type FieldErrorReason =
  'required' | 'too_long' | 'taken' | 'invalid' | 'in_future';

const dictionary: Record<FieldErrorReason, string> = {
  required: 'Заполните поле',
  too_long: 'Проверьте значение',
  taken: 'Такой логин уже занят',
  invalid: 'Не менее 8 символов, буква и цифра',
  in_future: 'Дата не может быть позже завтрашней',
};

export const getFieldErrorMessage = (
  reason: string,
  customMessage?: string
): string => {
  if (customMessage) return customMessage;

  if (reason in dictionary) {
    return dictionary[reason as FieldErrorReason];
  } else {
    return 'Проверьте значение';
  }
};
