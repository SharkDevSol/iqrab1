import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiClock, FiSave, FiAlertCircle, FiCheckCircle } from 'react-icons/fi';
import styles from './StudentAttendanceTimeSettings.module.css';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:5011/api';

const StudentAttendanceTimeSettings = () => {
  const [settings, setSettings] = useState({
    check_in_start_time: '07:00:00',
    check_in_end_time: '08:30:00',
    late_threshold_time: '08:00:00',
    absent_marking_time: '09:00:00',
    shift1_check_in_start: '07:00:00',
    shift1_check_in_end: '08:30:00',
    shift1_late_threshold: '08:00:00',
    shift1_absent_marking: '09:00:00',
    shift2_check_in_start: '13:00:00',
    shift2_check_in_end: '14:30:00',
    shift2_late_threshold: '14:00:00',
    shift2_absent_marking: '15:00:00',
    school_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday'],
    auto_absent_enabled: true
  });
  const [classes, setClasses] = useState([]);
  const [classShiftAssignments, setClassShiftAssignments] = useState({});
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });
  const [currentTime, setCurrentTime] = useState(new Date());

  const allDays = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  useEffect(() => {
    fetchSettings();
    fetchClasses();
    fetchClassShiftAssignments();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  const fetchSettings = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/settings`);
      if (response.data.success) {
        // Merge fetched data with default values to prevent undefined errors
        setSettings(prev => ({
          ...prev,
          ...response.data.data,
          // Ensure these fields always exist
          school_days: response.data.data.school_days || prev.school_days,
          auto_absent_enabled: response.data.data.auto_absent_enabled !== undefined 
            ? response.data.data.auto_absent_enabled 
            : prev.auto_absent_enabled
        }));
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setMessage({ type: 'error', text: 'Failed to load settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/classes`);
      if (response.data.success) {
        setClasses(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
    }
  };

  const fetchClassShiftAssignments = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/class-shifts`);
      if (response.data.success) {
        const assignments = {};
        response.data.data.forEach(item => {
          assignments[item.class_name] = item.shift_number;
        });
        setClassShiftAssignments(assignments);
      }
    } catch (err) {
      console.error('Error fetching class shift assignments:', err);
    }
  };

  const handleTimeChange = (field, value) => {
    setSettings(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const handleDayToggle = (day) => {
    setSettings(prev => ({
      ...prev,
      school_days: (prev.school_days || []).includes(day)
        ? (prev.school_days || []).filter(d => d !== day)
        : [...(prev.school_days || []), day]
    }));
  };

  const handleClassShiftChange = (className, shiftNumber) => {
    setClassShiftAssignments(prev => ({
      ...prev,
      [className]: parseInt(shiftNumber)
    }));
  };

  const handleSave = async () => {
    try {
      setIsLoading(true);
      setMessage({ type: '', text: '' });

      // Save time settings
      const settingsResponse = await axios.put(`${API_BASE_URL}/academic/student-attendance/settings`, settings);
      
      // Save class shift assignments
      const assignmentsResponse = await axios.put(`${API_BASE_URL}/academic/student-attendance/class-shifts`, {
        assignments: classShiftAssignments
      });
      
      if (settingsResponse.data.success && assignmentsResponse.data.success) {
        setMessage({ type: 'success', text: 'Settings and class assignments saved successfully!' });
        setTimeout(() => setMessage({ type: '', text: '' }), 3000);
      }
    } catch (err) {
      console.error('Error saving settings:', err);
      setMessage({ type: 'error', text: 'Failed to save settings' });
    } finally {
      setIsLoading(false);
    }
  };

  const formatTime = (time) => {
    if (!time) return '';
    return time.substring(0, 5); // Convert HH:MM:SS to HH:MM
  };

  const formatCurrentTime = () => {
    return currentTime.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      hour12: true 
    });
  };

  const formatCurrentDate = () => {
    return currentTime.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1><FiClock /> Student Attendance Time Settings</h1>
        <p>Configure check-in times and auto-absent marking</p>
      </div>

      {message.text && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.type === 'success' ? <FiCheckCircle /> : <FiAlertCircle />}
          <span>{message.text}</span>
        </div>
      )}

      {/* Live Time Card */}
      <div className={styles.timeCard}>
        <div className={styles.timeCardHeader}>
          <FiClock className={styles.timeCardIcon} />
          <span>Current Time</span>
        </div>
        <div className={styles.timeCardBody}>
          <div className={styles.currentTime}>{formatCurrentTime()}</div>
          <div className={styles.currentDate}>{formatCurrentDate()}</div>
        </div>
      </div>

      <div className={styles.content}>
        {/* Shift 1 Time Settings */}
        <div className={styles.section}>
          <h2>⏰ Shift 1 Time Configuration</h2>
          
          <div className={styles.timeGrid}>
            <div className={styles.timeField}>
              <label>Check-in Start Time</label>
              <input
                type="time"
                value={formatTime(settings.shift1_check_in_start)}
                onChange={(e) => handleTimeChange('shift1_check_in_start', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>When Shift 1 students can start checking in</p>
            </div>

            <div className={styles.timeField}>
              <label>Check-in End Time</label>
              <input
                type="time"
                value={formatTime(settings.shift1_check_in_end)}
                onChange={(e) => handleTimeChange('shift1_check_in_end', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Last time Shift 1 students can check in</p>
            </div>

            <div className={styles.timeField}>
              <label>Late Threshold Time</label>
              <input
                type="time"
                value={formatTime(settings.shift1_late_threshold)}
                onChange={(e) => handleTimeChange('shift1_late_threshold', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Check-ins after this time are marked as LATE</p>
            </div>

            <div className={styles.timeField}>
              <label>Auto-Absent Marking Time</label>
              <input
                type="time"
                value={formatTime(settings.shift1_absent_marking)}
                onChange={(e) => handleTimeChange('shift1_absent_marking', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Students without check-in are marked ABSENT</p>
            </div>
          </div>
        </div>

        {/* Shift 2 Time Settings */}
        <div className={styles.section}>
          <h2>⏰ Shift 2 Time Configuration</h2>
          
          <div className={styles.timeGrid}>
            <div className={styles.timeField}>
              <label>Check-in Start Time</label>
              <input
                type="time"
                value={formatTime(settings.shift2_check_in_start)}
                onChange={(e) => handleTimeChange('shift2_check_in_start', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>When Shift 2 students can start checking in</p>
            </div>

            <div className={styles.timeField}>
              <label>Check-in End Time</label>
              <input
                type="time"
                value={formatTime(settings.shift2_check_in_end)}
                onChange={(e) => handleTimeChange('shift2_check_in_end', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Last time Shift 2 students can check in</p>
            </div>

            <div className={styles.timeField}>
              <label>Late Threshold Time</label>
              <input
                type="time"
                value={formatTime(settings.shift2_late_threshold)}
                onChange={(e) => handleTimeChange('shift2_late_threshold', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Check-ins after this time are marked as LATE</p>
            </div>

            <div className={styles.timeField}>
              <label>Auto-Absent Marking Time</label>
              <input
                type="time"
                value={formatTime(settings.shift2_absent_marking)}
                onChange={(e) => handleTimeChange('shift2_absent_marking', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Students without check-in are marked ABSENT</p>
            </div>
          </div>
        </div>

        {/* Class Shift Assignment */}
        <div className={styles.section}>
          <h2>🏫 Class Shift Assignment</h2>
          <p className={styles.sectionDesc}>Assign each class to Shift 1 or Shift 2</p>
          
          <div className={styles.classShiftGrid}>
            {classes.map(className => (
              <div key={className} className={styles.classShiftItem}>
                <label className={styles.classLabel}>{className}</label>
                <select
                  value={classShiftAssignments[className] || 1}
                  onChange={(e) => handleClassShiftChange(className, e.target.value)}
                  className={styles.shiftSelect}
                  disabled={isLoading}
                >
                  <option value={1}>Shift 1</option>
                  <option value={2}>Shift 2</option>
                </select>
              </div>
            ))}
          </div>
          
          {classes.length === 0 && (
            <p className={styles.noData}>No classes found</p>
          )}
        </div>

        {/* Time Settings (Legacy - kept for backward compatibility) */}
        <div className={styles.section}>
          <h2>⏰ Legacy Time Configuration</h2>
          <p className={styles.sectionDesc}>These settings are kept for backward compatibility</p>
          
          <div className={styles.timeGrid}>
            <div className={styles.timeField}>
              <label>Check-in Start Time</label>
              <input
                type="time"
                value={formatTime(settings.check_in_start_time)}
                onChange={(e) => handleTimeChange('check_in_start_time', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>When students can start checking in</p>
            </div>

            <div className={styles.timeField}>
              <label>Check-in End Time</label>
              <input
                type="time"
                value={formatTime(settings.check_in_end_time)}
                onChange={(e) => handleTimeChange('check_in_end_time', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Last time students can check in</p>
            </div>

            <div className={styles.timeField}>
              <label>Late Threshold Time</label>
              <input
                type="time"
                value={formatTime(settings.late_threshold_time)}
                onChange={(e) => handleTimeChange('late_threshold_time', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Check-ins after this time are marked as LATE</p>
            </div>

            <div className={styles.timeField}>
              <label>Auto-Absent Marking Time</label>
              <input
                type="time"
                value={formatTime(settings.absent_marking_time)}
                onChange={(e) => handleTimeChange('absent_marking_time', e.target.value + ':00')}
                className={styles.timeInput}
                disabled={isLoading}
              />
              <p className={styles.hint}>Students without check-in are marked ABSENT</p>
            </div>
          </div>
        </div>

        {/* School Days */}
        <div className={styles.section}>
          <h2>📅 School Days</h2>
          <p className={styles.sectionDesc}>Select which days attendance is tracked</p>
          
          <div className={styles.daysGrid}>
            {allDays.map(day => (
              <label key={day} className={styles.dayCheckbox}>
                <input
                  type="checkbox"
                  checked={settings.school_days?.includes(day) || false}
                  onChange={() => handleDayToggle(day)}
                  disabled={isLoading}
                />
                <span className={styles.dayLabel}>{day}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Auto-Absent Feature */}
        <div className={styles.section}>
          <h2>🤖 Auto-Absent Marking</h2>
          
          <label className={styles.toggleLabel}>
            <input
              type="checkbox"
              checked={settings.auto_absent_enabled}
              onChange={(e) => handleTimeChange('auto_absent_enabled', e.target.checked)}
              disabled={isLoading}
              className={styles.toggleInput}
            />
            <span className={styles.toggleSwitch}></span>
            <span className={styles.toggleText}>
              {settings.auto_absent_enabled ? 'Enabled' : 'Disabled'}
            </span>
          </label>

          <p className={styles.featureDesc}>
            When enabled, students who haven't checked in by the Auto-Absent Marking Time 
            will automatically be marked as ABSENT. This runs daily on school days.
          </p>
        </div>

        {/* Example Timeline - Shift 1 */}
        <div className={styles.section}>
          <h2>📊 Shift 1 Timeline Example</h2>
          
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#10b981' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift1_check_in_start)}</strong>
                <p>Shift 1 check-in window opens</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#f59e0b' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift1_late_threshold)}</strong>
                <p>Late threshold - check-ins after this are marked LATE</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#ef4444' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift1_absent_marking)}</strong>
                <p>Auto-absent marking - students without check-in marked ABSENT</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#6b7280' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift1_check_in_end)}</strong>
                <p>Shift 1 check-in window closes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Example Timeline - Shift 2 */}
        <div className={styles.section}>
          <h2>📊 Shift 2 Timeline Example</h2>
          
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#10b981' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift2_check_in_start)}</strong>
                <p>Shift 2 check-in window opens</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#f59e0b' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift2_late_threshold)}</strong>
                <p>Late threshold - check-ins after this are marked LATE</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#ef4444' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift2_absent_marking)}</strong>
                <p>Auto-absent marking - students without check-in marked ABSENT</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#6b7280' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.shift2_check_in_end)}</strong>
                <p>Shift 2 check-in window closes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Example Timeline - Legacy */}
        <div className={styles.section}>
          <h2>📊 Legacy Timeline Example</h2>
          
          <div className={styles.timeline}>
            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#10b981' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.check_in_start_time)}</strong>
                <p>Check-in window opens</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#f59e0b' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.late_threshold_time)}</strong>
                <p>Late threshold - check-ins after this are marked LATE</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#ef4444' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.absent_marking_time)}</strong>
                <p>Auto-absent marking - students without check-in marked ABSENT</p>
              </div>
            </div>

            <div className={styles.timelineItem}>
              <div className={styles.timelineDot} style={{ background: '#6b7280' }}></div>
              <div className={styles.timelineContent}>
                <strong>{formatTime(settings.check_in_end_time)}</strong>
                <p>Check-in window closes</p>
              </div>
            </div>
          </div>
        </div>

        {/* Save Button */}
        <div className={styles.actions}>
          <button
            onClick={handleSave}
            disabled={isLoading}
            className={styles.saveButton}
          >
            <FiSave />
            {isLoading ? 'Saving...' : 'Save Settings'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default StudentAttendanceTimeSettings;
