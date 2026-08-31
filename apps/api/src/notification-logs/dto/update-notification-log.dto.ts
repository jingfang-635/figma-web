import { IsOptional, IsString } from 'class-validator';

export class UpdateNotificationLogDto {
  @IsOptional()
  @IsString()
  receiver?: string;

  @IsOptional()
  @IsString()
  template?: string;

  @IsOptional()
  @IsString()
  contentSummary?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
