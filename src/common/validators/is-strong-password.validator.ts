import {
  registerDecorator,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from 'class-validator';

@ValidatorConstraint({ name: 'IsStrongPassword', async: false })
export class IsStrongPasswordConstraint implements ValidatorConstraintInterface {
  validate(value: string): boolean {
    if (!value) return false;

    const hasUpperCase = /[A-Z]/.test(value);
    const hasLowerCase = /[a-z]/.test(value);
    const hasNumber = /[0-9]/.test(value);
    const hasSpecialChar = /[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(value);
    const hasMinLength = value.length >= 8;

    return hasUpperCase && hasLowerCase && hasNumber && hasSpecialChar && hasMinLength;
  }

  defaultMessage(): string {
    return 'Password must be at least 8 characters and contain uppercase, lowercase, number, and special character';
  }
}

export function IsStrongPassword(validationOptions?: ValidationOptions) {
  return function (object: object, propertyName: string) {
    registerDecorator({
      name: 'IsStrongPassword',
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsStrongPasswordConstraint,
    });
  };
}
