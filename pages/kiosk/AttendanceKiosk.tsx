import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { Student } from '../../types';
import { firestoreService } from '../../services/firebaseService';
import { Button, Card, Spinner } from '../../components/ui/index';
import { CheckCircleIcon, XCircleIcon } from '../../components/ui/Icons';

declare const faceapi: any;

interface KioskLog {
    studentName: string;
    timestamp: string;
}

const StudentListCard: React.FC<{title: string, students: Student[]}> = ({title, students}) => (
    <Card className="h-1/2">
        <h3 className="text-lg font-semibold text-gray-800 dark:text-gray-200 mb-2">{title} ({students.length})</h3>
        <ul className="space-y-2 overflow-y-auto h-full pb-8">
            {students.map(s => (
                <li key={s.id} className="flex items-center text-sm p-1 bg-gray-50 dark:bg-gray-700/50 rounded">
                    <img src={s.photoURL} alt={s.name} className="w-8 h-8 rounded-full mr-2"/>
                    <span className="text-gray-700 dark:text-gray-300">{s.name}</span>
                </li>
            ))}
             {students.length === 0 && <p className="text-gray-500 dark:text-gray-400 text-sm italic">No students in this list.</p>}
        </ul>
    </Card>
);

const AttendanceKiosk: React.FC = () => {
    const [status, setStatus] = useState('Initializing...');
    const [isCameraOn, setIsCameraOn] = useState(false);
    const [unscannedStudents, setUnscannedStudents] = useState<Student[]>([]);
    const [scannedStudents, setScannedStudents] = useState<Student[]>([]);
    const [logs, setLogs] = useState<KioskLog[]>([]);
    const [faceMatcher, setFaceMatcher] = useState<any>(null);
    
    const videoRef = useRef<HTMLVideoElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);

    const location = useLocation();
    const navigate = useNavigate();
    const classId = location.state?.classId;

    const loadModels = useCallback(async () => {
        const MODEL_URL = 'https://cdn.jsdelivr.net/npm/face-api.js@0.22.2/weights';
        try {
            setStatus('Loading AI models...');
            await Promise.all([
                faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
            ]);
            setStatus('AI Models loaded successfully.');
        } catch (error) {
            console.error("Failed to load face-api models", error);
            setStatus('Error: Could not load AI models. Please check your internet connection and refresh.');
        }
    }, []);
    
    useEffect(() => {
        loadModels();
    }, [loadModels]);

    useEffect(() => {
        if (!classId) {
            alert("No class selected. Redirecting to dashboard.");
            navigate('/dashboard');
            return;
        }

        const setupKiosk = async () => {
            const classStudents = await firestoreService.getStudentsByClass(classId);
            const enrolledStudents = classStudents.filter(s => s.faceDescriptor && s.faceDescriptor.length > 0);
            
            if(enrolledStudents.length === 0){
                 alert("No students with enrolled faces in this class. Please enroll faces from the teacher dashboard.");
                 navigate('/dashboard');
                 return;
            }

            const labeledFaceDescriptors = enrolledStudents.map(s => 
                new faceapi.LabeledFaceDescriptors(s.id, [Float32Array.from(s.faceDescriptor!)])
            );
            setFaceMatcher(new faceapi.FaceMatcher(labeledFaceDescriptors, 0.6));

            const today = new Date().toISOString().split('T')[0];
            const todaysAttendance = await firestoreService.getAttendanceForClassByDate(classId, today);
            const presentStudentIds = new Set(todaysAttendance.map(a => a.studentId));
            
            setUnscannedStudents(enrolledStudents.filter(s => !presentStudentIds.has(s.id)));
            setScannedStudents(classStudents.filter(s => presentStudentIds.has(s.id)));
            setStatus('Ready to start camera.');
        };

        if(status === 'AI Models loaded successfully.'){
            setupKiosk();
        }
    }, [classId, navigate, status]);


    const stopCamera = useCallback(() => {
        if (videoRef.current && videoRef.current.srcObject) {
            (videoRef.current.srcObject as MediaStream).getTracks().forEach(track => track.stop());
            videoRef.current.srcObject = null;
        }
        setIsCameraOn(false);
        setStatus('Camera stopped.');
    }, []);

    const startCamera = useCallback(async () => {
        setStatus('Starting camera...');
        if (!(navigator.mediaDevices && navigator.mediaDevices.getUserMedia)) {
            setStatus("Error: Camera access is not supported by this browser.");
            return;
        }
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ video: true });
            if (videoRef.current) {
                videoRef.current.srcObject = stream;
                setIsCameraOn(true);
                setStatus('Camera active. Ready to scan.');
            }
        } catch (err) {
            console.error("Error accessing camera: ", err);
            let message = "Error: Could not access the camera.";
            if (err instanceof Error) {
                if (err.name === "NotAllowedError" || err.name === "PermissionDeniedError") {
                    message = "Error: Camera access was denied. Please allow camera access in your browser settings.";
                } else if (err.name === "NotFoundError" || err.name === "DevicesNotFoundError") {
                    message = "Error: No camera found on this device.";
                }
            }
            setStatus(message);
        }
    }, []);

    const handleRecognition = useCallback((student: Student) => {
        if (!unscannedStudents.some(s => s.id === student.id)) return;

        firestoreService.markAttendance(student.id, student.classId, 'Present');
        
        setLogs(prev => [{ studentName: student.name, timestamp: new Date().toLocaleTimeString() }, ...prev.slice(0, 4)]);
        setScannedStudents(prev => [...prev, student]);
        setUnscannedStudents(prev => prev.filter(s => s.id !== student.id));
    }, [unscannedStudents]);

    const handleScan = async () => {
        if (!videoRef.current || !canvasRef.current || !faceMatcher) return;

        setStatus('Scanning frame...');
        const context = canvasRef.current.getContext('2d');
        if (!context) return;
        
        const displaySize = { width: videoRef.current.clientWidth, height: videoRef.current.clientHeight };
        faceapi.matchDimensions(canvasRef.current, displaySize);
        
        context.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);

        const detections = await faceapi.detectAllFaces(videoRef.current, new faceapi.TinyFaceDetectorOptions()).withFaceLandmarks().withFaceDescriptors();
        
        if (detections.length === 0) {
            setStatus('No faces detected in this frame.');
            return;
        }

        const resizedDetections = faceapi.resizeResults(detections, displaySize);
        const results = resizedDetections.map(d => faceMatcher.findBestMatch(d.descriptor));

        let foundStudent = false;
        results.forEach((result, i) => {
            const box = resizedDetections[i].detection.box;
            const studentId = result.label;
            const student = unscannedStudents.find(s => s.id === studentId);
            
            if (student) {
                const drawBox = new faceapi.draw.DrawBox(box, { label: student.name, boxColor: 'green' });
                drawBox.draw(canvasRef.current!);
                handleRecognition(student);
                setStatus(`Recognized: ${student.name}`);
                foundStudent = true;
            } else {
                 const drawBox = new faceapi.draw.DrawBox(box, { label: 'Unknown' });
                 drawBox.draw(canvasRef.current!);
            }
        });
        
        if (!foundStudent) {
            setStatus('No recognized students found in this frame.');
        }

        setTimeout(() => context.clearRect(0, 0, canvasRef.current!.width, canvasRef.current!.height), 2000);
    };

    const isReady = status === 'Ready to start camera.' || status.startsWith('Camera active') || status.startsWith('Recognized') || status.startsWith('No ');

    return (
        <div className="flex h-full p-4 space-x-4">
            <div className="w-1/3 flex flex-col space-y-4">
               <StudentListCard title="Remaining Students" students={unscannedStudents} />
               <StudentListCard title="Scanned Students" students={scannedStudents} />
            </div>
            <div className="flex-1 flex flex-col">
                <Card className="flex-1 relative flex items-center justify-center">
                    <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-cover rounded-lg bg-gray-900" />
                    <canvas ref={canvasRef} className="absolute top-0 left-0" />
                    {!isCameraOn && (
                         <div className="absolute inset-0 bg-black bg-opacity-70 flex flex-col items-center justify-center text-white p-4 rounded-lg">
                           {status.startsWith('Error') ? <XCircleIcon className="w-16 h-16 text-red-500 mb-4" /> : <Spinner />}
                           <p className="text-center mt-4">{status}</p>
                         </div>
                    )}
                </Card>
                <div className="mt-4 flex flex-col space-y-2">
                    <div className="flex space-x-4">
                         {!isCameraOn ? (
                            <Button onClick={startCamera} className="w-full" disabled={!isReady || status.startsWith('Error')}>Start Camera</Button>
                         ) : (
                            <Button onClick={handleScan} className="w-full" disabled={unscannedStudents.length === 0}>
                                {unscannedStudents.length > 0 ? 'Scan Frame for Attendance' : 'All Students Scanned!'}
                            </Button>
                         )}
                        <Button onClick={isCameraOn ? stopCamera : () => navigate(-1)} variant="secondary">
                            {isCameraOn ? 'Stop Camera' : 'Back to Dashboard'}
                        </Button>
                    </div>
                     <p className="text-center text-sm text-gray-600 dark:text-gray-300 h-5">{isCameraOn && status}</p>
                </div>
            </div>
            <div className="w-1/4">
                <Card className="h-full">
                    <h2 className="text-xl font-bold text-gray-900 dark:text-white border-b pb-2 mb-4">Attendance Log</h2>
                    <div className="space-y-4">
                        {logs.length === 0 && <p className="text-gray-500 dark:text-gray-400">Scan log will appear here...</p>}
                        {logs.map((log, index) => (
                            <div key={index} className="flex items-center p-3 bg-green-50 dark:bg-green-900/20 rounded-lg">
                                <CheckCircleIcon className="h-6 w-6 text-green-500 mr-3"/>
                                <div>
                                    <p className="font-semibold text-green-800 dark:text-green-300">Face Recognized: {log.studentName}</p>
                                    <p className="text-sm text-gray-600 dark:text-gray-400">Marked present at {log.timestamp}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </Card>
            </div>
        </div>
    );
};

export default AttendanceKiosk;