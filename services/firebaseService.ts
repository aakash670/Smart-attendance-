
import { User, UserRole, Student, Class, AttendanceRecord, Notification, Announcement } from '../types';

// =================================================================
// LOCALSTORAGE DATABASE - Simulates a persistent database
// =================================================================

interface AppDatabase {
    users: User[];
    classes: Class[];
    students: Student[];
    attendance: AttendanceRecord[];
    notifications: Notification[];
    announcements: Announcement[];
}

const initializeDb = (): AppDatabase => {
    const MOCK_USERS: User[] = [
      { uid: 'admin01', name: 'School Admin', email: 'admin.school@gmail.com', role: UserRole.ADMIN, photoURL: 'https://picsum.photos/seed/admin/100' },
      { uid: 'teacher01', name: 'Mr. Rajesh Sharma', email: 'teacher1.school@gmail.com', role: UserRole.TEACHER, photoURL: 'https://picsum.photos/seed/teacher1/100', assignedClassIds: ['class01'] },
      { uid: 'teacher02', name: 'Ms. Priya Singh', email: 'teacher2.school@gmail.com', role: UserRole.TEACHER, photoURL: 'https://picsum.photos/seed/teacher2/100', assignedClassIds: ['class02'] },
      { uid: 'student01', name: 'Rohan Kumar', email: 'student1.school@gmail.com', role: UserRole.STUDENT, photoURL: 'https://picsum.photos/seed/student1/100', linkedStudentIds: ['student01'] },
      { uid: 'student02', name: 'Ananya Verma', email: 'student2.school@gmail.com', role: UserRole.STUDENT, photoURL: 'https://picsum.photos/seed/student2/100', linkedStudentIds: ['student02'] },
      { uid: 'parent01', name: 'Mr. Kumar', email: 'parent1.school@gmail.com', role: UserRole.PARENT, photoURL: 'https://picsum.photos/seed/parent1/100', linkedStudentIds: ['student01'] },
      { uid: 'parent02', name: 'Mrs. Verma', email: 'parent2.school@gmail.com', role: UserRole.PARENT, photoURL: 'https://picsum.photos/seed/parent2/100', linkedStudentIds: ['student02'] },
    ];
    
    let MOCK_CLASSES: Class[] = [
      { id: 'class01', name: 'Grade 5 - Section A', teacherId: 'teacher01' },
      { id: 'class02', name: 'Grade 8 - Section B', teacherId: 'teacher02' },
    ];
    
    let MOCK_STUDENTS: Student[] = [
      { id: 'student01', name: 'Rohan Kumar', rollNumber: '5A-01', classId: 'class01', photoURL: 'https://picsum.photos/seed/student1/200', parentId: 'parent01', notes: 'Active participant in class.' },
      { id: 'student03', name: 'Priya Patel', rollNumber: '5A-02', classId: 'class01', photoURL: 'https://picsum.photos/seed/student3/200', parentId: 'parent03' },
      { id: 'student04', name: 'Amit Singh', rollNumber: '5A-03', classId: 'class01', photoURL: 'https://picsum.photos/seed/student4/200', parentId: 'parent04' },
      { id: 'student02', name: 'Ananya Verma', rollNumber: '8B-01', classId: 'class02', photoURL: 'https://picsum.photos/seed/student2/200', parentId: 'parent02', notes: 'Excellent in mathematics.' },
      { id: 'student05', name: 'Vikram Reddy', rollNumber: '8B-02', classId: 'class02', photoURL: 'https://picsum.photos/seed/student5/200', parentId: 'parent05' },
    ];
    
    let MOCK_ATTENDANCE: AttendanceRecord[] = [];
    const today = new Date();
    for (let i = 0; i < 60; i++) {
        const date = new Date(today);
        date.setDate(today.getDate() - i);
        const dateString = date.toISOString().split('T')[0];
        MOCK_STUDENTS.forEach(student => {
            if (date.getDay() === 0 || date.getDay() === 6) return;
            const status = Math.random() < 0.1 ? 'Absent' : 'Present';
            MOCK_ATTENDANCE.push({
                id: `${student.id}-${dateString}`, studentId: student.id, classId: student.classId,
                date: dateString, status, timestamp: date,
            });
        });
    }

    let MOCK_NOTIFICATIONS: Notification[] = [
        { id: 'notif01', userId: 'parent01', message: 'Rohan Kumar was marked absent today.', type: 'absence', timestamp: new Date(), isRead: false},
        { id: 'notif02', userId: 'parent02', message: 'Parent-Teacher meeting is scheduled for next Friday.', type: 'event', timestamp: new Date(Date.now() - 86400000), isRead: true},
    ];

    let MOCK_ANNOUNCEMENTS: Announcement[] = [
        {id: 'anno01', message: 'The school will be closed tomorrow due to heavy rain.', audience: 'All', timestamp: new Date(Date.now() - 86400000 * 2), sentBy: 'School Admin'}
    ];

    return {
        users: MOCK_USERS,
        classes: MOCK_CLASSES,
        students: MOCK_STUDENTS,
        attendance: MOCK_ATTENDANCE,
        notifications: MOCK_NOTIFICATIONS,
        announcements: MOCK_ANNOUNCEMENTS
    };
}

