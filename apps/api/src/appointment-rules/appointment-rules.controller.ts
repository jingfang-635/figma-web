import { Controller, Get, Post, Patch, Delete, Body, Param, ParseIntPipe } from '@nestjs/common';
import { AppointmentRulesService } from './appointment-rules.service';
import { CreateAppointmentRuleDto } from './dto/create-appointment-rule.dto';
import { UpdateAppointmentRuleDto } from './dto/update-appointment-rule.dto';

@Controller('appointment-rules')
export class AppointmentRulesController {
  constructor(private readonly service: AppointmentRulesService) {}

  @Get()
  findAll() {
    return this.service.findAll();
  }

  @Get(':id')
  findOne(@Param('id', ParseIntPipe) id: number) {
    return this.service.findOne(id);
  }

  @Post()
  create(@Body() dto: CreateAppointmentRuleDto) {
    return this.service.create(dto);
  }

  @Patch(':id')
  update(@Param('id', ParseIntPipe) id: number, @Body() dto: UpdateAppointmentRuleDto) {
    return this.service.update(id, dto);
  }

  @Delete(':id')
  remove(@Param('id', ParseIntPipe) id: number) {
    return this.service.remove(id);
  }
}
