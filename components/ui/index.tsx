
import React, { ReactNode } from 'react';

// Spinner
export const Spinner = () => (
  <div className="flex justify-center items-center h-full">
    <div className="animate-spin rounded-full h-16 w-16 border-t-2 border-b-2 border-blue-500"></div>
  </div>
);

// Button
interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  children: ReactNode;
  variant?: 'primary' | 'secondary' | 'danger';
}
export const Button: React.FC<ButtonProps> = ({ children, variant = 'primary', ...props }) => {
  const baseClasses = "px-4 py-2 rounded-md font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed";
  const variantClasses = {
    primary: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    secondary: 'bg-gray-500 hover:bg-gray-600 focus:ring-gray-400',
    danger: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
  };
  return (
    <button className={`${baseClasses} ${variantClasses[variant]}`} {...props}>
      {children}
    </button>
  );
};

// Card
interface CardProps {
  children: ReactNode;
  className?: string;
}
export const Card: React.FC<CardProps> = ({ children, className = '' }) => (
  <div className={`bg-white dark:bg-gray-800 shadow-md rounded-lg p-6 ${className}`}>
    {children}
  </div>
);

// Modal
interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  children: ReactNode;
}
export const Modal: React.FC<ModalProps> = ({ isOpen, onClose, title, children }) => {
  if (!isOpen) return null;
  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl w-full max-w-md m-4">
        <div className="flex justify-between items-center p-4 border-b dark:border-gray-700">
          <h3 className="text-xl font-semibold text-gray-900 dark:text-white">{title}</h3>
          <button onClick={onClose} className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            &times;
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
};
