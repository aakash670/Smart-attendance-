import React, { ReactNode } from 'react';
import { HashRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Layout from './components/layout/Layout';
import { Spinner } from './components/ui/index';
import { UserRole } from './types';

const ProtectedRoute: React.FC<{ allowedRoles?: UserRole[] }> = ({ allowedRoles }) => {
    const { user, loading } = useAuth();

    if (loading) {
        return (
            <div className="flex h-screen items-center justify-center">
                <Spinner />
            </div>
        );
    }

    if (!user) {
        return <Navigate to="/login" replace />;
    }
    
    if (allowedRoles && !allowedRoles.includes(user.role)) {
        return <Navigate to="/dashboard" replace />; // Or an unauthorized page
    }

    return (
        <Layout>
            <Outlet />
        </Layout>
    );
};

const AppRoutes: React.FC = () => {
    const { user, loading } = useAuth();
    
    if (loading) {
        return (
             <div className="flex h-screen items-center justify-center">
                <Spinner />
            </div>
        );
    }
    
    return(
        <Routes>
            <Route path="/login" element={user ? <Navigate to="/dashboard" /> : <Login />} />
            
            <Route element={<ProtectedRoute />}>
                 <Route path="/dashboard" element={<Dashboard />} />
                 <Route path="/" element={<Navigate to="/dashboard" />} />
            </Route>
            
            <Route path="*" element={<Navigate to="/dashboard" />} />
        </Routes>
    );
}

const App: React.FC = () => {
  return (
    <AuthProvider>
        <HashRouter>
            <AppRoutes />
        </HashRouter>
    </AuthProvider>
  );
};

export default App;
