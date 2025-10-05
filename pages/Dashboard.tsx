
import React from 'react';
import { useAuth } from '../hooks/useAuth';
import { UserRole } from '../types';
import AdminDashboard from './admin/AdminDashboard';
import TeacherDashboard from './teacher/TeacherDashboard';
import SharedDashboard from './user/SharedDashboard';
import { Spinner } from '../components/ui/index';

const Dashboard: React.FC = () => {
  const { user, loading } = useAuth();

  if (loading) {
    return <Spinner />;
  }

  switch (user?.role) {
    case UserRole.ADMIN:
      return <AdminDashboard />;
    case UserRole.TEACHER:
      return <TeacherDashboard />;
    case UserRole.STUDENT:
    case UserRole.PARENT:
      return <SharedDashboard />;
    default:
      // Or a 'pending approval' page
      return <div>No role assigned. Please contact an administrator.</div>;
  }
};

export default Dashboard;
