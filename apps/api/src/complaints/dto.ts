import { IsArray, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested, IsNumber } from 'class-validator';
import { Type } from 'class-transformer';

class LocationDto { @IsNumber() lat!: number; @IsNumber() lng!: number; }

export class CreateComplaintDto {
  @IsString() @IsNotEmpty() societyId!: string;
  @IsString() @IsNotEmpty() category!: string;
  @IsString() @IsOptional() subcategory?: string;
  @IsString() @IsOptional() description?: string;
  @IsArray() @IsOptional() media?: string[];
  @ValidateNested() @Type(() => LocationDto) @IsOptional() location?: LocationDto;
  @IsString() @IsOptional() reporterId?: string; // set from token
}

export class ListQueryDto {
  @IsString() @IsOptional() id?: string;
  @IsString() @IsOptional() societyId?: string;
  @IsString() @IsOptional() orgId?: string;
  @IsString() @IsOptional() reporterId?: string;
  @IsIn(['open','assigned','in_progress','resolved','closed']) @IsOptional()
  status?: 'open'|'assigned'|'in_progress'|'resolved'|'closed';
}

export class UpdateStatusDto {
  @IsIn(['open','assigned','in_progress','resolved','closed'])
  status!: 'open'|'assigned'|'in_progress'|'resolved'|'closed';
  @IsString() @IsOptional() note?: string;
  @IsString() @IsOptional() actorId?: string;
}

export class AddCommentDto {
  @IsString() message!: string;
  @IsIn(['public','internal']) visibility!: 'public'|'internal';
  @IsString() @IsOptional() actorId?: string;
}