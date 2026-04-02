import React, { useState, useEffect } from 'react';
import axios from 'axios';
import StudentAttendanceSystem from '../../PAGE/Academic/StudentAttendanceSystem';

/**
 * Wrapper component that automatically sets the class from Class Teacher Assignment
 * and passes it to the StudentAttendanceSystem component
 */
const StaffAttendanceWrapper = () => {
  const [assignedClass, setAssignedClass] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    fetchAssignedClass();
  }, []);

  const fetchAssignedClass = async () => {
    try {
      const staffUser = JSON.parse(localStorage.getItem('staffUser') || '{}');
      const globalStaffId = staffUser.global_staff_id;

      if (!globalStaffId) {
        setError('Staff ID not found. Please login again.');
        setIsLoading(false);
        return;
      }

      const response = await axios.get(`https://iqrab1.skoolific.com/api/class-teacher/check/${globalStaffId}`);
      
      if (response.data.isClassTeacher) {
        setAssignedClass(response.data.assignedClass);
      } else {
        setError('You are not assigned as a class teacher yet.');
      }
      
      setIsLoading(false);
    } catch (err) {
      console.error('Error fetching assigned class:', err);
      setError('Failed to fetch your assigned class');
      setIsLoading(false);
    }
  };

  if (isLoading) {
    return (
      <div style={{ 
        display: 'flex', 
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        fontSize: '1.1rem',
        color: '#666'
      }}>
        Loading your class assignment...
      </div>
    );
  }

  if (error || !assignedClass) {
    return (
      <div style={{ 
        display: 'flex', 
        flexDirection: 'column',
        justifyContent: 'center', 
        alignItems: 'center', 
        minHeight: '400px',
        padding: '2rem',
        textAlign: 'center'
      }}>
        <div style={{ fontSize: '3rem', marginBottom: '1rem' }}>👥</div>
        <h3 style={{ color: '#333', marginBottom: '0.5rem' }}>No Class Assigned</h3>
        <p style={{ color: '#666', fontSize: '0.95rem' }}>
          {error || 'You need to be assigned as a class teacher to view attendance.'}
        </p>
        <p style={{ color: '#999', fontSize: '0.85rem', marginTop: '1rem' }}>
          Please contact the administrator to assign you to a class.
        </p>
      </div>
    );
  }

  // Pass the assigned class to StudentAttendanceSystem
  return <StudentAttendanceSystem preSelectedClass={assignedClass} />;
};

export default StaffAttendanceWrapper;
