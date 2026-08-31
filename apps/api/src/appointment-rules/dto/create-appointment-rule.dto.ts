import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateAppointmentRuleDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  advanceDays?: number;

  @IsOptional()
  @IsInt()
  cancelHours?: number;

  @IsOptional()
  @IsInt()
  maxPerDay?: number;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  deadline?: string;
  @IsOptional()
  @IsString()
  cancelRule?: string;
  @IsOptional()
  @IsInt()
  noShowLimit?: number;
}

export class UpdateAppointmentRuleDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  advanceDays?: number;

  @IsOptional()
  @IsInt()
  cancelHours?: number;

  @IsOptional()
  @IsInt()
  maxPerDay?: number;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  deadline?: string;
  @IsOptional()
  @IsString()
  cancelRule?: string;
  @IsOptional()
  @IsInt()
  noShowLimit?: number;
}
