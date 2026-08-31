import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreatePatientDto } from './dto/create-patient.dto';
import { UpdatePatientDto } from './dto/update-patient.dto';

@Injectable()
export class PatientsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.patient.findMany();
  }

  async findOne(id: number) {
    const item = await this.prisma.patient.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Patient #${id} not found`);
    return item;
  }

  create(dto: CreatePatientDto) {
    return this.prisma.patient.create({ data: dto });
  }

  async update(id: number, dto: UpdatePatientDto) {
    await this.findOne(id);
    return this.prisma.patient.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.patient.delete({ where: { id } });
  }
}
