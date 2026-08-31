import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateScheduleDto } from './dto/create-schedule.dto';
import { UpdateScheduleDto } from './dto/update-schedule.dto';

@Injectable()
export class SchedulesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.schedule.findMany({ include: { doctor: true } });
  }

  async findOne(id: number) {
    const item = await this.prisma.schedule.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!item) throw new NotFoundException(`Schedule #${id} not found`);
    return item;
  }

  create(dto: CreateScheduleDto) {
    return this.prisma.schedule.create({
      data: dto,
      include: { doctor: true },
    });
  }

  async update(id: number, dto: UpdateScheduleDto) {
    await this.findOne(id);
    return this.prisma.schedule.update({
      where: { id },
      data: dto,
      include: { doctor: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.schedule.delete({ where: { id } });
  }
}
