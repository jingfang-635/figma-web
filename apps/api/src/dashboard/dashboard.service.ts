import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

@Injectable()
export class DashboardService {
  constructor(private prisma: PrismaService) {}

  async getStats() {
    const [
      users,
      patients,
      doctors,
      departments,
      appointments,
      orders,
      reviews,
      notifications,
      feedback,
    ] = await Promise.all([
      this.prisma.user.count(),
      this.prisma.patient.count(),
      this.prisma.doctor.count(),
      this.prisma.department.count(),
      this.prisma.appointment.count(),
      this.prisma.order.count(),
      this.prisma.review.count(),
      this.prisma.notification.count({ where: { status: 'unread' } }),
      this.prisma.feedback.count({ where: { status: 'pending' } }),
    ]);

    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const todayStr = [
      now.getFullYear(),
      String(now.getMonth() + 1).padStart(2, '0'),
      String(now.getDate()).padStart(2, '0'),
    ].join('-');
    const monthPrefix = todayStr.slice(0, 7);

    const [
      pendingAppointments,
      todayAppointments,
      todayNew,
      blacklist,
      monthAppointments,
      todayOrders,
      pendingRefunds,
      todayIncomeAgg,
      monthIncomeAgg,
    ] = await Promise.all([
      this.prisma.appointment.count({ where: { status: 'pending' } }),
      this.prisma.appointment.count({ where: { appointmentDate: todayStr } }),
      this.prisma.patient.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.patient.count({ where: { status: 'blacklisted' } }),
      this.prisma.appointment.count({
        where: { appointmentDate: { startsWith: monthPrefix } },
      }),
      this.prisma.order.count({ where: { createdAt: { gte: todayStart } } }),
      this.prisma.order.count({
        where: { status: { in: ['pending_refund', 'refund_pending'] } },
      }),
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: { status: 'paid', paidAt: { gte: todayStart } },
      }),
      this.prisma.order.aggregate({
        _sum: { amount: true },
        where: {
          status: { in: ['paid', 'refunded'] },
          paidAt: { gte: monthStart },
        },
      }),
    ]);

    return {
      users,
      patients,
      doctors,
      departments,
      appointments,
      pendingAppointments,
      todayAppointments,
      orders,
      reviews,
      unreadNotifications: notifications,
      pendingFeedback: feedback,
      totalPatients: patients,
      todayNew,
      monthAppointments,
      blacklist,
      todayOrders,
      todayIncome: todayIncomeAgg._sum.amount ?? 0,
      pendingRefunds,
      monthIncome: monthIncomeAgg._sum.amount ?? 0,
    };
  }
}
