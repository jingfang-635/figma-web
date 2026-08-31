import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAppointmentDto } from './dto/create-appointment.dto';
import { UpdateAppointmentDto } from './dto/update-appointment.dto';

const includeDoctorDept = {
  doctor: { include: { department: true } },
  schedule: true,
} as const;

function withTimeSlot<T extends { schedule?: { startTime: string; endTime: string } | null }>(item: T) {
  const start = item.schedule?.startTime;
  const end = item.schedule?.endTime;
  return {
    ...item,
    timeSlot: start && end ? `${start}-${end}` : null,
  };
}

@Injectable()
export class AppointmentsService {
  constructor(private prisma: PrismaService) {}

  async findAll() {
    const items = await this.prisma.appointment.findMany({ include: includeDoctorDept });
    return items.map(withTimeSlot);
  }

  async findOne(id: number) {
    const item = await this.prisma.appointment.findUnique({
      where: { id },
      include: includeDoctorDept,
    });
    if (!item) throw new NotFoundException(`Appointment #${id} not found`);
    return withTimeSlot(item);
  }

  async create(dto: CreateAppointmentDto) {
    const item = await this.prisma.appointment.create({
      data: dto,
      include: includeDoctorDept,
    });
    return withTimeSlot(item);
  }

  async update(id: number, dto: UpdateAppointmentDto) {
    await this.findOne(id);
    const item = await this.prisma.appointment.update({
      where: { id },
      data: dto,
      include: includeDoctorDept,
    });
    return withTimeSlot(item);
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.appointment.delete({ where: { id } });
  }
}
