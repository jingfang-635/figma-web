import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { fetchDashboardStats, type DashboardStats } from '../../api/client';
import { isVisualGate } from '../../visual/gate';

const empty: DashboardStats = {
  users: 0,
  patients: 0,
  doctors: 0,
  departments: 0,
  appointments: 0,
  pendingAppointments: 0,
  todayAppointments: 0,
  orders: 0,
  reviews: 0,
  unreadNotifications: 0,
  pendingFeedback: 0,
  totalPatients: 0,
  todayNew: 0,
  monthAppointments: 0,
  blacklist: 0,
  todayOrders: 0,
  todayIncome: 0,
  pendingRefunds: 0,
  monthIncome: 0,
};

/** 闸门冻结：对齐 Figma 首页/科室 KPI 与侧栏预约角标 */
const GATE_STATS: DashboardStats = {
  ...empty,
  departments: 6,
  doctors: 6,
  pendingAppointments: 3,
  todayAppointments: 0,
  appointments: 106,
  orders: 0,
};

const StatsContext = createContext<DashboardStats>(empty);

export function StatsProvider({ children }: { children: ReactNode }) {
  const [stats, setStats] = useState<DashboardStats>(isVisualGate() ? GATE_STATS : empty);

  useEffect(() => {
    if (isVisualGate()) return;
    let cancelled = false;
    fetchDashboardStats()
      .then((data) => {
        if (!cancelled) setStats(data);
      })
      .catch(() => {
        if (!cancelled) setStats(empty);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  return <StatsContext.Provider value={stats}>{children}</StatsContext.Provider>;
}

export function useStats(): DashboardStats {
  return useContext(StatsContext);
}
