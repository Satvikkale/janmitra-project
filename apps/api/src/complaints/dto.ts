import { IsArray, IsBoolean, IsIn, IsNotEmpty, IsOptional, IsString, ValidateNested, IsNumber, MaxLength } from 'class-validator';
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
  @IsString() @IsOptional() assignedTo?: string;
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

export class AssignComplaintDto {
  @IsString() @IsNotEmpty() assignedTo!: string;
  @IsString() @IsOptional() actorId?: string;
}

export class AddCommentDto {
  @IsString() message!: string;
  @IsIn(['public','internal']) visibility!: 'public'|'internal';
  @IsString() @IsOptional() actorId?: string;
}

export class AddProgressDto {
  @IsString() @IsNotEmpty() @MaxLength(1000)
  description!: string;

  @IsArray() @IsOptional()
  photos?: string[];
}

// Society head advisory review (Option A): flag + pinned note
export class HeadReviewDto {
  @IsBoolean() @IsOptional() flagged?: boolean;
  @IsString() @IsOptional() @MaxLength(240) reason?: string;
  @IsString() @IsOptional() @MaxLength(1000) pinnedNote?: string;
}