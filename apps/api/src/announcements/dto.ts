import { IsArray, IsBoolean, IsDateString, IsIn, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  @IsNotEmpty()
  title: string;

  @IsString()
  @IsNotEmpty()
  message: string;

  @IsString()
  @IsIn(['general', 'maintenance', 'event', 'emergency', 'meeting', 'notice'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsIn(['normal', 'important', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;
}

export class UpdateAnnouncementDto {
  @IsString()
  @IsOptional()
  title?: string;

  @IsString()
  @IsOptional()
  message?: string;

  @IsString()
  @IsIn(['general', 'maintenance', 'event', 'emergency', 'meeting', 'notice'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsIn(['normal', 'important', 'urgent'])
  @IsOptional()
  priority?: string;

  @IsBoolean()
  @IsOptional()
  isPinned?: boolean;

  @IsArray()
  @IsOptional()
  attachments?: string[];

  @IsDateString()
  @IsOptional()
  expiresAt?: string;

  @IsString()
  @IsIn(['active', 'archived'])
  @IsOptional()
  status?: string;
}

export class ListAnnouncementsDto {
  @IsString()
  @IsOptional()
  societyId?: string;

  @IsString()
  @IsIn(['general', 'maintenance', 'event', 'emergency', 'meeting', 'notice'])
  @IsOptional()
  category?: string;

  @IsString()
  @IsIn(['active', 'archived'])
  @IsOptional()
  status?: string;

  @IsString()
  @IsIn(['normal', 'important', 'urgent'])
  @IsOptional()
  priority?: string;
}
