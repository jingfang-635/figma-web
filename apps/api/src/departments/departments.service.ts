import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDepartmentDto } from './dto/create-department.dto';
import { UpdateDepartmentDto } from './dto/update-department.dto';

@Injectable()
export class DepartmentsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.department.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { _count: { select: { doctors: true } } },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.department.findUnique({
      where: { id },
      include: { _count: { select: { doctors: true } } },
    });
    if (!item) throw new NotFoundException(`Department #${id} not found`);
    return item;
  }

  create(dto: CreateDepartmentDto) {
    return this.prisma.department.create({
      data: dto,
      include: { _count: { select: { doctors: true } } },
    });
  }

  async update(id: number, dto: UpdateDepartmentDto) {
    await this.findOne(id);
    return this.prisma.department.update({
      where: { id },
      data: dto,
      include: { _count: { select: { doctors: true } } },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.department.delete({ where: { id } });
  }
}
