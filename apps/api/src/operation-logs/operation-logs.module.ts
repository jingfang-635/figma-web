import { Module } from '@nestjs/common';
import { OperationLogsService } from './operation-logs.service';
import { OperationLogsController } from './operation-logs.controller';

@Module({
  controllers: [OperationLogsController],
  providers: [OperationLogsService],
})
export class OperationLogsModule {}
