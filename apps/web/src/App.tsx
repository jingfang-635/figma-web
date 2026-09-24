import { Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './auth/AuthContext';
import Layout from './components/chrome/Layout';
import LoginPage from './pages/LoginPage';
import HomePage from './pages/HomePage';
import OrganizationPage from './pages/OrganizationPage';
import DepartmentsPage from './pages/DepartmentsPage';
import SchedulePage from './pages/SchedulePage';
import DoctorsPage from './pages/DoctorsPage';
import ResourceListPage from './templates/ResourceListPage';

function Protected({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Layout>{children}</Layout>;
}

export default function App() {
  return (
    <AuthProvider>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<Protected><HomePage /></Protected>} />
        <Route path="/organization" element={<Protected><OrganizationPage /></Protected>} />
        <Route path="/departments" element={<Protected><DepartmentsPage /></Protected>} />
        <Route path="/schedules" element={<Protected><SchedulePage /></Protected>} />
        <Route path="/doctors" element={<Protected><DoctorsPage /></Protected>} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </AuthProvider>
  );
}

export { ResourceListPage };