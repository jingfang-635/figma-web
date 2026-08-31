import { IsOptional, IsString } from 'class-validator';

export class CreateOperationLogDto {
  @IsString()
  userName: string;

  @IsString()
  action: string;

  @IsString()
  module: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  ip?: string;
}

export class UpdateOperationLogDto {
  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  action?: string;

  @IsOptional()
  @IsString()
  module?: string;

  @IsOptional()
  @IsString()
  detail?: string;

  @IsOptional()
  @IsString()
  ip?: string;
}
