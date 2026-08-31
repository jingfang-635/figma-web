import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrderDto } from './dto/create-order.dto';
import { UpdateOrderDto } from './dto/update-order.dto';

@Injectable()
export class OrdersService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.order.findMany({ include: { patient: true } });
  }

  async findOne(id: number) {
    const item = await this.prisma.order.findUnique({
      where: { id },
      include: { patient: true },
    });
    if (!item) throw new NotFoundException(`Order #${id} not found`);
    return item;
  }

  create(dto: CreateOrderDto) {
    return this.prisma.order.create({
      data: dto,
      include: { patient: true },
    });
  }

  async update(id: number, dto: UpdateOrderDto) {
    await this.findOne(id);
    return this.prisma.order.update({
      where: { id },
      data: dto,
      include: { patient: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.order.delete({ where: { id } });
  }
}
