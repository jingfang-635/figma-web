import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNewsCategoryDto } from './dto/create-news-category.dto';
import { UpdateNewsCategoryDto } from './dto/update-news-category.dto';

@Injectable()
export class NewsCategoriesService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.newsCategory.findMany({ orderBy: { sortOrder: 'asc' } });
  }

  async findOne(id: number) {
    const item = await this.prisma.newsCategory.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`NewsCategory #${id} not found`);
    return item;
  }

  create(dto: CreateNewsCategoryDto) {
    return this.prisma.newsCategory.create({ data: dto });
  }

  async update(id: number, dto: UpdateNewsCategoryDto) {
    await this.findOne(id);
    return this.prisma.newsCategory.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.newsCategory.delete({ where: { id } });
  }
}
