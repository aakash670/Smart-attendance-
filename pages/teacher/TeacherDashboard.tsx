import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../../hooks/useAuth';
import { firestoreService } from '../../services/firebaseService';
import { Class, Student, AttendanceRecord, UserRole } from '../../types';
import { Card, Spinner, Button, Modal } from '../../components/ui/index';
import { CameraIcon, CheckCircleIcon, XCircleIcon, ClockIcon, DownloadIcon, EditIcon, SendIcon, PlusCircleIcon } from '../../components/ui/Icons';
import AttendanceChart from '../../components/shared/AttendanceChart';

declare const faceapi: any;

interface EnrichedClass extends Class {
    students: Student[];
    todaysAttendance: AttendanceRecord[];
}

const LiveAttendanceModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    classInfo: EnrichedClass;
    onAttendanceMarked: () => void;
}> = ({ isOpen, onClose, classInfo, onAttendanceMarked }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const [status, setStatus] = useState('Initializing...');
    const [faceMatcher, setFaceMatcher] = useState<any>(null);
    const [absentStudents, setAbsentStudents] = useState<Student[]>([]);
    const [presentStudents, setPresentStudents] = useState<Student[]>([]);
    const [modelsLoaded, setModelsLoaded] = useState(false);

    const loadModels = useCallback(async () => {
        // Use the standard and reliable jsdelivr CDN to prevent fetch errors
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
        try {
            setStatus('Loading AI models...');
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setStatus('AI Models loaded successfully.');
        } catch (error) {
            console.error("Failed to load face-api models", error);
            setStatus('Error: Could not load AI models. Please check your internet connection and refresh.');
        }
    }, []);

    const setupSession = useCallback(() => {
        if (modelsLoaded) {
             const enrolledStudents = classInfo.students.filter(s => s.faceDescriptor && s.faceDescriptor.length > 0);
             if(enrolledStudents.length === 0){
                 setStatus("Error: No students have enrolled faces in this class.");
                 return;
            }
            const labeledFaceDescriptors = enrolledStudents.map(s => 
                new faceapi.LabeledFaceDescriptors(s.id, [Float32Array.from(s.faceDescriptor!)])
            );
            setFaceMatcher(new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6));
            
            const presentIds = new Set(classInfo.todaysAttendance.map(a => a.studentId));
            setAbsentStudents(classInfo.students.filter(s => !presentIds.has(s.id)));
            setPresentStudents(classInfo.students.filter(s => presentIds.has(s.id)));
            setStatus('Ready to start camera.');
        }
    }, [modelsLoaded, classInfo]);
    
    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);

    const startCamera = useCallback(async () => {
        setStatus('Starting camera...');
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            setStatus("Error: Camera access is not supported."); return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setStatus('Ready to capture.');
            }
        } catch (err) {
            let message = "Error: Could not access the camera.";
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") message = "Error: Camera access was denied.";
                else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") message = "Error: No camera found.";
            }
            setStatus(message);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            loadModels();
        } else {
            stopCamera();
            setModelsLoaded(false);
        }
    }, [isOpen, loadModels, stopCamera]);

    useEffect(() => {
        if (isOpen && modelsLoaded) {
            setupSession();
        }
    }, [isOpen, modelsLoaded, setupSession]);
    
    useEffect(() => {
        if (isOpen && faceMatcher) {
            startCamera();
        }
    }, [isOpen, faceMatcher, startCamera]);


    const captureAndRecognize = async () => {
        if (!videoRef.current || !faceMatcher) return;
        setStatus('Processing...');

        const tempCanvas = document.createElement('canvas');
        tempCanvas.width = videoRef.current.videoWidth;
        tempCanvas.height = videoRef.current.videoHeight;
        const context = tempCanvas.getContext('2d');
        if(!context) return;

        context.drawImage(videoRef.current, 0, 0, tempCanvas.width, tempCanvas.height);
        
        const detection = await faceapi.detectSingleFace(tempCanvas, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptor();

        if (detection) {
            const bestMatch = faceMatcher.findBestMatch(detection.descriptor);
            const student = absentStudents.find(s => s.id === bestMatch.label);
            if (student) {
                setStatus(`Recognized: ${student.name}`);
                await firestoreService.markAttendance(student.id, student.classId, 'Present');
                setAbsentStudents(prev => prev.filter(s => s.id !== student.id));
                setPresentStudents(prev => [...prev, student]);
            } else {
                 const alreadyPresent = presentStudents.find(s => s.id === bestMatch.label);
                 if(alreadyPresent) setStatus(`${alreadyPresent.name} is already marked present.`);
                 else setStatus('No recognized student found in absent list.');
            }
        } else {
            setStatus('No face detected in capture. Please try again.');
        }
    };

    const handleClose = () => {
        onAttendanceMarked();
        onClose();
    }

    const isReadyForCapture = status === 'Ready to capture.';

    return (
        <div className={`fixed inset-0 bg-black bg-opacity-70 z-50 flex items-center justify-center p-4 ${!isOpen && 'hidden'}`}>
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl w-full max-w-6xl h-[90vh] flex flex-col p-6">
                <div className="flex justify-between items-center border-b pb-4 mb-4">
                     <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Live Attendance - {classInfo.name}</h2>
                     <button onClick={handleClose} className="text-gray-500 dark:text-gray-300 hover:text-gray-800 dark:hover:text-white font-bold text-2xl">&times;</button>
                </div>
                <div className="flex-1 flex gap-6 overflow-hidden">
                    {/* Student Lists */}
                    <div className="w-1/4 flex flex-col gap-4">
                        <StudentList title="Absent" students={absentStudents} icon={<XCircleIcon className="w-5 h-5 text-red-500" />} />
                        <StudentList title="Present" students={presentStudents} icon={<CheckCircleIcon className="w-5 h-5 text-green-500" />} />
                    </div>

                    {/* Camera View */}
                    <div className="flex-1 flex flex-col items-center justify-center bg-gray-100 dark:bg-gray-900 rounded-lg p-4">
                        <div className="relative w-full max-w-2xl aspect-video bg-black rounded-lg overflow-hidden mb-4">
                             <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover" />
                             {!videoRef.current?.srcObject && <div className="absolute inset-0 flex items-center justify-center text-white bg-black bg-opacity-50">{status}</div>}
                        </div>
                        <Button onClick={captureAndRecognize} disabled={!isReadyForCapture || absentStudents.length === 0}>
                            {absentStudents.length > 0 ? 'Capture & Recognize' : 'All Students Present!'}
                        </Button>
                        <p className="mt-2 text-sm text-gray-600 dark:text-gray-300 h-5">{status}</p>
                    </div>
                </div>
            </div>
        </div>
    );
};

