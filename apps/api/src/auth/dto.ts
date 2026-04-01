import {
  IsEmail,
  IsOptional,
  IsString,
  MinLength,
  IsEnum,
  IsNumber,
  IsArray,
  ValidateNested,
  Min,
} from 'class-validator';
import { Type } from 'class-transformer';

export class RegisterDto {
  @IsString() name!: string;
  @IsEmail() @IsOptional() email?: string;
  @IsString() @IsOptional() phone?: string;
  @IsString() @MinLength(6) password!: string;
}

export class NgoInfoDto {
  @IsString() name!: string;
  @IsString() @IsOptional() subtype?: string;
  @IsString() @IsOptional() city?: string;
  @IsArray() @IsString({ each: true }) categories!: string[];
  @IsString() @IsOptional() contactEmail?: string;
  @IsString() @IsOptional() contactPhone?: string;
  @IsString() @IsOptional() address?: string;
  @IsString() @IsOptional() registrationNumber?: string;
  @IsNumber() @IsOptional() @Min(1900) establishedYear?: number;
  @IsString() @IsOptional() website?: string;
}

export class NgoRegisterDto {
  @IsString() name!: string;
  @IsString() @MinLength(6) password!: string;
  @ValidateNested() @Type(() => NgoInfoDto) ngoInfo!: NgoInfoDto;
}

export class LoginDto {
  @IsString() identifier!: string;
  @IsString() @MinLength(6) password!: string;
  @IsEnum(['admin', 'ngo', 'ngo-user', 'organization', 'org-user']) @IsOptional() userType?: 'admin' | 'ngo' | 'ngo-user' | 'organization' | 'org-user';
  @IsString() @IsOptional() ngoName?: string;
  @IsString() @IsOptional() organizationId?: string;
}

export class RefreshDto {
  @IsString() refreshToken!: string;
}

export class ForgotPasswordDto {
  @IsString() identifier!: string;
  @IsEnum(['admin', 'ngo', 'ngo-user']) userType!: 'admin' | 'ngo' | 'ngo-user';
  @IsString() @IsOptional() ngoName?: string;
}

export class ResetPasswordDto {
  @IsString() identifier!: string;
  @IsEnum(['admin', 'ngo', 'ngo-user']) userType!: 'admin' | 'ngo' | 'ngo-user';
  @IsString() @IsOptional() ngoName?: string;
  @IsString() @MinLength(6) newPassword!: string;
  @IsString() verificationCode!: string;
}

export class OrganizationOwnerDto {
  @IsString() fullName!: string;
  @IsEmail() email!: string;
  @IsString() phoneNumber!: string;
  @IsString() @IsOptional() panNumber?: string;
  @IsString() @IsOptional() aadhaarNumber?: string;
}

export class OrganizationAddressDto {
  @IsString() addressLine1!: string;
  @IsString() @IsOptional() addressLine2?: string;
  @IsString() city!: string;
  @IsString() state!: string;
  @IsString() pincode!: string;
  @IsString() country!: string;
}

export class OrganizationRegisterDto {
  @IsString() businessName!: string;
  @IsString() businessType!: string;
  @IsString() industryType!: string;
  @IsString() registrationNumber!: string;
  @IsString() @IsOptional() gstNumber?: string;
  @IsString() @MinLength(6) password!: string;
  @ValidateNested() @Type(() => OrganizationOwnerDto) owner!: OrganizationOwnerDto;
  @ValidateNested() @Type(() => OrganizationAddressDto) businessAddress!: OrganizationAddressDto;
}

export class OrganizationUserRegisterDto {
  @IsString() organizationId!: string;
  @IsString() organizationName!: string;
  @IsString() name!: string;
  @IsEmail() email!: string;
  @IsString() @IsOptional() mobileNo?: string;
  @IsString() @IsOptional() position?: string;
  @IsString() @MinLength(6) password!: string;
}