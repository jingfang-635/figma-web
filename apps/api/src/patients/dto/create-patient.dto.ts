import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreatePatientDto {
  @IsString()
  name: string;

  @IsString()
  phone: string;

  @IsOptional()
  @IsString()
  idCard?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @IsString()
  tags?: string;
  @IsOptional()
  @IsString()
  status?: string;
}

export class UpdatePatientDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsString()
  phone?: string;

  @IsOptional()
  @IsString()
  idCard?: string;

  @IsOptional()
  @IsString()
  gender?: string;

  @IsOptional()
  @IsInt()
  age?: number;

  @IsOptional()
  @IsString()
  address?: string;
  @IsOptional()
  @IsString()
  tags?: string;
  @IsOptional()
  @IsString()
  status?: string;
}
