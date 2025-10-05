import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebaseService';
import { Student, AttendanceRecord, Notification, UserRole } from '../../types';
import { Card, Spinner } from '../../components/ui/index';
import { CalendarIcon, NotificationIcon } from '../../components/ui/Icons';

// A simple calendar component
const AttendanceCalendar: React.FC<{ records: AttendanceRecord[]; onMonthChange: (month: number, year: number) => void }> = ({ records, onMonthChange }) => {
    const [date, setDate] = useState(new Date());
    
    const changeMonth = (offset: number) => {
        const newDate = new Date(date.setMonth(date.getMonth() + offset));
        setDate(newDate);
        onMonthChange(newDate.getMonth(), newDate.getFullYear());
    }

    const getDaysInMonth = (year: number, month: number) => new Date(year, month + 1, 0).getDate();
    const getFirstDayOfMonth = (year: number, month: number) => new Date(year, month, 1).getDay();

    const renderCalendar = () => {
        const year = date.getFullYear();
        const month = date.getMonth();
        const daysInMonth = getDaysInMonth(year, month);
        const firstDay = getFirstDayOfMonth(year, month);

        const days = [];
        for (let i = 0; i < firstDay; i++) {
            days.push(<div key={`empty-${i}`} className="w-10 h-10 border dark:border-gray-700"></div>);
        }

        for (let day = 1; day <= daysInMonth; day++) {
            const currentDateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const record = records.find(r => r.date === currentDateStr);
            let bgColor = 'bg-gray-50 dark:bg-gray-700/50';
            if (record?.status === 'Present') bgColor = 'bg-green-200 dark:bg-green-800/30';
            if (record?.status === 'Absent') bgColor = 'bg-red-200 dark:bg-red-800/30';
            if (record?.status === 'Late') bgColor = 'bg-yellow-200 dark:bg-yellow-800/30';
            
            days.push(
                <div key={day} className={`w-10 h-10 flex items-center justify-center border dark:border-gray-700 ${bgColor} rounded`}>
                    {day}
                </div>
            );
        }
        return days;
    };

    return (
        <Card>
            <div className="flex justify-between items-center mb-4">
                <button onClick={() => changeMonth(-1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&lt;</button>
                <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-100">{date.toLocaleString('default', { month: 'long', year: 'numeric' })}</h3>
                <button onClick={() => changeMonth(1)} className="p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700">&gt;</button>
            </div>
            <div className="grid grid-cols-7 gap-1 text-center text-xs text-gray-500 dark:text-gray-400 mb-2">
                <div>Sun</div><div>Mon</div><div>Tue</div><div>Wed</div><div>Thu</div><div>Fri</div><div>Sat</div>
            </div>
            <div className="grid grid-cols-7 gap-1 text-gray-800 dark:text-gray-200">{renderCalendar()}</div>
        </Card>
    );
};


const SharedDashboard: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [studentData, setStudentData] = useState<Student[]>([]);
    const [attendanceRecords, setAttendanceRecords] = useState<AttendanceRecord[]>([]);
    const [notifications, setNotifications] = useState<Notification[]>([]);

    const fetchAttendance = useCallback(async (studentId: string, month: number, year: number) => {
        try {
            const records = await firestoreService.getAttendanceForStudent(studentId, month, year);
            setAttendanceRecords(records);
        } catch (error) {
            console.error("Failed to fetch attendance:", error);
        }
    }, []);

    useEffect(() => {
        const fetchData = async () => {
            if (!user) return;
            setIsLoading(true);
            try {
                let studentsToFetch: Student[] = [];
                // Refactored to handle both students and parents with a single, robust logic
                if (user.linkedStudentIds && user.linkedStudentIds.length > 0) {
                    studentsToFetch = await firestoreService.getStudentsByIds(user.linkedStudentIds);
                }

                setStudentData(studentsToFetch);

                if (studentsToFetch.length > 0) {
                    // For simplicity, fetch for the first student/child
                    const today = new Date();
                    await fetchAttendance(studentsToFetch[0].id, today.getMonth(), today.getFullYear());
                }

                const userNotifications = await firestoreService.getNotificationsForUser(user.uid);
                setNotifications(userNotifications);
                
            } catch (error) {
                console.error("Failed to fetch data:", error);
            } finally {
                setIsLoading(false);
            }
        };

        fetchData();
    }, [user, fetchAttendance]);

    const handleMonthChange = (month: number, year: number) => {
        if (studentData.length > 0) {
            fetchAttendance(studentData[0].id, month, year);
        }
    };


    if (isLoading) return <Spinner />;

    const getGreeting = () => {
        if (user?.role === UserRole.PARENT) {
            return `Viewing dashboard for ${studentData.map(s => s.name).join(', ')}`;
        }
        return `Welcome back, ${user?.name}!`;
    };

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">{getGreeting()}</p>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
                        <CalendarIcon className="w-6 h-6 mr-2" />
                        Attendance Calendar
                    </h2>
                    <AttendanceCalendar records={attendanceRecords} onMonthChange={handleMonthChange}/>
                </div>
                <div>
                    <h2 className="text-xl font-semibold mb-4 text-gray-800 dark:text-gray-200 flex items-center">
                        <NotificationIcon className="w-6 h-6 mr-2" />
                        Notifications
                    </h2>
                    <Card>
                        {notifications.length > 0 ? (
                        <ul className="divide-y dark:divide-gray-700 max-h-96 overflow-y-auto">
                            {notifications.map(n => (
                                <li key={n.id} className={`py-3 ${!n.isRead ? 'font-semibold' : 'opacity-70'}`}>
                                    <p className="text-sm text-gray-800 dark:text-gray-200">{n.message}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">{new Date(n.timestamp).toLocaleString()}</p>
                                </li>
                            ))}
                        </ul>
                        ) : <p className="text-sm text-gray-500 dark:text-gray-400">No new notifications.</p>}
                    </Card>
                </div>
            </div>
        </div>
    );
};

export default SharedDashboard;