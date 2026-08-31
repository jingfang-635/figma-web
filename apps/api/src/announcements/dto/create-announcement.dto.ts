import { IsOptional, IsString } from 'class-validator';

export class CreateAnnouncementDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishAt?: string;
  @IsOptional()
  @IsString()
  publisher?: string;
}

export class UpdateAnnouncementDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  publishAt?: string;
  @IsOptional()
  @IsString()
  publisher?: string;
}