const DB_KEY = 'schoolSyncDb';

const getDb = (): AppDatabase => {
    const dbJson = localStorage.getItem(DB_KEY);
    if (dbJson) {
        const parsed = JSON.parse(dbJson);
        // Dates need to be re-hydrated
        parsed.attendance.forEach((a: AttendanceRecord) => a.timestamp = new Date(a.timestamp));
        parsed.notifications.forEach((n: Notification) => n.timestamp = new Date(n.timestamp));
        parsed.announcements.forEach((a: Announcement) => a.timestamp = new Date(a.timestamp));
        return parsed;
    }
    const newDb = initializeDb();
    localStorage.setItem(DB_KEY, JSON.stringify(newDb));
    return newDb;
}

const saveDb = (db: AppDatabase) => {
    localStorage.setItem(DB_KEY, JSON.stringify(db));
}

const simulateDelay = <T,>(data: T): Promise<T> => {
    return new Promise(resolve => setTimeout(() => {
        if (typeof data === 'undefined') {
            return resolve(data);
        }
        resolve(JSON.parse(JSON.stringify(data)));
    }, 300));
}

// --- Auth Service ---

export const authService = {
  getMockUsers: async (): Promise<User[]> => {
    const db = getDb();
    return simulateDelay(db.users);
  },
  
  signInWithGoogle: async (email: string): Promise<User> => {
    const db = getDb();
    const user = db.users.find(u => u.email === email);
    if (user) {
        localStorage.setItem('authUser', JSON.stringify(user));
        return simulateDelay(user);
    }
    throw new Error("User not found in mock database.");
  },

  signOut: async (): Promise<void> => {
    localStorage.removeItem('authUser');
    return simulateDelay(undefined);
  },
  
  onAuthStateChanged: (callback: (user: User | null) => void): (() => void) => {
    const user = localStorage.getItem('authUser');
    callback(user ? JSON.parse(user) : null);
    return () => {};
  }
};

// --- Firestore Service ---

