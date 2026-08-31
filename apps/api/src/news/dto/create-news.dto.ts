import { IsInt, IsOptional, IsString } from 'class-validator';

export class CreateNewsDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsInt()
  categoryId: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishAt?: string;
  @IsOptional()
  @IsString()
  smallImage?: string;
  @IsOptional()
  @IsString()
  largeImage?: string;
  @IsOptional()
  @IsString()
  type?: string;
}

export class UpdateNewsDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsInt()
  categoryId?: number;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishAt?: string;
  @IsOptional()
  @IsString()
  smallImage?: string;
  @IsOptional()
  @IsString()
  largeImage?: string;
  @IsOptional()
  @IsString()
  type?: string;
}
