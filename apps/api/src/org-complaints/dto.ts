import { IsString, IsOptional, IsEnum } from 'class-validator';

export class CreateOrgComplaintDto {
  @IsString()
  complaintId: string;

  @IsString()
  orgId: string;

  @IsOptional()
  @IsString()
  complaintCategory?: string;

  @IsOptional()
  @IsString()
  complaintDescription?: string;

  @IsOptional()
  @IsString()
  reporterName?: string;

  @IsOptional()
  @IsString()
  reporterSociety?: string;

  @IsOptional()
  location?: { lat: number; lng: number };
}

export class AssignComplaintDto {
  @IsString()
  assignedToUserId: string;

  @IsString()
  assignedToUserName: string;
}

export class RejectComplaintDto {
  @IsString()
  rejectionReason: string;
}

export class UpdateOrgComplaintStatusDto {
  @IsEnum(['pending', 'assigned', 'rejected', 'resolved'])
  status: 'pending' | 'assigned' | 'rejected' | 'resolved';

  @IsOptional()
  @IsString()
  note?: string;
}
