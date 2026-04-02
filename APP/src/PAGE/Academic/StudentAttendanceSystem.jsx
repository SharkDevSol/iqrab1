import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCalendar, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiEdit2, FiX, FiSave } from 'react-icons/fi';
import styles from './StudentAttendanceSystem.module.css';

// API base URL
const API_BASE_URL = import.meta.env.VITE_API_URL || 'https://iqrab1.skoolific.com/api';

const StudentAttendanceSystem = ({ preSelectedClass = null }) => {
  const [selectedClass, setSelectedClass] = useState(preSelectedClass || '');
  const [selectedYear, setSelectedYear] = useState(2018);
  const [selectedWeekId, setSelectedWeekId] = useState('');
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [attendanceData, setAttendanceData] = useState([]);
  const [summary, setSummary] = useState({ present: 0, absent: 0, leave: 0, late: 0, total: 0 });
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [currentEthiopianDate, setCurrentEthiopianDate] = useState(null);
  const [settings, setSettings] = useState(null);
  const [schoolWeeks, setSchoolWeeks] = useState([]);
  const [editModal, setEditModal] = useState({
    show: false,
    student: null,
    dayInfo: null,
    currentStatus: null
  });
  const [editForm, setEditForm] = useState({
    status: 'PRESENT',
    checkInTime: '08:00',
    notes: ''
  });
  const [showCurrentWeekModal, setShowCurrentWeekModal] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  
  // Report feature states
  const [showReport, setShowReport] = useState(false);
  const [reportClass, setReportClass] = useState('');
  const [reportDate, setReportDate] = useState({ year: 2018, month: 1, day: 1 });
  const [reportData, setReportData] = useState([]);
  const [reportLoading, setReportLoading] = useState(false);
  const [reportSummary, setReportSummary] = useState({ present: 0, absent: 0, leave: 0, late: 0, total: 0 });

  const ethiopianMonths = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  // Fetch initial data
  useEffect(() => {
    fetchCurrentDate();
    fetchClasses();
    fetchSettings();

    // Update current time every second
    const timer = setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => clearInterval(timer);
  }, []);

  // Update selectedClass when preSelectedClass prop changes
  useEffect(() => {
    if (preSelectedClass) {
      setSelectedClass(preSelectedClass);
    }
  }, [preSelectedClass]);

  // Generate school weeks when settings and date are loaded
  useEffect(() => {
    if (settings && currentEthiopianDate) {
      generateSchoolWeeks();
    }
  }, [settings, currentEthiopianDate, selectedYear]);

  // Fetch attendance when class or week changes
  useEffect(() => {
    if (selectedClass && selectedWeekId) {
      fetchAttendance();
    }
  }, [selectedClass, selectedWeekId]);

  // Recalculate summary whenever attendanceData changes
  useEffect(() => {
    if (attendanceData.length >= 0) {
      calculateSummary();
    }
  }, [attendanceData]);

  // Fetch students when class changes
  useEffect(() => {
    if (selectedClass) {
      fetchStudents();
    }
  }, [selectedClass]);

  // Auto-run absent marker when page loads
  useEffect(() => {
    if (settings && settings.auto_absent_enabled) {
      runAutoMarkerSilently();
    }
  }, [settings]);

  // Auto-refresh attendance data every 30 seconds to catch machine logs
  useEffect(() => {
    if (!selectedClass || !selectedWeekId) return;

    // Set up auto-refresh interval
    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing attendance data...');
      fetchAttendance();
      // Summary will auto-calculate when attendanceData updates
    }, 30000); // Refresh every 30 seconds

    // Cleanup interval on unmount or when dependencies change
    return () => clearInterval(refreshInterval);
  }, [selectedClass, selectedWeekId]);

  // Run auto-marker silently in background
  const runAutoMarkerSilently = async () => {
    try {
      console.log('Running auto-marker in background...');
      await axios.post(`${API_BASE_URL}/academic/student-attendance/mark-absent`);
      console.log('Auto-marker completed');
      // Refresh attendance data if we're viewing current data
      if (selectedClass && selectedWeekId) {
        await fetchAttendance();
        // Summary will auto-calculate when attendanceData updates
      }
    } catch (err) {
      console.error('Auto-marker error:', err);
      // Fail silently - don't show error to user
    }
  };

  const fetchCurrentDate = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/current-date`);
      if (response.data.success) {
        const date = response.data.data;
        setCurrentEthiopianDate(date);
        setSelectedYear(date.year);
      }
    } catch (err) {
      console.error('Error fetching current date:', err);
    }
  };

  const fetchSettings = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/settings`);
      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching settings:', err);
      setSettings({
        school_days: ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday']
      });
    }
  };

  const fetchClasses = async () => {
    try {
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/classes`);
      if (response.data.success) {
        setClasses(response.data.data);
        // Only set first class if no preSelectedClass is provided
        if (response.data.data.length > 0 && !preSelectedClass) {
          setSelectedClass(response.data.data[0]);
        }
      }
    } catch (err) {
      console.error('Error fetching classes:', err);
      setError('Failed to fetch classes');
    }
  };

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/students`, {
        params: { class: selectedClass }
      });
      if (response.data.success) {
        setStudents(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching students:', err);
      setError('Failed to fetch students');
    } finally {
      setIsLoading(false);
    }
  };

  // Generate school weeks starting from Mondays (OPTIMIZED - single API call)
  const generateSchoolWeeks = async () => {
    if (!settings || !settings.school_days) return;

    setIsLoading(true);
    
    try {
      // Make a single API call to generate all weeks on the backend
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/generate-weeks`, {
        params: {
          year: selectedYear,
          schoolDays: settings.school_days.join(',')
        }
      });

      if (response.data.success) {
        const weeks = response.data.data.weeks;
        
        // Mark current week
        const weeksWithCurrent = weeks.map(week => {
          let isCurrentWeek = false;
          
          if (currentEthiopianDate) {
            const firstDay = week.days[0];
            const lastDay = week.days[week.days.length - 1];
            
            // Check if today is exactly one of the school days
            const exactMatch = week.days.some(
              d => d.year === currentEthiopianDate.year && 
                   d.month === currentEthiopianDate.month && 
                   d.day === currentEthiopianDate.day
            );
            
            // Check if today falls within the week range
            const withinRange = 
              currentEthiopianDate.year === firstDay.year &&
              currentEthiopianDate.month === firstDay.month &&
              currentEthiopianDate.day >= firstDay.day &&
              currentEthiopianDate.day <= lastDay.day;
            
            // Check if week spans months
            const spansMonths = firstDay.month !== lastDay.month;
            if (spansMonths) {
              const inFirstMonth = 
                currentEthiopianDate.year === firstDay.year &&
                currentEthiopianDate.month === firstDay.month &&
                currentEthiopianDate.day >= firstDay.day;
              
              const inLastMonth = 
                currentEthiopianDate.year === lastDay.year &&
                currentEthiopianDate.month === lastDay.month &&
                currentEthiopianDate.day <= lastDay.day;
              
              isCurrentWeek = exactMatch || inFirstMonth || inLastMonth;
            } else {
              isCurrentWeek = exactMatch || withinRange;
            }
          }
          
          return {
            ...week,
            isCurrent: isCurrentWeek
          };
        });
        
        setSchoolWeeks(weeksWithCurrent);
        
        console.log(`Loaded ${weeksWithCurrent.length} school weeks for year ${selectedYear}`);
        console.log('Current Ethiopian date:', currentEthiopianDate);
        
        // Select current week if found, otherwise first week
        const currentWeek = weeksWithCurrent.find(w => w.isCurrent);
        if (currentWeek) {
          console.log('Auto-selecting current week:', currentWeek.label);
          setSelectedWeekId(currentWeek.id);
        } else {
          console.log('Current week not found, selecting first week');
          if (weeksWithCurrent.length > 0) {
            setSelectedWeekId(weeksWithCurrent[0].id);
          }
        }
      }
    } catch (err) {
      console.error('Error generating weeks:', err);
      setError('Failed to generate school weeks');
    } finally {
      setIsLoading(false);
    }
  };

  // Go to current week - show modal with calendar info
  const goToCurrentWeek = () => {
    setShowCurrentWeekModal(true);
  };

  // Actually navigate to current week
  const navigateToCurrentWeek = () => {
    // First, check if we're viewing the current year
    if (currentEthiopianDate && selectedYear !== currentEthiopianDate.year) {
      setSelectedYear(currentEthiopianDate.year);
      setShowCurrentWeekModal(false);
      return;
    }

    const currentWeek = schoolWeeks.find(w => w.isCurrent);
    if (currentWeek) {
      setSelectedWeekId(currentWeek.id);
      setShowCurrentWeekModal(false);
    } else {
      alert('Current week not found in the generated weeks. Try refreshing the page.');
    }
  };

  // Get current week info for display
  const getCurrentWeekInfo = () => {
    if (!currentEthiopianDate) return null;
    
    const currentWeek = schoolWeeks.find(w => w.isCurrent);
    
    return {
      today: currentEthiopianDate,
      todayFormatted: `${ethiopianMonths[currentEthiopianDate.month - 1]} ${currentEthiopianDate.day}, ${currentEthiopianDate.year}`,
      currentWeek: currentWeek,
      isCurrentYear: selectedYear === currentEthiopianDate.year,
      totalWeeks: schoolWeeks.length
    };
  };

  const getSelectedWeek = () => {
    return schoolWeeks.find(w => w.id === selectedWeekId);
  };

  const fetchAttendance = async () => {
    const selectedWeek = getSelectedWeek();
    if (!selectedWeek || !selectedWeek.days) return;

    try {
      setIsLoading(true);
      
      // Fetch attendance for all days in the week
      const promises = selectedWeek.days.map(day =>
        axios.get(`${API_BASE_URL}/academic/student-attendance/weekly`, {
          params: {
            week: Math.ceil(day.day / 7),
            year: day.year,
            month: day.month,
            class: selectedClass
          }
        })
      );

      const responses = await Promise.all(promises);
      const allData = responses.flatMap(r => r.data.success ? r.data.data : []);
      
      setAttendanceData(allData);
    } catch (err) {
      console.error('Error fetching attendance:', err);
    } finally {
      setIsLoading(false);
    }
  };

  const calculateSummary = () => {
    const selectedWeek = getSelectedWeek();
    if (!selectedWeek) {
      setSummary({ present: 0, absent: 0, leave: 0, late: 0, total: 0 });
      return;
    }

    // Calculate summary ONLY from current attendanceData (which is already filtered by class and week)
    // Count unique student-day combinations to avoid counting same student multiple times
    const uniqueRecords = new Map();
    
    attendanceData.forEach(record => {
      const key = `${record.student_id}-${record.ethiopian_year}-${record.ethiopian_month}-${record.ethiopian_day}`;
      uniqueRecords.set(key, record);
    });
    
    const records = Array.from(uniqueRecords.values());
    
    const present = records.filter(a => a.status === 'PRESENT').length;
    const absent = records.filter(a => a.status === 'ABSENT').length;
    const leave = records.filter(a => a.status === 'LEAVE').length;
    const late = records.filter(a => a.status === 'LATE').length;
    
    console.log('📊 Summary Calculation:', {
      totalRecords: records.length,
      present,
      late,
      absent,
      leave
    });
    
    setSummary({
      present,
      late,
      absent,
      leave,
      total: records.length
    });
  };

  const getAttendanceStatus = (studentId, dayInfo) => {
    const record = attendanceData.find(
      att => att.student_id === studentId && 
             att.ethiopian_year === dayInfo.year &&
             att.ethiopian_month === dayInfo.month &&
             att.ethiopian_day === dayInfo.day
    );
    return record ? record.status : null;
  };

  const getAttendanceRecord = (studentId, dayInfo) => {
    const record = attendanceData.find(
      att => att.student_id === studentId && 
             att.ethiopian_year === dayInfo.year &&
             att.ethiopian_month === dayInfo.month &&
             att.ethiopian_day === dayInfo.day
    );
    return record;
  };

  // Check if an Ethiopian day is in the future (after today)
  const isFutureDay = (dayInfo) => {
    if (!currentEthiopianDate) return false;
    if (dayInfo.year > currentEthiopianDate.year) return true;
    if (dayInfo.year < currentEthiopianDate.year) return false;
    if (dayInfo.month > currentEthiopianDate.month) return true;
    if (dayInfo.month < currentEthiopianDate.month) return false;
    return dayInfo.day > currentEthiopianDate.day;
  };

  const handleCellClick = (student, dayInfo) => {
    const currentRecord = attendanceData.find(
      att => att.student_id === student.student_id && 
             att.ethiopian_year === dayInfo.year &&
             att.ethiopian_month === dayInfo.month &&
             att.ethiopian_day === dayInfo.day
    );

    setEditModal({
      show: true,
      student,
      dayInfo,
      currentStatus: currentRecord?.status || null
    });

    setEditForm({
      status: currentRecord?.status || 'PRESENT',
      checkInTime: currentRecord?.check_in_time?.substring(0, 5) || '08:00',
      notes: currentRecord?.notes || ''
    });
  };

  const handleSaveAttendance = async () => {
    try {
      setIsLoading(true);

      const response = await axios.put(`${API_BASE_URL}/academic/student-attendance/update`, {
        studentId: editModal.student.student_id,
        className: editModal.student.class_name,
        ethYear: editModal.dayInfo.year,
        ethMonth: editModal.dayInfo.month,
        ethDay: editModal.dayInfo.day,
        status: editForm.status,
        checkInTime: editForm.checkInTime + ':00',
        notes: editForm.notes
      });

      if (response.data.success) {
        await fetchAttendance();
        // Summary will auto-calculate when attendanceData updates
        closeModal();
      }
    } catch (err) {
      console.error('Error saving attendance:', err);
      setError('Failed to save attendance');
    } finally {
      setIsLoading(false);
    }
  };

  const closeModal = () => {
    setEditModal({ show: false, student: null, dayInfo: null, currentStatus: null });
    setEditForm({ status: 'PRESENT', checkInTime: '08:00', notes: '' });
  };

  const renderStatusBadge = (record) => {
    if (!record || !record.status) return <span className={styles.noData}>-</span>;

    const status = record.status;
    const checkInTime = record.check_in_time;

    const statusConfig = {
      PRESENT: { className: styles.present, label: '✓' },
      ABSENT: { className: styles.absent, label: '✗' },
      LEAVE: { className: styles.leave, label: 'L' },
      LATE: { className: styles.late, label: '⏰' }
    };

    const config = statusConfig[status] || statusConfig.ABSENT;

    // Show time for PRESENT and LATE statuses
    const showTime = (status === 'PRESENT' || status === 'LATE') && checkInTime;
    
    // Convert 24-hour time to 12-hour format with AM/PM
    let timeDisplay = null;
    if (showTime) {
      const [hours, minutes] = checkInTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12; // Convert 0 to 12 for midnight
      timeDisplay = `${hour12}:${minutes} ${ampm}`;
    }

    return (
      <div className={styles.statusContainer}>
        <span className={`${styles.statusBadge} ${config.className}`}>
          {config.label}
        </span>
        {timeDisplay && (
          <span className={styles.checkInTime}>{timeDisplay}</span>
        )}
      </div>
    );
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

  // Fetch report data for specific date
  const fetchReportData = async () => {
    if (!reportClass || !reportDate.year || !reportDate.month || !reportDate.day) {
      alert('Please select class and date');
      return;
    }

    try {
      setReportLoading(true);
      const response = await axios.get(`${API_BASE_URL}/academic/student-attendance/weekly`, {
        params: {
          week: Math.ceil(reportDate.day / 7),
          year: reportDate.year,
          month: reportDate.month,
          class: reportClass
        }
      });

      if (response.data.success) {
        // Filter data for the specific date
        const dateData = response.data.data.filter(
          record => record.ethiopian_year === reportDate.year &&
                   record.ethiopian_month === reportDate.month &&
                   record.ethiopian_day === reportDate.day
        );
        
        setReportData(dateData);
        
        // Calculate summary
        const present = dateData.filter(a => a.status === 'PRESENT').length;
        const absent = dateData.filter(a => a.status === 'ABSENT').length;
        const leave = dateData.filter(a => a.status === 'LEAVE').length;
        const late = dateData.filter(a => a.status === 'LATE').length;
        
        setReportSummary({
          present,
          late,
          absent,
          leave,
          total: dateData.length
        });
      }
    } catch (err) {
      console.error('Error fetching report:', err);
      alert('Failed to fetch report data');
    } finally {
      setReportLoading(false);
    }
  };

  const printReport = () => {
    window.print();
  };

  const selectedWeek = getSelectedWeek();

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1><FiUsers /> Student Attendance System</h1>
          <p>School week attendance tracking with Ethiopian calendar</p>
        </div>
        {currentEthiopianDate && (
          <div className={styles.currentDate}>
            <FiCalendar />
            <span>Today: {ethiopianMonths[currentEthiopianDate.month - 1]} {currentEthiopianDate.day}, {currentEthiopianDate.year}</span>
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

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

      {/* Filters */}
      <div className={styles.filters}>
        {preSelectedClass ? (
          <div className={styles.filterGroup}>
            <label>Assigned Class</label>
            <div className={styles.assignedClassBadge}>
              {selectedClass}
            </div>
          </div>
        ) : (
          <div className={styles.filterGroup}>
            <label>Class</label>
            <select
              value={selectedClass}
              onChange={(e) => setSelectedClass(e.target.value)}
              className={styles.select}
            >
              {classes.map(cls => (
                <option key={cls} value={cls}>{cls}</option>
              ))}
            </select>
          </div>
        )}

        <div className={styles.filterGroup}>
          <label>Year</label>
          <input
            type="number"
            value={selectedYear}
            onChange={(e) => setSelectedYear(parseInt(e.target.value))}
            className={styles.input}
            min="2000"
            max="2100"
          />
        </div>

        <div className={styles.filterGroup}>
          <label>School Week</label>
          <select
            value={selectedWeekId}
            onChange={(e) => setSelectedWeekId(e.target.value)}
            className={styles.select}
            disabled={schoolWeeks.length === 0}
          >
            {schoolWeeks.length === 0 ? (
              <option>Loading weeks...</option>
            ) : (
              schoolWeeks.map(week => (
                <option key={week.id} value={week.id}>
                  {week.label} {week.isCurrent ? '(Current)' : ''}
                </option>
              ))
            )}
          </select>
        </div>

        <div className={styles.filterGroup}>
          <label>Quick Actions</label>
          <div className={styles.buttonGroup}>
            <button
              onClick={goToCurrentWeek}
              disabled={schoolWeeks.length === 0}
              className={styles.currentWeekButton}
              title="Jump to current week"
            >
              📅 Current Week
            </button>
            <button
              onClick={() => {
                fetchAttendance();
                // Summary will auto-calculate when attendanceData updates
              }}
              disabled={!selectedClass || !selectedWeekId}
              className={styles.refreshButton}
              title="Refresh attendance data (auto-refreshes every 30 seconds)"
            >
              🔄 Refresh
            </button>
          </div>
        </div>
      </div>

      {/* Report Section */}
      <div className={styles.reportSection}>
        <div className={styles.reportHeader}>
          <h2>📊 Attendance Report by Date</h2>
          <button 
            onClick={() => setShowReport(!showReport)}
            className={styles.toggleReportButton}
          >
            {showReport ? '▼ Hide Report' : '▶ Show Report'}
          </button>
        </div>

        {showReport && (
          <div className={styles.reportContent}>
            <div className={styles.reportFilters}>
              <div className={styles.filterGroup}>
                <label>Class</label>
                <select
                  value={reportClass}
                  onChange={(e) => setReportClass(e.target.value)}
                  className={styles.select}
                >
                  <option value="">Select Class</option>
                  {classes.map(cls => (
                    <option key={cls} value={cls}>{cls}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Year</label>
                <input
                  type="number"
                  value={reportDate.year}
                  onChange={(e) => setReportDate({ ...reportDate, year: parseInt(e.target.value) })}
                  className={styles.input}
                  min="2000"
                  max="2100"
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Month</label>
                <select
                  value={reportDate.month}
                  onChange={(e) => setReportDate({ ...reportDate, month: parseInt(e.target.value) })}
                  className={styles.select}
                >
                  {ethiopianMonths.map((month, index) => (
                    <option key={index} value={index + 1}>{month}</option>
                  ))}
                </select>
              </div>

              <div className={styles.filterGroup}>
                <label>Day</label>
                <input
                  type="number"
                  value={reportDate.day}
                  onChange={(e) => setReportDate({ ...reportDate, day: parseInt(e.target.value) })}
                  className={styles.input}
                  min="1"
                  max="30"
                />
              </div>

              <div className={styles.filterGroup}>
                <label>Actions</label>
                <div className={styles.buttonGroup}>
                  <button
                    onClick={fetchReportData}
                    disabled={!reportClass || reportLoading}
                    className={styles.generateReportButton}
                  >
                    {reportLoading ? '⏳ Loading...' : '📊 Generate Report'}
                  </button>
                  {reportData.length > 0 && (
                    <button
                      onClick={printReport}
                      className={styles.printButton}
                    >
                      🖨️ Print
                    </button>
                  )}
                </div>
              </div>
            </div>

            {reportData.length > 0 && (
              <>
                {/* Report Summary */}
                <div className={styles.reportSummary}>
                  <h3>Report for {reportClass} - {ethiopianMonths[reportDate.month - 1]} {reportDate.day}, {reportDate.year}</h3>
                  <div className={styles.summaryCards}>
                    <div className={`${styles.card} ${styles.presentCard}`}>
                      <FiCheckCircle className={styles.cardIcon} />
                      <div className={styles.cardContent}>
                        <h3>{reportSummary.present}</h3>
                        <p>Present</p>
                      </div>
                    </div>

                    <div className={`${styles.card} ${styles.lateCard}`}>
                      <FiClock className={styles.cardIcon} />
                      <div className={styles.cardContent}>
                        <h3>{reportSummary.late}</h3>
                        <p>Late</p>
                      </div>
                    </div>

                    <div className={`${styles.card} ${styles.absentCard}`}>
                      <FiXCircle className={styles.cardIcon} />
                      <div className={styles.cardContent}>
                        <h3>{reportSummary.absent}</h3>
                        <p>Absent</p>
                      </div>
                    </div>

                    <div className={`${styles.card} ${styles.leaveCard}`}>
                      <FiClock className={styles.cardIcon} />
                      <div className={styles.cardContent}>
                        <h3>{reportSummary.leave}</h3>
                        <p>On Leave</p>
                      </div>
                    </div>

                    <div className={`${styles.card} ${styles.totalCard}`}>
                      <FiCalendar className={styles.cardIcon} />
                      <div className={styles.cardContent}>
                        <h3>{reportSummary.total}</h3>
                        <p>Total</p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Report Table */}
                <div className={styles.reportTable}>
                  <table className={styles.table}>
                    <thead>
                      <tr>
                        <th>#</th>
                        <th>Student Name</th>
                        <th>Class ID</th>
                        <th>Machine ID</th>
                        <th>Status</th>
                        <th>Check-in Time</th>
                        <th>Notes</th>
                      </tr>
                    </thead>
                    <tbody>
                      {reportData.map((record, index) => (
                        <tr key={record.id || index}>
                          <td>{index + 1}</td>
                          <td className={styles.studentName}>{record.student_name}</td>
                          <td>{record.class_id || 'N/A'}</td>
                          <td>{record.smachine_id || 'Not Set'}</td>
                          <td>{renderStatusBadge(record)}</td>
                          <td>{record.check_in_time || '-'}</td>
                          <td>{record.notes || '-'}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}

            {reportData.length === 0 && !reportLoading && reportClass && (
              <div className={styles.noData}>
                No attendance records found for the selected date.
              </div>
            )}
          </div>
        )}
      </div>

      {/* Summary Cards */}
      <div className={styles.summaryCards}>
        <div className={`${styles.card} ${styles.presentCard}`}>
          <FiCheckCircle className={styles.cardIcon} />
          <div className={styles.cardContent}>
            <h3>{summary.present}</h3>
            <p>Present</p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.lateCard}`}>
          <FiClock className={styles.cardIcon} />
          <div className={styles.cardContent}>
            <h3>{summary.late}</h3>
            <p>Late</p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.absentCard}`}>
          <FiXCircle className={styles.cardIcon} />
          <div className={styles.cardContent}>
            <h3>{summary.absent}</h3>
            <p>Absent</p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.leaveCard}`}>
          <FiClock className={styles.cardIcon} />
          <div className={styles.cardContent}>
            <h3>{summary.leave}</h3>
            <p>On Leave</p>
          </div>
        </div>

        <div className={`${styles.card} ${styles.totalCard}`}>
          <FiCalendar className={styles.cardIcon} />
          <div className={styles.cardContent}>
            <h3>{summary.total}</h3>
            <p>Total Records</p>
          </div>
        </div>
      </div>

      {/* School Days Info */}
      {settings && settings.school_days && (
        <div className={styles.schoolDaysInfo}>
          <strong>📅 School Days:</strong> {settings.school_days.join(', ')}
          <span className={styles.hint}>(Weeks start from Monday and show only these days)</span>
        </div>
      )}

      {/* Attendance Table */}
      <div className={styles.tableContainer}>
        {isLoading ? (
          <div className={styles.loading}>Loading...</div>
        ) : !selectedWeek ? (
          <div className={styles.noData}>Please select a school week</div>
        ) : students.length === 0 ? (
          <div className={styles.noData}>No students found for this class</div>
        ) : (
          <table className={styles.table}>
            <thead>
              <tr>
                <th>Student Name</th>
                <th>Class ID</th>
                <th>Machine ID</th>
                {selectedWeek.days.map((dayInfo, index) => (
                  <th key={index}>
                    {ethiopianMonths[dayInfo.month - 1]?.substring(0, 3)} {dayInfo.day} ({dayInfo.dayOfWeek?.substring(0, 3)})
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {students.map(student => (
                <tr key={`${student.student_id}-${student.class_name}`}>
                  <td className={styles.studentName}>{student.student_name}</td>
                  <td className={styles.classId}>{student.class_id || 'N/A'}</td>
                  <td className={styles.machineId}>{student.smachine_id || 'Not Set'}</td>
                  {selectedWeek.days.map((dayInfo, index) => (
                    <td 
                      key={index} 
                      className={`${styles.statusCell} ${styles.clickable}`}
                      onClick={() => handleCellClick(student, dayInfo)}
                      title="Click to edit"
                    >
                      {renderStatusBadge(getAttendanceRecord(student.student_id, dayInfo))}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      {/* Info Section */}
      <div className={styles.infoSection}>
        <h3>How it works:</h3>
        <ul>
          <li>✓ = Present (Green) - Student checked in on time</li>
          <li>⏰ = Late (Orange) - Student checked in late</li>
          <li>✗ = Absent (Red) - Student did not check in</li>
          <li>L = Leave (Purple) - Student on approved leave</li>
          <li>- = No data - No record for this day</li>
        </ul>
        <p className={styles.note}>
          School weeks always start from Monday and show only configured school days. 
          Weeks can span across months (e.g., Tir 29 - Yek 7).
          Check-in times are shown in 12-hour format (AM/PM) in UTC+3 timezone.
        </p>
        <p className={styles.note}>
          💡 Click on any cell in the attendance table to manually edit the attendance status.
        </p>
      </div>

      {/* Edit Modal */}
      {editModal.show && (
        <div className={styles.modalOverlay} onClick={closeModal}>
          <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h3><FiEdit2 /> Edit Attendance</h3>
              <button onClick={closeModal} className={styles.closeButton}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.modalInfo}>
                <p><strong>Student:</strong> {editModal.student?.student_name}</p>
                <p><strong>Date:</strong> {ethiopianMonths[editModal.dayInfo?.month - 1]} {editModal.dayInfo?.day}, {editModal.dayInfo?.year} ({editModal.dayInfo?.dayOfWeek})</p>
                <p><strong>Current Status:</strong> {editModal.currentStatus || 'Not Marked'}</p>
              </div>

              <div className={styles.formGroup}>
                <label>Status</label>
                <select
                  value={editForm.status}
                  onChange={(e) => setEditForm({ ...editForm, status: e.target.value })}
                  className={styles.select}
                >
                  <option value="PRESENT">✓ Present</option>
                  <option value="ABSENT">✗ Absent</option>
                  <option value="LEAVE">L Leave</option>
                  <option value="LATE">⏰ Late</option>
                </select>
              </div>

              <div className={styles.formGroup}>
                <label>Check-in Time</label>
                <input
                  type="time"
                  value={editForm.checkInTime}
                  onChange={(e) => setEditForm({ ...editForm, checkInTime: e.target.value })}
                  className={styles.input}
                />
              </div>

              <div className={styles.formGroup}>
                <label>Notes (Optional)</label>
                <textarea
                  value={editForm.notes}
                  onChange={(e) => setEditForm({ ...editForm, notes: e.target.value })}
                  className={styles.textarea}
                  placeholder="Add any notes about this attendance record..."
                  rows={3}
                />
              </div>
            </div>

            <div className={styles.modalFooter}>
              <button onClick={closeModal} className={styles.cancelButton}>
                Cancel
              </button>
              <button 
                onClick={handleSaveAttendance} 
                className={styles.saveButton}
                disabled={isLoading}
              >
                <FiSave />
                {isLoading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Current Week Info Modal */}
      {showCurrentWeekModal && (() => {
        const weekInfo = getCurrentWeekInfo();
        return (
          <div className={styles.modalOverlay} onClick={() => setShowCurrentWeekModal(false)}>
            <div className={styles.modal} onClick={(e) => e.stopPropagation()}>
              <div className={styles.modalHeader}>
                <h3><FiCalendar /> Current Week Information</h3>
                <button onClick={() => setShowCurrentWeekModal(false)} className={styles.closeButton}>
                  <FiX />
                </button>
              </div>

              <div className={styles.modalBody}>
                {weekInfo ? (
                  <>
                    <div className={styles.currentWeekInfo}>
                      <div className={styles.todayBadge}>
                        <FiCalendar size={32} />
                        <div>
                          <h4>Today's Date</h4>
                          <p className={styles.todayDate}>{weekInfo.todayFormatted}</p>
                        </div>
                      </div>

                      {!weekInfo.isCurrentYear && (
                        <div className={styles.warningBox}>
                          <strong>⚠️ Different Year</strong>
                          <p>You are viewing year {selectedYear}, but today is in year {weekInfo.today.year}.</p>
                        </div>
                      )}

                      {weekInfo.currentWeek ? (
                        <div className={styles.weekDetailsBox}>
                          <h4>📅 Current Week Found</h4>
                          <p className={styles.weekRange}>{weekInfo.currentWeek.label}</p>
                          
                          <div className={styles.weekDaysList}>
                            <strong>School Days in This Week:</strong>
                            <ul>
                              {weekInfo.currentWeek.days.map((day, index) => (
                                <li key={index} className={
                                  day.year === weekInfo.today.year && 
                                  day.month === weekInfo.today.month && 
                                  day.day === weekInfo.today.day ? styles.todayHighlight : ''
                                }>
                                  {ethiopianMonths[day.month - 1]} {day.day} ({day.dayOfWeek})
                                  {day.year === weekInfo.today.year && 
                                   day.month === weekInfo.today.month && 
                                   day.day === weekInfo.today.day && ' ← Today'}
                                </li>
                              ))}
                            </ul>
                            <p className={styles.weekNote}>
                              💡 Today ({weekInfo.todayFormatted}) falls within this school week range.
                            </p>
                          </div>
                        </div>
                      ) : (
                        <div className={styles.warningBox}>
                          <strong>❌ Current Week Not Found</strong>
                          <p>Today's date ({weekInfo.todayFormatted}) is not in any of the {weekInfo.totalWeeks} generated school weeks.</p>
                          <p><strong>Possible reasons:</strong></p>
                          <ul>
                            <li>Today is not a configured school day</li>
                            <li>Weeks are still loading</li>
                            <li>There was an error generating weeks</li>
                          </ul>
                          <p>Check your school days settings or try refreshing the page.</p>
                        </div>
                      )}
                    </div>
                  </>
                ) : (
                  <div className={styles.warningBox}>
                    <p>Loading calendar information...</p>
                  </div>
                )}
              </div>

              <div className={styles.modalFooter}>
                <button onClick={() => setShowCurrentWeekModal(false)} className={styles.cancelButton}>
                  Close
                </button>
                {weekInfo && weekInfo.currentWeek && (
                  <button 
                    onClick={navigateToCurrentWeek} 
                    className={styles.saveButton}
                  >
                    <FiCalendar />
                    Go to This Week
                  </button>
                )}
                {weekInfo && !weekInfo.isCurrentYear && (
                  <button 
                    onClick={() => {
                      setSelectedYear(weekInfo.today.year);
                      setShowCurrentWeekModal(false);
                    }} 
                    className={styles.saveButton}
                  >
                    <FiCalendar />
                    Switch to Year {weekInfo.today.year}
                  </button>
                )}
              </div>
            </div>
          </div>
        );
      })()}
    </div>
  );
};

export default StudentAttendanceSystem;
