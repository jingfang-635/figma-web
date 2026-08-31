import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNewsCategoryDto {
  @IsString()
  name: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  image?: string;
}

export class UpdateNewsCategoryDto {
  @IsOptional()
  @IsString()
  name?: string;

  @IsOptional()
  @IsInt()
  sortOrder?: number;

  @IsOptional()
  @IsString()
  status?: string;
  @IsOptional()
  @IsString()
  image?: string;
}
