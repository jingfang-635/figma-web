import { Module } from '@nestjs/common';
import { AppointmentRulesService } from './appointment-rules.service';
import { AppointmentRulesController } from './appointment-rules.controller';

@Module({
  controllers: [AppointmentRulesController],
  providers: [AppointmentRulesService],
})
export class AppointmentRulesModule {}
