import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDoctorDto } from './dto/create-doctor.dto';
import { UpdateDoctorDto } from './dto/update-doctor.dto';

@Injectable()
export class DoctorsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.doctor.findMany({ include: { department: true } });
  }

  async findOne(id: number) {
    const item = await this.prisma.doctor.findUnique({
      where: { id },
      include: { department: true },
    });
    if (!item) throw new NotFoundException(`Doctor #${id} not found`);
    return item;
  }

  create(dto: CreateDoctorDto) {
    return this.prisma.doctor.create({
      data: dto,
      include: { department: true },
    });
  }

  async update(id: number, dto: UpdateDoctorDto) {
    await this.findOne(id);
    return this.prisma.doctor.update({
      where: { id },
      data: dto,
      include: { department: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.doctor.delete({ where: { id } });
  }
}
