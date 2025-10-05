

import React, { useState, useEffect } from 'react';
import { Announcement, User, Student, Class, UserRole } from '../../types';
import { firestoreService } from '../../services/firebaseService';
import { Card, Spinner, Button, Modal } from '../../components/ui/index';
import { UsersIcon, ClassIcon, SendIcon, ReportIcon, DownloadIcon } from '../../components/ui/Icons';
import { useAuth } from '../../hooks/useAuth';

// Utility to export data to CSV
const exportToCSV = (data: any[], filename: string) => {
    if (data.length === 0) {
        alert("No data available to export.");
        return;
    }
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    if (link.href) {
        URL.revokeObjectURL(link.href);
    }
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};


const StatCard: React.FC<{ title: string; value: number; icon: React.ReactNode }> = ({ title, value, icon }) => (
    <Card>
        <div className="flex items-center">
            <div className="p-3 rounded-full bg-blue-100 dark:bg-blue-900/20 text-blue-500">
                {icon}
            </div>
            <div className="ml-4">
                <p className="text-lg font-medium text-gray-500 dark:text-gray-400">{title}</p>
                <p className="text-2xl font-bold text-gray-900 dark:text-white">{value}</p>
            </div>
        </div>
    </Card>
);

const TableWrapper: React.FC<{children: React.ReactNode}> = ({children}) => (
     <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
           {children}
        </table>
    </div>
);

const TableHeader: React.FC<{columns: string[]}> = ({columns}) => (
     <thead className="bg-gray-50 dark:bg-gray-700">
        <tr>
            {columns.map(col => <th key={col} scope="col" className="px-6 py-3 text-left text-xs font-medium text-gray-500 dark:text-gray-300 uppercase tracking-wider">{col}</th>)}
        </tr>
    </thead>
);

const TableBody: React.FC<{children: React.ReactNode}> = ({children}) => (
    <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
        {children}
    </tbody>
);


const UserTable: React.FC<{ users: User[] }> = ({ users }) => (
    <TableWrapper>
        <TableHeader columns={['Name', 'Email', 'Role']} />
        <TableBody>
            {users.map((user) => (
                <tr key={user.uid}>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                            <div className="flex-shrink-0 h-10 w-10">
                                <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="" />
                            </div>
                            <div className="ml-4">
                                <div className="text-sm font-medium text-gray-900 dark:text-white">{user.name}</div>
                            </div>
                        </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{user.email}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-300 capitalize">
                            {user.role}
                        </span>
                    </td>
                </tr>
            ))}
        </TableBody>
    </TableWrapper>
);

const StudentTable: React.FC<{ students: Student[], classes: Class[] }> = ({ students, classes }) => {
    const getClassName = (classId: string) => classes.find(c => c.id === classId)?.name || 'N/A';
    return (
         <TableWrapper>
            <TableHeader columns={['Name', 'Roll Number', 'Class']} />
            <TableBody>
                {students.map((student) => (
                    <tr key={student.id}>
                        <td className="px-6 py-4 whitespace-nowrap">
                             <div className="flex items-center">
                                <img className="h-10 w-10 rounded-full" src={student.photoURL} alt={student.name} />
                                <div className="ml-4 text-sm font-medium text-gray-900 dark:text-white">{student.name}</div>
                            </div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{student.rollNumber}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{getClassName(student.classId)}</td>
                    </tr>
                ))}
            </TableBody>
        </TableWrapper>
    );
};

const ClassTable: React.FC<{ classes: Class[], teachers: User[], students: Student[] }> = ({ classes, teachers, students }) => {
    const getStudentCount = (classId: string) => students.filter(s => s.classId === classId).length;
    return (
        <TableWrapper>
            <TableHeader columns={['Class Name', 'Assigned Teacher', 'Student Count']} />
            <TableBody>
                 {classes.map((c) => (
                    <tr key={c.id}>
                        <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">{c.name}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{c.teacherName}</td>
                        <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">{getStudentCount(c.id)}</td>
                    </tr>
                ))}
            </TableBody>
        </TableWrapper>
    );
};

const AnnouncementList: React.FC<{ announcements: Announcement[] }> = ({ announcements }) => (
    <Card>
        <ul className="divide-y divide-gray-200 dark:divide-gray-700 max-h-[60vh] overflow-y-auto">
            {announcements.map(item => (
                <li key={item.id} className="p-4">
                    <p className="text-sm text-gray-800 dark:text-gray-200">{item.message}</p>
                    <div className="flex justify-between items-center mt-2">
                        <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-blue-100 text-blue-800 dark:bg-blue-900/20 dark:text-blue-300 capitalize">
                            To: {item.audience}
                        </span>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            Sent by {item.sentBy} on {new Date(item.timestamp).toLocaleDateString()}
                        </p>
                    </div>
                </li>
            ))}
        </ul>
    </Card>
);

