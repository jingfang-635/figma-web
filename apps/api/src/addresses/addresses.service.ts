import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateAddressDto } from './dto/create-address.dto';
import { UpdateAddressDto } from './dto/update-address.dto';

@Injectable()
export class AddressesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.address.findMany();
  }

  async findOne(id: number) {
    const item = await this.prisma.address.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Address #${id} not found`);
    return item;
  }

  create(dto: CreateAddressDto) {
    return this.prisma.address.create({ data: dto });
  }

  async update(id: number, dto: UpdateAddressDto) {
    await this.findOne(id);
    return this.prisma.address.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.address.delete({ where: { id } });
  }
}