const StudentList: React.FC<{title: string; students: Student[], icon: React.ReactNode}> = ({title, students, icon}) => (
    <Card className="flex-1 flex flex-col">
        <h3 className="text-lg font-semibold flex items-center gap-2 text-gray-800 dark:text-gray-200 mb-2">{icon} {title} ({students.length})</h3>
        <ul className="space-y-2 overflow-y-auto flex-1">
             {students.map(s => (
                <li key={s.id} className="flex items-center text-sm p-1.5 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <img src={s.photoURL} alt={s.name} className="w-8 h-8 rounded-full mr-2"/>
                    <span className="text-gray-700 dark:text-gray-300">{s.name}</span>
                </li>
            ))}
             {students.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm italic pt-2">No students in this list.</p>}
        </ul>
    </Card>
);

const FaceEnrollmentModal: React.FC<{
    isOpen: boolean;
    onClose: () => void;
    student: Student | null;
    onEnrollmentComplete: (studentId: string, descriptor: number[]) => void;
}> = ({ isOpen, onClose, student, onEnrollmentComplete }) => {
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const [status, setStatus] = useState('Initializing...');
    const [modelsLoaded, setModelsLoaded] = useState(false);
    const [descriptor, setDescriptor] = useState<number[] | null>(null);
    const [isFaceDetected, setIsFaceDetected] = useState(false);

    const loadModels = useCallback(async () => {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
        setStatus('Loading AI models...');
        try {
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setModelsLoaded(true);
            setStatus('Models loaded.');
        } catch (error) {
            console.error("Error loading models:", error);
            setStatus('Error: Could not load models. Please refresh.');
        }
    }, []);
    
    const startVideo = useCallback(async () => {
        if (!modelsLoaded) return;
        setStatus('Starting camera...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: {} });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
            }
        } catch (err) {
            setStatus('Error: Camera access denied.');
        }
    }, [modelsLoaded]);

    const stopVideo = useCallback(() => {
        if (videoRef.current?.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
    }, []);
    
    useEffect(() => {
        if (isOpen) {
            setDescriptor(null);
            setModelsLoaded(false);
            setIsFaceDetected(false);
            loadModels();
        } else {
            stopVideo();
        }
    }, [isOpen, loadModels, stopVideo]);
    
    useEffect(() => {
        if (isOpen && modelsLoaded) {
            startVideo();
        }
    }, [isOpen, modelsLoaded, startVideo]);
    
    const handleVideoPlay = () => {
        const intervalId = setInterval(async () => {
            if (videoRef.current && canvasRef.current && !videoRef.current.paused) {
                const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
                faceapi.matchDimensions(canvasRef.current, displaySize);
                const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions());
                const context = canvasRef.current.getContext('2d');
                context?.clearRect(0,0, canvasRef.current.width, canvasRef.current.height);
                if (detection) {
                    setIsFaceDetected(true);
                    setStatus('Face detected. Ready to capture.');
                    const resizedDetection = faceapi.resizeResults(detection, displaySize);
                    faceapi.draw.drawDetections(canvasRef.current, resizedDetection);
                } else {
                    setIsFaceDetected(false);
                    setStatus('Position face in the center.');
                }
            } else {
                clearInterval(intervalId);
            }
        }, 500);
        return () => clearInterval(intervalId);
    };

    const handleCapture = async () => {
        if (!videoRef.current || !isFaceDetected) {
            setStatus("No face detected. Please position face clearly.");
            return;
        };
        setStatus('Capturing... hold still.');
        const detection = await faceapi.detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (detection) {
            setStatus('Face captured successfully! You can now save.');
            setDescriptor(Array.from(detection.descriptor));
            stopVideo();
        } else {
            setStatus('Capture failed. Please try again.');
        }
    };
    
    const handleSave = () => {
        if(student && descriptor) onEnrollmentComplete(student.id, descriptor);
    }

    return (
        <Modal isOpen={isOpen} onClose={onClose} title={`Enroll Face for ${student?.name}`}>
            <div className="flex flex-col items-center">
                <div className="w-64 h-48 bg-gray-900 rounded-md overflow-hidden relative">
                    <video ref={videoRef} onPlay={handleVideoPlay} autoPlay playsInline muted className="w-full h-full object-cover" />
                    <canvas ref={canvasRef} className="absolute top-0 left-0" />
                </div>
                <p className={`mt-4 text-sm text-center h-10 ${status.startsWith('Error') ? 'text-red-500' : 'text-gray-600 dark:text-gray-300'}`}>{status}</p>
                 <div className="mt-4 flex w-full space-x-2">
                    {descriptor ? (
                         <Button onClick={handleSave} className="w-full">Save Enrolled Face</Button>
                    ) : (
                        <Button onClick={handleCapture} disabled={!modelsLoaded || !isFaceDetected} className="w-full">
                            Capture Face
                        </Button>
                    )}
                </div>
            </div>
        </Modal>
    );
};


