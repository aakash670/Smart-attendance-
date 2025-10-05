import React, { useState, useEffect } from 'react';
import { useAuth } from '../hooks/useAuth';
import { authService } from '../services/firebaseService';
import { User } from '../types';
import { Spinner } from '../components/ui';

const Login: React.FC = () => {
  const { login } = useAuth();
  const [mockUsers, setMockUsers] = useState<User[]>([]);
  const [loadingUsers, setLoadingUsers] = useState(true);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const users = await authService.getMockUsers();
        setMockUsers(users);
      } catch (error) {
        console.error("Failed to fetch mock users", error);
      } finally {
        setLoadingUsers(false);
      }
    };
    fetchUsers();
  }, []);

  return (
    <div className="flex items-center justify-center min-h-screen bg-gray-100 dark:bg-gray-900">
      <div className="w-full max-w-md p-8 space-y-8 bg-white dark:bg-gray-800 rounded-2xl shadow-lg text-center">
        <div>
          <h1 className="text-4xl font-bold text-gray-900 dark:text-white">School Sync</h1>
          <p className="mt-2 text-gray-600 dark:text-gray-300">Smart Attendance Management</p>
        </div>
        <div className="mt-8">
            <h2 className="text-lg font-semibold text-gray-700 dark:text-gray-200 mb-4">Select a profile to sign in</h2>
            {loadingUsers ? <Spinner /> : (
              <div className="space-y-3">
                {mockUsers.map(user => (
                  <button
                    key={user.uid}
                    onClick={() => login(user.email)}
                    className="w-full flex items-center p-3 text-left bg-gray-50 dark:bg-gray-700 hover:bg-gray-100 dark:hover:bg-gray-600 rounded-lg transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <img src={user.photoURL} alt={user.name} className="w-12 h-12 rounded-full" />
                    <div className="ml-4">
                      <p className="font-semibold text-gray-900 dark:text-white">{user.name}</p>
                      <p className="text-sm text-gray-500 dark:text-gray-400 capitalize">{user.role}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
        </div>
      </div>
    </div>
  );
};

export default Login;