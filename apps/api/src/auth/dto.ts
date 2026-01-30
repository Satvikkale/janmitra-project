import { IsEmail, IsOptional, IsString, MinLength } from 'class-validator';

export class RegisterDto {
  @IsString() name!: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @MinLength(6) password!: string;
}

export class LoginDto {
  @IsString() identifier!: string; // email or phone
  @IsString() @MinLength(6) password!: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}