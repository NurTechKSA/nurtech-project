import { AbstractControl, ValidationErrors, ValidatorFn } from '@angular/forms';

export function getPasswordsMatchValidator(
  passwordKey: string,
  confirmPassword: string,
  message: string
): ValidatorFn {
  return (group: AbstractControl): ValidationErrors | null => {
    const password = group.get(passwordKey);
    const confirm = group.get(confirmPassword);

    if (!password || !confirm?.value) {
      return null;
    }

    if (password.value !== confirm.value) {
      confirm.setErrors({ ...confirm.errors, other: message });

      return { other: message };
    }

    if (confirm.hasError('other') && confirm.errors?.['other'] === message) {
      const errors = { ...confirm.errors };

      delete errors['other'];
      confirm.setErrors(Object.keys(errors).length ? errors : null);
    }

    return null;
  };
}
