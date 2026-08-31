import { IsOptional, IsString } from 'class-validator';

export class CreateNotificationLogDto {
  @IsString()
  receiver: string;

  @IsString()
  template: string;

  @IsOptional()
  @IsString()
  contentSummary?: string;

  @IsOptional()
  @IsString()
  status?: string;
}