const exportToCSV = (data: any[], filename: string) => {
    const headers = Object.keys(data[0]);
    const csvContent = [
        headers.join(','),
        ...data.map(row => headers.map(header => JSON.stringify(row[header])).join(','))
    ].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

const ClassCard: React.FC<{ classInfo: EnrichedClass; onLiveAttendanceStart: (classInfo: EnrichedClass) => void; onRefresh: () => void }> = ({ classInfo, onLiveAttendanceStart, onRefresh }) => {
    const [view, setView] = useState<'roster' | 'today'>('roster');
    const [isExporting, setIsExporting] = useState(false);
    const [isAlerting, setIsAlerting] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEnrollModalOpen, setIsEnrollModalOpen] = useState(false);
    const [editingStudent, setEditingStudent] = useState<Student | null>(null);
    const [photoPreview, setPhotoPreview] = useState<string | null>(null);

    const presentCount = classInfo.todaysAttendance.filter(a => a.status === 'Present').length;
    const absentCount = classInfo.students.length - presentCount;

    const getStudentStatus = (studentId: string) => classInfo.todaysAttendance.find(a => a.studentId === studentId)?.status || 'Absent';
    
    const handlePhotoChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            const reader = new FileReader();
            reader.onloadend = () => setPhotoPreview(reader.result as string);
            reader.readAsDataURL(file);
        }
    };
    
    const handleExport = async () => {
        setIsExporting(true);
        try {
            const endDate = new Date();
            const startDate = new Date();
            startDate.setDate(endDate.getDate() - 30);
            const attendanceData = await firestoreService.getAttendanceForClassByDateRange(classInfo.id, startDate, endDate);
            if (attendanceData.length === 0) {
                alert("No attendance data found for the last 30 days."); return;
            }
            const reportData = attendanceData.map(record => ({
                Date: record.date,
                RollNumber: classInfo.students.find(s => s.id === record.studentId)?.rollNumber || 'N/A',
                StudentName: classInfo.students.find(s => s.id === record.studentId)?.name || 'Unknown',
                Status: record.status,
            })).sort((a, b) => new Date(b.Date).getTime() - new Date(a.Date).getTime());
            exportToCSV(reportData, `Attendance_${classInfo.name.replace(/\s/g, '_')}.csv`);
        } finally {
            setIsExporting(false);
        }
    };

    const handleSendAlerts = async () => {
        setIsAlerting(true);
        try {
            const count = await firestoreService.sendAbsenceNotifications(classInfo.id);
            alert(`Sent ${count} absence notification(s).`);
        } finally {
            setIsAlerting(false);
        }
    };

    const openEditModal = (student: Student) => {
        setEditingStudent(student);
        setPhotoPreview(null);
        setIsEditModalOpen(true);
    };
    
    const openAddModal = () => {
        setPhotoPreview(null);
        setIsAddModalOpen(true);
    };

    const handleUpdateStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!editingStudent) return;
        const formData = new FormData(e.currentTarget);
        const updates: Partial<Omit<Student, 'id'>> = {
            name: formData.get('name') as string,
            rollNumber: formData.get('rollNumber') as string,
            notes: formData.get('notes') as string,
        };
        if(photoPreview) updates.photoURL = photoPreview;

        await firestoreService.updateStudent(editingStudent.id, updates);
        setIsEditModalOpen(false);
        onRefresh();
    }
    
    const handleAddStudent = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        if (!photoPreview) {
            alert("Please upload a photo for the new student."); return;
        }
        const newStudentData: Omit<Student, 'id'> = {
            name: formData.get('name') as string,
            rollNumber: formData.get('rollNumber') as string,
            classId: classInfo.id,
            photoURL: photoPreview,
        };
        await firestoreService.addStudent(newStudentData);
        setIsAddModalOpen(false);
        onRefresh();
    };

    const handleEnrollmentComplete = async (studentId: string, faceDescriptor: number[]) => {
        await firestoreService.updateStudent(studentId, { faceDescriptor });
        setIsEnrollModalOpen(false);
        onRefresh();
    };

    const StatusIcon: React.FC<{ status: string }> = ({ status }) => {
        switch (status) {
            case 'Present': return <CheckCircleIcon className="w-5 h-5 text-green-500" />;
            case 'Absent': return <XCircleIcon className="w-5 h-5 text-red-500" />;
            case 'Late': return <ClockIcon className="w-5 h-5 text-yellow-500" />;
            default: return null;
        }
    };

    return (
        <Card className="flex flex-col">
            <div className="border-b pb-4 mb-4">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">{classInfo.name}</h2>
                <p className="text-sm text-gray-500 dark:text-gray-400">{classInfo.students.length} Students</p>
                <div className="mt-4 grid grid-cols-2 md:grid-cols-4 gap-4 text-center">
                    <div className="p-2 bg-green-100 dark:bg-green-900/20 rounded-lg">
                        <p className="font-bold text-lg text-green-800 dark:text-green-300">{presentCount}</p>
                        <p className="text-xs text-green-600 dark:text-green-400">Present Today</p>
                    </div>
                    <div className="p-2 bg-red-100 dark:bg-red-900/20 rounded-lg">
                        <p className="font-bold text-lg text-red-800 dark:text-red-300">{absentCount}</p>
                        <p className="text-xs text-red-600 dark:text-red-400">Absent Today</p>
                    </div>
                </div>
            </div>
            
            <div className="flex-grow">
                <div className="flex border-b mb-4">
                     <button onClick={() => setView('roster')} className={`px-4 py-2 text-sm font-medium ${view === 'roster' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Student Roster</button>
                     <button onClick={() => setView('today')} className={`px-4 py-2 text-sm font-medium ${view === 'today' ? 'border-b-2 border-blue-500 text-blue-600 dark:text-blue-400' : 'text-gray-500 dark:text-gray-400'}`}>Today's Attendance</button>
                </div>

                <ul className="space-y-3 h-64 overflow-y-auto pr-2">
                    {classInfo.students.map(student => (
                        <li key={student.id} className="flex items-center justify-between p-2 bg-gray-50 dark:bg-gray-700/50 rounded-md">
                            <div className="flex items-center">
                                <img src={student.photoURL} alt={student.name} className="w-10 h-10 rounded-full" />
                                <div className="ml-3">
                                    <p className="text-sm font-medium text-gray-900 dark:text-white">{student.name}</p>
                                    <p className="text-xs text-gray-500 dark:text-gray-400">Roll: {student.rollNumber}</p>
                                </div>
                            </div>
                            {view === 'roster' ? (
                                <div className="flex items-center space-x-2">
                                     <button onClick={() => openEditModal(student)} className="p-1 text-gray-500 hover:text-blue-600 dark:text-gray-400 dark:hover:text-blue-400"><EditIcon className="w-5 h-5"/></button>
                                     <span className={`px-2 py-0.5 text-xs rounded-full ${student.faceDescriptor ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'}`}>
                                        {student.faceDescriptor ? 'Face Enrolled' : 'Not Enrolled'}
                                    </span>
                                </div>
                            ) : (
                                <div className="flex items-center">
                                    <StatusIcon status={getStudentStatus(student.id)} />
                                    <span className="ml-2 text-sm text-gray-600 dark:text-gray-300">{getStudentStatus(student.id)}</span>
                                </div>
                            )}
                        </li>
                    ))}
                </ul>
            </div>
            
            <div className="border-t mt-4 pt-4 grid grid-cols-2 gap-2">
                <Button onClick={() => openAddModal()} variant="secondary" className="flex justify-center items-center"><PlusCircleIcon className="w-5 h-5 mr-2"/>Add Student</Button>
                <Button onClick={() => onLiveAttendanceStart(classInfo)} className="flex justify-center items-center"><CameraIcon className="w-5 h-5 mr-2"/>Live Attendance</Button>
                <Button onClick={handleSendAlerts} disabled={isAlerting} variant="secondary" className="flex justify-center items-center"><SendIcon className="w-5 h-5 mr-2"/>{isAlerting ? 'Sending...' : 'Send Absence Alerts'}</Button>
                <Button onClick={handleExport} disabled={isExporting} variant="secondary" className="flex justify-center items-center"><DownloadIcon className="w-5 h-5 mr-2"/>{isExporting ? 'Exporting...' : 'Export Attendance'}</Button>
            </div>
            
            {isEditModalOpen && (
                 <Modal isOpen={isEditModalOpen} onClose={() => setIsEditModalOpen(false)} title={`Edit ${editingStudent?.name}`}>
                     <form onSubmit={handleUpdateStudent} className="space-y-4">
                         <div className="flex flex-col items-center">
                            <img src={photoPreview || editingStudent?.photoURL} alt="Student" className="w-24 h-24 rounded-full mb-2 object-cover"/>
                            <input type="file" name="photo" accept="image/*" onChange={handlePhotoChange} className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                         </div>
                        <div><label className="text-sm text-gray-700 dark:text-gray-300">Full Name</label><input name="name" defaultValue={editingStudent?.name} required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label className="text-sm text-gray-700 dark:text-gray-300">Roll Number</label><input name="rollNumber" defaultValue={editingStudent?.rollNumber} required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label className="text-sm text-gray-700 dark:text-gray-300">Notes</label><textarea name="notes" defaultValue={editingStudent?.notes} rows={3} className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div className="border-t pt-4 space-y-2">
                            <Button type="button" onClick={() => { setIsEditModalOpen(false); setIsEnrollModalOpen(true); }} className="w-full" variant="secondary">Face Enrollment</Button>
                            <Button type="submit" className="w-full">Save Changes</Button>
                        </div>
                    </form>
                </Modal>
            )}

            {isAddModalOpen && (
                 <Modal isOpen={isAddModalOpen} onClose={() => setIsAddModalOpen(false)} title="Add New Student">
                    <form onSubmit={handleAddStudent} className="space-y-4">
                         <div className="flex flex-col items-center">
                            {photoPreview ? <img src={photoPreview} alt="Preview" className="w-24 h-24 rounded-full mb-2 object-cover"/> : <div className="w-24 h-24 rounded-full bg-gray-200 dark:bg-gray-600 mb-2 flex items-center justify-center text-gray-400">Photo</div>}
                            <input type="file" name="photo" accept="image/*" onChange={handlePhotoChange} required className="text-sm text-gray-500 file:mr-4 file:py-1 file:px-2 file:rounded-full file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"/>
                         </div>
                        <div><label className="text-sm text-gray-700 dark:text-gray-300">Full Name</label><input name="name" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <div><label className="text-sm text-gray-700 dark:text-gray-300">Roll Number</label><input name="rollNumber" required className="w-full p-2 mt-1 rounded bg-gray-100 dark:bg-gray-700 border dark:border-gray-600"/></div>
                        <Button type="submit" className="w-full">Add Student</Button>
                    </form>
                </Modal>
            )}

            {isEnrollModalOpen && <FaceEnrollmentModal isOpen={isEnrollModalOpen} onClose={() => setIsEnrollModalOpen(false)} student={editingStudent} onEnrollmentComplete={handleEnrollmentComplete} />}
        </Card>
    );
};