const ReportsTab: React.FC<{ classes: Class[], students: Student[] }> = ({ classes, students }) => {
    const [selectedClass, setSelectedClass] = useState<string>(classes[0]?.id || '');
    const [dateRange, setDateRange] = useState<string>('7');
    const [isGenerating, setIsGenerating] = useState(false);

    const handleGenerateReport = async () => {
        if (!selectedClass) {
            alert("Please select a class.");
            return;
        }
        setIsGenerating(true);
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - parseInt(dateRange));

            const attendanceData = await firestoreService.getAttendanceForClassByDateRange(selectedClass, startDate, endDate);
            
            const classStudents = students.filter(s => s.classId === selectedClass);

            const reportData = attendanceData.map(record => {
                const student = classStudents.find(s => s.id === record.studentId);
                return {
                    Date: record.date,
                    RollNumber: student?.rollNumber || 'N/A',
                    StudentName: student?.name || 'Unknown',
                    Status: record.status,
                };
            }).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            
            const className = classes.find(c => c.id === selectedClass)?.name || 'Class';
            exportToCSV(reportData, `Attendance_${className.replace(/\s/g, '_')}_${new Date().toISOString().split('T')[0]}.csv`);

        } catch (error) {
            console.error("Failed to generate report:", error);
            alert("An error occurred while generating the report.");
        } finally {
            setIsGenerating(false);
        }
    };

    return (
        <Card>
            <div className="flex items-center space-x-4">
                <div>
                    <label htmlFor="class-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Class</label>
                    <select id="class-select" value={selectedClass} onChange={e => setSelectedClass(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">
                        {classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}
                    </select>
                </div>
                <div>
                    <label htmlFor="range-select" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Date Range</label>
                    <select id="range-select" value={dateRange} onChange={e => setDateRange(e.target.value)}
                        className="mt-1 block w-full pl-3 pr-10 py-2 text-base border-gray-300 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm rounded-md bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">
                        <option value="7">Last 7 Days</option>
                        <option value="30">Last 30 Days</option>
                    </select>
                </div>
                <div className="pt-6">
                    <Button onClick={handleGenerateReport} disabled={isGenerating} className="flex items-center">
                        <DownloadIcon className="h-5 w-5 mr-2" />
                        {isGenerating ? 'Generating...' : 'Generate & Export'}
                    </Button>
                </div>
            </div>
        </Card>
    );
};

const AdminDashboard: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [users, setUsers] = useState<User[]>([]);
    const [students, setStudents] = useState<Student[]>([]);
    const [classes, setClasses] = useState<Class[]>([]);
    const [announcements, setAnnouncements] = useState<Announcement[]>([]);
    const [activeTab, setActiveTab] = useState('overview');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [modalType, setModalType] = useState<'student' | 'class' | 'notification' | null>(null);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [allUsers, allStudents, allClasses, allAnnouncements] = await Promise.all([
                firestoreService.getAllUsers(),
                firestoreService.getAllStudents(),
                firestoreService.getAllClasses(),
                firestoreService.getAnnouncements(),
            ]);
            setUsers(allUsers);
            setStudents(allStudents);
            setClasses(allClasses);
            setAnnouncements(allAnnouncements);
        } catch (error) {
            console.error("Failed to fetch admin data:", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchData();
    }, []);

    const openModal = (type: 'student' | 'class' | 'notification') => {
        setModalType(type);
        setIsModalOpen(true);
    }
    
    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        // FIX: Provide a default photoURL to satisfy the Omit<Student, 'id'> type required by firestoreService.addStudent.
        const studentData: Omit<Student, 'id'> = {
            name: formData.get('name') as string,
            rollNumber: formData.get('rollNumber') as string,
            classId: formData.get('classId') as string,
            parentId: formData.get('parentId') as string,
            photoURL: `https://picsum.photos/seed/newstudent${Date.now()}/200`,
        };
        await firestoreService.addStudent(studentData);
        setIsModalOpen(false);
        fetchData(); // Refresh data
    }
    
    const handleAddClass = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        const classData = Object.fromEntries(formData.entries()) as {name: string, teacherId: string};
        await firestoreService.addClass(classData);
        setIsModalOpen(false);
        fetchData(); // Refresh data
    }

    const handleSendNotification = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if(!user) return;

        const formData = new FormData(e.currentTarget);
        const message = formData.get('message') as string;
        const audience = formData.get('audience') as UserRole | 'All';
        
        await firestoreService.sendBroadcastNotification(message, audience, user.name);
        setIsModalOpen(false);
        fetchData(); // Refresh data
    };

    const teachers = users.filter(u => u.role === UserRole.TEACHER);
    const parents = users.filter(u => u.role === UserRole.PARENT);
    
    const tabs = [
        { id: 'overview', label: 'Overview' },
        { id: 'teachers', label: 'Teachers' },
        { id: 'students', label: 'Students' },
        { id: 'parents', label: 'Parents' },
        { id: 'classes', label: 'Classes' },
        { id: 'notifications', label: 'Notifications' },
        { id: 'reports', label: 'Reports' },
    ];

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Admin Dashboard</h1>
            
            <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8" aria-label="Tabs">
                    {tabs.map(tab => (
                         <button key={tab.id} onClick={() => setActiveTab(tab.id)}
                            className={`${tab.id === activeTab ? 'border-blue-500 text-blue-600 dark:text-blue-400' : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300 dark:text-gray-400 dark:hover:text-gray-300'}
                                whitespace-nowrap py-4 px-1 border-b-2 font-medium text-sm`}>
                            {tab.label}
                        </button>
                    ))}
                </nav>
            </div>

            <div className="mt-6">
                {activeTab === 'overview' && (
                     <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                        <StatCard title="Total Students" value={students.length} icon={<UsersIcon className="h-6 w-6"/>} />
                        <StatCard title="Total Teachers" value={teachers.length} icon={<UsersIcon className="h-6 w-6"/>} />
                        <StatCard title="Total Parents" value={parents.length} icon={<UsersIcon className="h-6 w-6"/>} />
                        <StatCard title="Total Classes" value={classes.length} icon={<ClassIcon className="h-6 w-6"/>} />
                    </div>
                )}
                {activeTab === 'teachers' && <Card><UserTable users={teachers} /></Card>}
                {activeTab === 'students' && <Card><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold dark:text-white">All Students</h3><Button onClick={() => openModal('student')}>Add Student</Button></div><StudentTable students={students} classes={classes} /></Card>}
                {activeTab === 'parents' && <Card><UserTable users={parents} /></Card>}
                {activeTab === 'classes' && <Card><div className="flex justify-between items-center mb-4"><h3 className="text-lg font-semibold dark:text-white">All Classes</h3><Button onClick={() => openModal('class')}>Add Class</Button></div><ClassTable classes={classes} teachers={teachers} students={students} /></Card>}
                {activeTab === 'notifications' && (
                    <div>
                        <div className="flex justify-between items-center mb-4">
                            <h3 className="text-lg font-semibold dark:text-white">Sent Announcements</h3>
                            <Button onClick={() => openModal('notification')} className="flex items-center">
                                <SendIcon className="h-5 w-5 mr-2"/>
                                Create Announcement
                            </Button>
                        </div>
                        <AnnouncementList announcements={announcements} />
                    </div>
                )}
                {activeTab === 'reports' && <ReportsTab classes={classes} students={students} />}
            </div>
            
            <Modal isOpen={isModalOpen} onClose={() => setIsModalOpen(false)} title={
                 modalType === 'student' ? 'Add New Student' :
                 modalType === 'class' ? 'Add New Class' : 
                 modalType === 'notification' ? 'Send New Announcement' : ''
            }>
                {modalType === 'student' && (
                     <form onSubmit={handleAddStudent} className="space-y-4 text-gray-700 dark:text-gray-200">
                        <div><label>Full Name</label><input name="name" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label>Roll Number</label><input name="rollNumber" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label>Class</label><select name="classId" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">{classes.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div>
                        <div><label>Parent</label><select name="parentId" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">{parents.map(p => <option key={p.uid} value={p.uid}>{p.name}</option>)}</select></div>
                        <Button type="submit" className="w-full">Save Student</Button>
                    </form>
                )}
                {modalType === 'class' && (
                     <form onSubmit={handleAddClass} className="space-y-4 text-gray-700 dark:text-gray-200">
                        <div><label>Class Name</label><input name="name" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label>Assign Teacher</label><select name="teacherId" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">{teachers.map(t => <option key={t.uid} value={t.uid}>{t.name}</option>)}</select></div>
                        <Button type="submit" className="w-full">Save Class</Button>
                    </form>
                )}
                {modalType === 'notification' && (
                    <form onSubmit={handleSendNotification} className="space-y-4 text-gray-700 dark:text-gray-200">
                        <div>
                            <label>Message</label>
                            <textarea name="message" required rows={4} className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/>
                        </div>
                        <div>
                            <label>Audience</label>
                            <select name="audience" required defaultValue="All" className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600">
                                <option value="All">All Users</option>
                                <option value={UserRole.STUDENT}>All Students</option>
                                <option value={UserRole.PARENT}>All Parents</option>
                                <option value={UserRole.TEACHER}>All Teachers</option>
                            </select>
                        </div>
                        <Button type="submit" className="w-full flex justify-center items-center">
                            <SendIcon className="h-5 w-5 mr-2"/>
                            Send Now
                        </Button>
                    </form>
                )}
            </Modal>
        </div>
    );
};

export default AdminDashboard;