import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentRuleDto } from './dto/create-appointment-rule.dto';
import { UpdateAppointmentRuleDto } from './dto/update-appointment-rule.dto';

@Injectable()
export class AppointmentRulesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.appointmentRule.findMany();
  }

  async findOne(id: number) {
    const item = await this.prisma.appointmentRule.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`AppointmentRule #${id} not found`);
    return item;
  }

  create(dto: CreateAppointmentRuleDto) {
    return this.prisma.appointmentRule.create({ data: dto });
  }

  async update(id: number, dto: UpdateAppointmentRuleDto) {
    await this.findOne(id);
    return this.prisma.appointmentRule.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.appointmentRule.delete({ where: { id } });
  }
}
