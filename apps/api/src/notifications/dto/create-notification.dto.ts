import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  title: string;

  @IsString()
  content: string;

  @IsString()
  type: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetUser?: string;
  @IsOptional()
  @IsString()
  triggerScene?: string;
}

export class UpdateNotificationDto {
  @IsOptional()
  @IsString()
  title?: string;

  @IsOptional()
  @IsString()
  content?: string;

  @IsOptional()
  @IsString()
  type?: string;

  @IsOptional()
  @IsString()
  status?: string;

  @IsOptional()
  @IsString()
  targetUser?: string;
  @IsOptional()
  @IsString()
  triggerScene?: string;
}
