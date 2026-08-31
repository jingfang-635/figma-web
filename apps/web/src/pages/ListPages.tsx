import { getScreenByRoute } from '../generated/screenConfigs';
import { ResourceListPage } from '../templates/ResourceListPage';

function ScreenList({ route }: { route: string }) {
  const config = getScreenByRoute(route);
  if (!config) return <div>未找到页面配置：{route}</div>;
  return <ResourceListPage config={config} />;
}

export function AppointmentsPage() {
  return <ScreenList route="/appointments" />;
}
export function PatientsPage() {
  return <ScreenList route="/patients" />;
}
export function OrdersPage() {
  return <ScreenList route="/orders" />;
}
export function ReviewsPage() {
  return <ScreenList route="/reviews" />;
}
export function NotificationsPage() {
  return <ScreenList route="/notifications" />;
}
export function AddressesPage() {
  return <ScreenList route="/addresses" />;
}
export function BannersPage() {
  return <ScreenList route="/banners" />;
}
export function AnnouncementsPage() {
  return <ScreenList route="/announcements" />;
}
export function NewsPage() {
  return <ScreenList route="/news" />;
}
export function NewsCategoriesPage() {
  return <ScreenList route="/news-categories" />;
}
export function NavItemsPage() {
  return <ScreenList route="/nav-items" />;
}
export function FeedbacksPage() {
  return <ScreenList route="/feedbacks" />;
}
export function UsersPage() {
  return <ScreenList route="/users" />;
}
export function RolesPage() {
  return <ScreenList route="/roles" />;
}
export function AppointmentRulesPage() {
  return <ScreenList route="/appointment-rules" />;
}
export function OperationLogsPage() {
  return <ScreenList route="/operation-logs" />;
}
