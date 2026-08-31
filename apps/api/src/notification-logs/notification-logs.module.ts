import { Module } from '@nestjs/common';
import { NotificationLogsService } from './notification-logs.service';
import { NotificationLogsController } from './notification-logs.controller';

@Module({
  controllers: [NotificationLogsController],
  providers: [NotificationLogsService],
})
export class NotificationLogsModule {}