const TeacherDashboard: React.FC = () => {
    const { user } = useAuth();
    const [isLoading, setIsLoading] = useState(true);
    const [classes, setClasses] = useState<EnrichedClass[]>([]);
    const [liveAttendanceClass, setLiveAttendanceClass] = useState<EnrichedClass | null>(null);

    const fetchData = useCallback(async () => {
        if (user && user.role === UserRole.TEACHER && user.uid) {
            setIsLoading(true);
            try {
                const teacherClasses = await firestoreService.getTeacherClasses(user.uid);
                const today = new Date().toISOString().split('T')[0];
                
                const enrichedClasses = await Promise.all(teacherClasses.map(async (c) => {
                    const [students, todaysAttendance] = await Promise.all([
                        firestoreService.getStudentsByClass(c.id),
                        firestoreService.getAttendanceForClassByDate(c.id, today)
                    ]);
                    return { ...c, students, todaysAttendance };
                }));

                setClasses(enrichedClasses);
            } catch (error) {
                console.error("Failed to fetch teacher data:", error);
            } finally {
                setIsLoading(false);
            }
        }
    }, [user]);

    useEffect(() => {
        fetchData();
    }, [fetchData]);

    if (isLoading) return <Spinner />;

    return (
        <div className="space-y-6">
            <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Teacher Dashboard</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Welcome back, {user?.name}!</p>
            {classes.length === 0 ? (
                <Card><p>You are not assigned to any classes.</p></Card>
            ) : (
                <>
                <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 gap-6">
                    {classes.map(c => <ClassCard key={c.id} classInfo={c} onLiveAttendanceStart={setLiveAttendanceClass} onRefresh={fetchData} />)}
                </div>
                {classes.length > 0 && classes.some(c => c.students.length > 0) &&
                  <AttendanceChart 
                    attendanceData={classes.flatMap(c => c.todaysAttendance)} 
                    students={classes.flatMap(c => c.students)}
                  />
                }
                </>
            )}
            {liveAttendanceClass && (
                <LiveAttendanceModal 
                    isOpen={!!liveAttendanceClass} 
                    onClose={() => setLiveAttendanceClass(null)}
                    classInfo={liveAttendanceClass}
                    onAttendanceMarked={fetchData}
                />
            )}
        </div>
    );
};

export default TeacherDashboard;