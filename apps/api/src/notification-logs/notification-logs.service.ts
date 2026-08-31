import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateNotificationLogDto } from './dto/create-notification-log.dto';
import { UpdateNotificationLogDto } from './dto/update-notification-log.dto';

@Injectable()
export class NotificationLogsService {
  constructor(private prisma: PrismaService) {}

  findAll() {
    return this.prisma.notificationLog.findMany({ orderBy: { sentAt: 'desc' } });
  }

  async findOne(id: number) {
    const item = await this.prisma.notificationLog.findUnique({ where: { id } });
    if (!item) throw new NotFoundException('发送记录不存在');
    return item;
  }

  create(dto: CreateNotificationLogDto) {
    return this.prisma.notificationLog.create({ data: dto });
  }

  async update(id: number, dto: UpdateNotificationLogDto) {
    await this.findOne(id);
    return this.prisma.notificationLog.update({ where: { id }, data: dto });
  }

  async remove(id: number) {
    await this.findOne(id);
    return this.prisma.notificationLog.delete({ where: { id } });
  }
}
