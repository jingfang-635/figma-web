import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNavItemDto } from './dto/create-nav-item.dto';
import { UpdateNavItemDto } from './dto/update-nav-item.dto';

@Injectable()
export class NavItemsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.navItem.findMany({
      orderBy: { sortOrder: 'asc' },
      include: { children: true },
    });
  }

  async findOne(id: number) {
    const item = await this.prisma.navItem.findUnique({
      where: { id },
      include: { children: true, parent: true },
    });
    if (!item) throw new NotFoundException(`NavItem #${id} not found`);
    return item;
  }

  create(dto: CreateNavItemDto) {
    return this.prisma.navItem.create({
      data: dto,
      include: { children: true },
    });
  }

  async update(id: number, dto: UpdateNavItemDto) {
    await this.findOne(id);
    return this.prisma.navItem.update({
      where: { id },
      data: dto,
      include: { children: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.navItem.delete({ where: { id } });
  }
}
