
import React from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { Card } from '../ui/index';
import { AttendanceRecord, Student } from '../../types';

interface AttendanceChartProps {
  attendanceData: AttendanceRecord[];
  students: Student[];
}

const AttendanceChart: React.FC<AttendanceChartProps> = ({ attendanceData, students }) => {

  const processData = () => {
    const dataByDate: { [date: string]: { name: string, Present: number, Absent: number, Late: number } } = {};
    
    attendanceData.forEach(record => {
      const date = new Date(record.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      if (!dataByDate[date]) {
        dataByDate[date] = { name: date, Present: 0, Absent: 0, Late: 0 };
      }
      dataByDate[date][record.status]++;
    });

    return Object.values(dataByDate).reverse();
  };

  const chartData = processData();

  return (
    <Card className="mt-6">
        <h3 className="text-xl font-semibold text-gray-900 dark:text-white mb-4">Weekly Attendance Trend</h3>
        <div style={{ width: '100%', height: 300 }}>
            <ResponsiveContainer>
                <BarChart data={chartData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="name" />
                    <YAxis allowDecimals={false} />
                    <Tooltip contentStyle={{ backgroundColor: 'rgba(31, 41, 55, 0.8)', border: 'none', color: '#fff' }}/>
                    <Legend />
                    <Bar dataKey="Present" fill="#22c55e" />
                    <Bar dataKey="Absent" fill="#ef4444" />
                    <Bar dataKey="Late" fill="#f59e0b" />
                </BarChart>
            </ResponsiveContainer>
        </div>
    </Card>
  );
};

export default AttendanceChart;
