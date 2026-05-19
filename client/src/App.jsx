import { Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import Layout from './components/Layout';
import { useAuth } from './contexts/AuthContext';

import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import ResetPassword from './pages/ResetPassword';

import Pathway from './pages/disciple/Pathway';
import ClassView from './pages/disciple/ClassView';
import TestView from './pages/disciple/TestView';
import Milestones from './pages/disciple/Milestones';
import Certificates from './pages/disciple/Certificates';
import Help from './pages/disciple/Help';

import Dashboard from './pages/admin/Dashboard';
import SeriesList from './pages/admin/SeriesList';
import SeriesForm from './pages/admin/SeriesForm';
import ClassList from './pages/admin/ClassList';
import ClassForm from './pages/admin/ClassForm';
import TestEditor from './pages/admin/TestEditor';
import Reports from './pages/admin/Reports';
import AdminCertificates from './pages/admin/AdminCertificates';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" />;
  return <Navigate to={user.role === 'admin' ? '/admin/dashboard' : '/disciple/pathway'} />;
}

export default function App() {
  return (
    <Routes>
      <Route path="/" element={<HomeRedirect />} />
      <Route path="/login" element={<Login />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/reset-password" element={<ResetPassword />} />

      <Route path="/disciple" element={<ProtectedRoute role="disciple"><Layout><Outlet /></Layout></ProtectedRoute>}>
        <Route index element={<Navigate to="pathway" />} />
        <Route path="pathway" element={<Pathway />} />
        <Route path="class/:classId" element={<ClassView />} />
        <Route path="test/:classId" element={<TestView />} />
        <Route path="milestones" element={<Milestones />} />
        <Route path="certificates" element={<Certificates />} />
        <Route path="help" element={<Help />} />
      </Route>

      <Route path="/admin" element={<ProtectedRoute role="admin"><Layout><Outlet /></Layout></ProtectedRoute>}>
        <Route index element={<Navigate to="dashboard" />} />
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="series" element={<SeriesList />} />
        <Route path="series/new" element={<SeriesForm />} />
        <Route path="series/:seriesId/edit" element={<SeriesForm />} />
        <Route path="series/:seriesId/classes" element={<ClassList />} />
        <Route path="series/:seriesId/classes/new" element={<ClassForm />} />
        <Route path="series/:seriesId/classes/:classId/edit" element={<ClassForm />} />
        <Route path="tests/:classId" element={<TestEditor />} />
        <Route path="reports" element={<Reports />} />
        <Route path="certificates" element={<AdminCertificates />} />
      </Route>

      <Route path="*" element={<div className="flex items-center justify-center min-h-screen"><div className="text-center"><h1 className="text-4xl font-bold text-gray-400">404</h1><p className="text-gray-500 mt-2">Page not found</p></div></div>} />
    </Routes>
  );
}