export const firestoreService = {
    getStudentsByClass: async (classId: string): Promise<Student[]> => {
        const db = getDb();
        return simulateDelay(db.students.filter(s => s.classId === classId));
    },

    getAttendanceForStudent: async (studentId: string, month: number, year: number): Promise<AttendanceRecord[]> => {
        const db = getDb();
        const records = db.attendance.filter(a => {
            const recordDate = new Date(a.date);
            return a.studentId === studentId && recordDate.getMonth() === month && recordDate.getFullYear() === year;
        });
        return simulateDelay(records);
    },

    getAttendanceForClassByDate: async (classId: string, date: string): Promise<AttendanceRecord[]> => {
        const db = getDb();
        const records = db.attendance.filter(a => a.classId === classId && a.date === date);
        return simulateDelay(records);
    },
    
    getAttendanceForClassByDateRange: async (classId: string, startDate: Date, endDate: Date): Promise<AttendanceRecord[]> => {
        const db = getDb();
        const records = db.attendance.filter(a => {
            const recordDate = new Date(a.date);
            return a.classId === classId && recordDate >= startDate && recordDate <= endDate;
        });
        return simulateDelay(records);
    },

    markAttendance: async (studentId: string, classId: string, status: 'Present' | 'Absent' | 'Late'): Promise<AttendanceRecord> => {
        const db = getDb();
        const date = new Date();
        const dateString = date.toISOString().split('T')[0];
        const newRecord: AttendanceRecord = {
            id: `${studentId}-${dateString}-${Date.now()}`,
            studentId, classId, date: dateString, status, timestamp: date
        };

        db.attendance = db.attendance.filter(a => !(a.studentId === studentId && a.date === dateString));
        db.attendance.push(newRecord);
        saveDb(db);
        return simulateDelay(newRecord);
    },
    
    getNotificationsForUser: async (userId: string): Promise<Notification[]> => {
        const db = getDb();
        const notifications = db.notifications.filter(n => n.userId === userId).sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return simulateDelay(notifications);
    },
    
    getAllUsers: async (): Promise<User[]> => simulateDelay(getDb().users),
    getAllStudents: async (): Promise<Student[]> => simulateDelay(getDb().students),
    getAllClasses: async (): Promise<Class[]> => {
        const db = getDb();
        const classesWithTeachers = db.classes.map(c => {
            const teacher = db.users.find(u => u.uid === c.teacherId);
            return { ...c, teacherName: teacher?.name || 'Unassigned' };
        });
        return simulateDelay(classesWithTeachers);
    },

    addStudent: async (studentData: Omit<Student, 'id'>): Promise<Student> => {
        const db = getDb();
        const newStudent: Student = {
            id: `student${Date.now()}`,
            ...studentData,
            photoURL: studentData.photoURL || `https://picsum.photos/seed/new${Date.now()}/200`,
        };
        db.students.push(newStudent);
        saveDb(db);
        return simulateDelay(newStudent);
    },

    updateStudent: async (studentId: string, updates: Partial<Omit<Student, 'id'>>): Promise<Student> => {
        const db = getDb();
        const studentIndex = db.students.findIndex(s => s.id === studentId);
        if (studentIndex === -1) throw new Error("Student not found");
        
        db.students[studentIndex] = { ...db.students[studentIndex], ...updates };
        saveDb(db);
        return simulateDelay(db.students[studentIndex]);
    },

    addClass: async (classData: Omit<Class, 'id'>): Promise<Class> => {
        const db = getDb();
        const newClass: Class = { id: `class${Date.now()}`, ...classData };
        db.classes.push(newClass);
        saveDb(db);

        const teacher = db.users.find(u => u.uid === newClass.teacherId);
        return simulateDelay({...newClass, teacherName: teacher?.name});
    },

    getAnnouncements: async (): Promise<Announcement[]> => {
        const db = getDb();
        return simulateDelay(db.announcements.sort((a,b) => b.timestamp.getTime() - a.timestamp.getTime()));
    },

    sendBroadcastNotification: async (message: string, audience: UserRole | 'All', adminName: string): Promise<Announcement> => {
        const db = getDb();
        const newAnnouncement: Announcement = {
            id: `anno${Date.now()}`, message, audience, timestamp: new Date(), sentBy: adminName,
        };
        db.announcements.push(newAnnouncement);

        const targetUsers = db.users.filter(user => {
            if (audience === 'All') return user.role !== UserRole.ADMIN;
            return user.role === audience;
        });

        targetUsers.forEach(user => {
            db.notifications.push({
                id: `notif${Date.now()}-${user.uid}`, userId: user.uid, message,
                type: 'general', timestamp: new Date(), isRead: false,
            });
        });
        saveDb(db);
        return simulateDelay(newAnnouncement);
    },

    sendAbsenceNotifications: async (classId: string): Promise<number> => {
        const db = getDb();
        const todayString = new Date().toISOString().split('T')[0];
        const classStudents = db.students.filter(s => s.classId === classId);
        const todaysAttendance = db.attendance.filter(a => a.classId === classId && a.date === todayString);
        const presentStudentIds = new Set(todaysAttendance.map(a => a.studentId));
        
        const absentStudents = classStudents.filter(s => !presentStudentIds.has(s.id));
        
        absentStudents.forEach(student => {
            if (student.parentId) {
                const parent = db.users.find(u => u.uid === student.parentId);
                if (parent) {
                     db.notifications.push({
                        id: `notif-absence-${Date.now()}-${student.id}`, userId: parent.uid,
                        message: `${student.name} was marked absent from ${db.classes.find(c=>c.id === classId)?.name} today. Please contact the school.`,
                        type: 'absence', timestamp: new Date(), isRead: false,
                    });
                }
            }
        });
        saveDb(db);
        return simulateDelay(absentStudents.length);
    },
    
    getTeacherClasses: async (teacherId: string): Promise<Class[]> => {
        const db = getDb();
        const classes = db.classes.filter(c => c.teacherId === teacherId);
        return simulateDelay(classes);
    },

    getStudentById: async (studentId: string): Promise<Student | undefined> => {
        const db = getDb();
        const student = db.students.find(s => s.id === studentId);
        return simulateDelay(student);
    },

    getStudentsByIds: async (studentIds: string[]): Promise<Student[]> => {
        const db = getDb();
        return simulateDelay(db.students.filter(s => studentIds.includes(s.id)));
    }
};
