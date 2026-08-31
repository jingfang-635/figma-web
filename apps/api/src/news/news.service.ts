import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsDto } from './dto/create-news.dto';
import { UpdateNewsDto } from './dto/update-news.dto';

@Injectable()
export class NewsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.news.findMany({ include: { category: true } });
  }

  async findOne(id: number) {
    const item = await this.prisma.news.findUnique({
      where: { id },
      include: { category: true },
    });
    if (!item) throw new NotFoundException(`News #${id} not found`);
    return item;
  }

  create(dto: CreateNewsDto) {
    return this.prisma.news.create({
      data: {
        ...dto,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
      },
      include: { category: true },
    });
  }

  async update(id: number, dto: UpdateNewsDto) {
    await this.findOne(id);
    return this.prisma.news.update({
      where: { id },
      data: {
        ...dto,
        publishAt: dto.publishAt ? new Date(dto.publishAt) : undefined,
      },
      include: { category: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.news.delete({ where: { id } });
  }
}
