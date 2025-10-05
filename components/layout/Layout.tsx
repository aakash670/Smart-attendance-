import React, { ReactNode, useState, useEffect } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { UserRole, Notification } from '../../types';
import { HomeIcon, LogoutIcon, NotificationIcon, CameraIcon } from '../ui/Icons';
import { NavLink } from 'react-router-dom';
import { firestoreService } from '../../services/firebaseService';

const NavItem: React.FC<{ to: string, icon: ReactNode, label: string }> = ({ to, icon, label }) => (
    <NavLink end to={to} className={({ isActive }) => `flex items-center px-4 py-2.5 text-sm font-medium rounded-lg transition-colors ${isActive ? 'bg-blue-600 text-white' : 'text-gray-300 hover:bg-gray-700 hover:text-white'}`}>
        {icon}
        <span className="ml-4">{label}</span>
    </NavLink>
);

const Sidebar: React.FC = () => {
    const { user } = useAuth();

    const renderNavLinks = () => {
        switch (user?.role) {
            case UserRole.ADMIN:
                return (
                    <NavItem to="/dashboard" icon={<HomeIcon className="h-5 w-5"/>} label="Dashboard" />
                );
            case UserRole.TEACHER:
                return (
                    <NavItem to="/dashboard" icon={<HomeIcon className="h-5 w-5"/>} label="Dashboard" />
                );
            case UserRole.STUDENT:
            case UserRole.PARENT:
                 return (
                    <NavItem to="/dashboard" icon={<HomeIcon className="h-5 w-5"/>} label="Dashboard" />
                );
            default:
                return null;
        }
    };
    
    return (
        <aside className="w-64 flex-shrink-0 bg-gray-800 text-white flex flex-col">
            <div className="h-16 flex items-center justify-center text-2xl font-bold border-b border-gray-700">
                School Sync
            </div>
            <nav className="flex-1 px-4 py-6 space-y-2">
                {renderNavLinks()}
            </nav>
        </aside>
    );
};


const Header: React.FC = () => {
    const { user, logout } = useAuth();
    const [notifications, setNotifications] = useState<Notification[]>([]);
    const [showNotifications, setShowNotifications] = useState(false);

    useEffect(() => {
        if(user) {
            firestoreService.getNotificationsForUser(user.uid).then(setNotifications);
        }
    }, [user]);

    const unreadCount = notifications.filter(n => !n.isRead).length;

    return (
        <header className="bg-white dark:bg-gray-800 shadow-sm h-16 flex-shrink-0">
            <div className="flex items-center justify-end h-full px-6">
                <div className="relative">
                     <button onClick={() => setShowNotifications(prev => !prev)} className="relative text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 mr-4">
                        <NotificationIcon className="h-6 w-6" />
                        {unreadCount > 0 && (
                             <span className="absolute top-0 right-0 flex h-3 w-3">
                                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-red-400 opacity-75"></span>
                                <span className="relative inline-flex items-center justify-center rounded-full h-3 w-3 bg-red-500 text-white text-xs" style={{ fontSize: '0.6rem' }}>{unreadCount}</span>
                            </span>
                        )}
                    </button>
                    {showNotifications && (
                        <div className="absolute right-0 mt-2 w-80 bg-white dark:bg-gray-700 rounded-lg shadow-lg overflow-hidden z-20 border dark:border-gray-600">
                           <div className="p-3 font-semibold text-sm text-gray-800 dark:text-gray-100 border-b dark:border-gray-600">Notifications</div>
                           <ul className="divide-y dark:divide-gray-600 max-h-80 overflow-y-auto">
                            {notifications.length > 0 ? notifications.map(n => (
                                <li key={n.id} className={`p-3 text-sm ${!n.isRead ? 'bg-blue-50 dark:bg-blue-900/20' : ''}`}>
                                    <p className="text-gray-700 dark:text-gray-200">{n.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                </li>
                            )) : <li className="p-4 text-center text-sm text-gray-500 dark:text-gray-400">No notifications</li>}
                           </ul>
                        </div>
                    )}
                </div>
                <div className="flex items-center">
                    <img src={user?.photoURL} alt="User" className="h-10 w-10 rounded-full" />
                    <div className="ml-3">
                        <p className="text-sm font-semibold text-gray-900 dark:text-white">{user?.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400 capitalize">{user?.role}</p>
                    </div>
                </div>
                <button onClick={logout} className="ml-6 text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                    <LogoutIcon className="h-6 w-6" />
                </button>
            </div>
        </header>
    );
};

interface LayoutProps {
    children: ReactNode;
}
const Layout: React.FC<LayoutProps> = ({ children }) => {
    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            <Sidebar />
            <div className="flex-1 flex flex-col overflow-hidden">
                <Header />
                <main className="flex-1 overflow-x-hidden overflow-y-auto bg-gray-100 dark:bg-gray-900 p-6">
                    {children}
                </main>
            </div>
        </div>
    );
};

export default Layout;