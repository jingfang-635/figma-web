import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateReviewDto } from './dto/create-review.dto';
import { UpdateReviewDto } from './dto/update-review.dto';

@Injectable()
export class ReviewsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.review.findMany({ include: { doctor: true } });
  }

  async findOne(id: number) {
    const item = await this.prisma.review.findUnique({
      where: { id },
      include: { doctor: true },
    });
    if (!item) throw new NotFoundException(`Review #${id} not found`);
    return item;
  }

  create(dto: CreateReviewDto) {
    return this.prisma.review.create({
      data: dto,
      include: { doctor: true },
    });
  }

  async update(id: number, dto: UpdateReviewDto) {
    await this.findOne(id);
    return this.prisma.review.update({
      where: { id },
      data: dto,
      include: { doctor: true },
    });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.review.delete({ where: { id } });
  }
}
