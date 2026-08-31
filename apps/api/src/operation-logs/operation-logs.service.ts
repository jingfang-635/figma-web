import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOperationLogDto } from './dto/create-operation-log.dto';
import { UpdateOperationLogDto } from './dto/update-operation-log.dto';

@Injectable()
export class OperationLogsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.operationLog.findMany({ orderBy: { createdAt: 'desc' } });
  }

  async findOne(id: number) {
    const item = await this.prisma.operationLog.findUnique({ where: { id } });
    if (!item) throw new NotFoundException(`OperationLog #${id} not found`);
    return item;
  }

  create(dto: CreateOperationLogDto) {
    return this.prisma.operationLog.create({ data: dto });
  }

  async update(id: number, dto: UpdateOperationLogDto) {
    await this.findOne(id);
    return this.prisma.operationLog.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.operationLog.delete({ where: { id } });
  }
}
