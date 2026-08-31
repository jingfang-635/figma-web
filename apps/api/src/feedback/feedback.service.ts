import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { UpdateFeedbackDto } from './dto/update-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.feedback.findMany();
  }

  async findOne(id: number) {
    const item = await this.prisma.feedback.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`Feedback #${id} not found`);
    return item;
  }

  create(dto: CreateFeedbackDto) {
    return this.prisma.feedback.create({ data: dto });
  }

  async update(id: number, dto: UpdateFeedbackDto) {
    await this.findOne(id);
    return this.prisma.feedback.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.feedback.delete({ where: { id } });
  }
}
