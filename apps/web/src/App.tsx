import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import { AuthProvider } from './auth/AuthContext';
import { Layout } from './components/chrome/Layout';
import { ProtectedRoute, PublicRoute } from './components/ProtectedRoute';
import { DashboardPage } from './pages/DashboardPage';
import { DepartmentsPage } from './pages/DepartmentsPage';
import { LoginPage } from './pages/LoginPage';
import { OrganizationPage } from './pages/OrganizationPage';
import { DoctorsPage } from './pages/DoctorsPage';
import { SchedulePage } from './pages/SchedulePage';
import {
  AddressesPage,
  AnnouncementsPage,
  AppointmentRulesPage,
  AppointmentsPage,
  BannersPage,
  FeedbacksPage,
  NavItemsPage,
  NewsCategoriesPage,
  NewsPage,
  NotificationsPage,
  OperationLogsPage,
  OrdersPage,
  PatientsPage,
  ReviewsPage,
  RolesPage,
  UsersPage,
} from './pages/ListPages';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route element={<PublicRoute />}>
            <Route path="/login" element={<LoginPage />} />
          </Route>
          <Route element={<ProtectedRoute />}>
            <Route element={<Layout />}>
              <Route index element={<DashboardPage />} />
              <Route path="organization" element={<OrganizationPage />} />
              <Route path="departments" element={<DepartmentsPage />} />
              <Route path="doctors" element={<DoctorsPage />} />
              <Route path="schedules" element={<SchedulePage />} />
              <Route path="appointments" element={<AppointmentsPage />} />
              <Route path="patients" element={<PatientsPage />} />
              <Route path="orders" element={<OrdersPage />} />
              <Route path="reviews" element={<ReviewsPage />} />
              <Route path="notifications" element={<NotificationsPage />} />
              <Route path="addresses" element={<AddressesPage />} />
              <Route path="banners" element={<BannersPage />} />
              <Route path="announcements" element={<AnnouncementsPage />} />
              <Route path="news" element={<NewsPage />} />
              <Route path="news-categories" element={<NewsCategoriesPage />} />
              <Route path="nav-items" element={<NavItemsPage />} />
              <Route path="feedbacks" element={<FeedbacksPage />} />
              <Route path="users" element={<UsersPage />} />
              <Route path="roles" element={<RolesPage />} />
              <Route path="appointment-rules" element={<AppointmentRulesPage />} />
              <Route path="operation-logs" element={<OperationLogsPage />} />
            </Route>
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
