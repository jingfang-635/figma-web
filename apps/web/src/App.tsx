import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Layout from './components/chrome/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import OrganizationPage from './pages/OrganizationPage';
import DepartmentsPage from './pages/DepartmentsPage';
import SchedulePage from './pages/SchedulePage';
import ResourceListPage from './templates/ResourceListPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginPage />} />
          <Route path="/" element={<Protected><HomePage /></Protected>} />
          <Route path="/organization" element={<Protected><OrganizationPage /></Protected>} />
          <Route path="/departments" element={<Protected><DepartmentsPage /></Protected>} />
          <Route path="/schedules" element={<Protected><SchedulePage /></Protected>} />
          {/* 其余 list 屏走模板 */}
          <Route path="/doctors" element={<Protected><ResourceListPage resource="doctors" /></Protected>} />
          <Route path="/appointments" element={<Protected><ResourceListPage resource="appointments" /></Protected>} />
          <Route path="/patients" element={<Protected><ResourceListPage resource="patients" /></Protected>} />
          <Route path="/orders" element={<Protected><ResourceListPage resource="orders" /></Protected>} />
          <Route path="/notifications" element={<Protected><ResourceListPage resource="notifications" /></Protected>} />
          <Route path="/addresses" element={<Protected><ResourceListPage resource="addresses" /></Protected>} />
          <Route path="/banners" element={<Protected><ResourceListPage resource="banners" /></Protected>} />
          <Route path="/announcements" element={<Protected><ResourceListPage resource="announcements" /></Protected>} />
          <Route path="/news" element={<Protected><ResourceListPage resource="news" /></Protected>} />
          <Route path="/news-categories" element={<Protected><ResourceListPage resource="newsCategories" /></Protected>} />
          <Route path="/nav-items" element={<Protected><ResourceListPage resource="navItems" /></Protected>} />
          <Route path="/feedbacks" element={<Protected><ResourceListPage resource="feedbacks" /></Protected>} />
          <Route path="/users" element={<Protected><ResourceListPage resource="users" /></Protected>} />
          <Route path="/roles" element={<Protected><ResourceListPage resource="roles" /></Protected>} />
          <Route path="/appointment-rules" element={<Protected><ResourceListPage resource="appointmentRules" /></Protected>} />
          <Route path="/operation-logs" element={<Protected><ResourceListPage resource="operationLogs" /></Protected>} />
          <Route path="/reviews" element={<Protected><ResourceListPage resource="reviews" /></Protected>} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}