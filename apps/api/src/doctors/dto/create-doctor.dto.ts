import { IsInt, IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateDoctorDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsInt()
  departmentId: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  avatar?: string;
  @IsOptional()
  @IsNumber()
  fee?: number;
  @IsOptional()
  @IsInt()
  experienceYears?: number;
  @IsOptional()
  @IsInt()
  goodRate?: number;
}

export class UpdateDoctorDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsInt()
  departmentId?: number;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  specialty?: string;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  avatar?: string;
  @IsOptional()
  @IsNumber()
  fee?: number;
  @IsOptional()
  @IsInt()
  experienceYears?: number;
  @IsOptional()
  @IsInt()
  goodRate?: number;
}
