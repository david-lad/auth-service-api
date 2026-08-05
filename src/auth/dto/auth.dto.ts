import { IsEmail, IsString, IsOptional } from 'class-validator';
import { IsStrongPassword } from '../../common/validators/is-strong-password.validator';

export class RegisterDto {
  @IsEmail()
  email!: string;

  @IsStrongPassword()
  password!: string;

  @IsString()
  @IsOptional()
  firstName?: string;

  @IsString()
  @IsOptional()
  lastName?: string;
}

export class LoginDto {
  @IsEmail()
  email!: string;

  @IsString()
  password!: string;
}

export class RefreshTokenDto {
  @IsString()
  refreshToken!: string;
}
