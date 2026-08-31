import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNavItemDto {
  @IsString()
  label: string;

  @IsString()
  path: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;
  @IsOptional()
  @IsString()
  icon?: string;
  @IsOptional()
  @IsString()
  params?: string;
}

export class UpdateNavItemDto {
  @IsOptional()
  @IsString()
  label?: string;

  @IsOptional()
  @IsString()
  path?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsInt()
  parentId?: number;
  @IsOptional()
  @IsString()
  icon?: string;
  @IsOptional()
  @IsString()
  params?: string;
}
