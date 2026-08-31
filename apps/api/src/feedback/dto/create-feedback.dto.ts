import { IsOptional, IsString } from 'class-validator';

export class CreateFeedbackDto {
  @IsString()
  userName: string;

  @IsString()
  content: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reply?: string;
  @IsOptional()
  @IsString()
  images?: string;
}

export class UpdateFeedbackDto {
  @IsOptional()
  @IsString()
  userName?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  contact?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  reply?: string;
  @IsOptional()
  @IsString()
  images?: string;
}
