import { IsInt, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateAppointmentDto {
  @IsString()
  patientName: string;

  @IsString()
  patientPhone: string;

  @IsInt()
  doctorId: number;

  @IsInt()
  scheduleId: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsString()
  appointmentDate: string;
  @IsOptional()
  @IsString()
  appointmentNo?: string;
  @IsOptional()
  @IsNumber()
  amount?: number;
}

export class UpdateAppointmentDto {
  @IsOptional()
  @IsString()
  patientName?: string;

  @IsOptional()
  @IsString()
  patientPhone?: string;

  @IsOptional()
  @IsInt()
  doctorId?: number;

  @IsOptional()
  @IsInt()
  scheduleId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  appointmentDate?: string;
  @IsOptional()
  @IsString()
  appointmentNo?: string;
  @IsOptional()
  @IsNumber()
  amount?: number;
}
