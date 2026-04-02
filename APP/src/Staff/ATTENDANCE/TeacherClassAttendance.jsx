import React, { useState, useEffect } from 'react';
import axios from 'axios';
import { FiCalendar, FiUsers, FiCheckCircle, FiXCircle, FiClock, FiEdit2, FiX, FiSave, FiAlertCircle } from 'react-icons/fi';
import styles from './TeacherClassAttendance.module.css';

const TeacherClassAttendance = () => {
  const [assignedClass, setAssignedClass] = useState(null);
  const [selectedYear, setSelectedYear] = useState(2018);
  const [selectedWeekId, setSelectedWeekId] = useState('');
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

  const ethiopianMonths = [
    'Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit',
    'Megabit', 'Miazia', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'
  ];

  // Fetch teacher's assigned class
  useEffect(() => {
    fetchAssignedClass();
    fetchCurrentDate();
    fetchSettings();
  }, []);

  // Generate school weeks when settings and date are loaded
  useEffect(() => {
    if (settings && currentEthiopianDate && assignedClass) {
      generateSchoolWeeks();
    }
  }, [settings, currentEthiopianDate, selectedYear, assignedClass]);

  // Fetch attendance when week changes
  useEffect(() => {
    if (assignedClass && selectedWeekId) {
      fetchStudents();
      fetchAttendance();
    }
  }, [assignedClass, selectedWeekId]);

  // Recalculate summary whenever attendanceData changes
  useEffect(() => {
    if (attendanceData.length >= 0) {
      calculateSummary();
    }
  }, [attendanceData]);

  // Auto-refresh attendance data every 30 seconds
  useEffect(() => {
    if (!assignedClass || !selectedWeekId) return;

    const refreshInterval = setInterval(() => {
      console.log('Auto-refreshing attendance data...');
      fetchAttendance();
    }, 30000);

    return () => clearInterval(refreshInterval);
  }, [assignedClass, selectedWeekId]);

  const fetchAssignedClass = async () => {
    try {
      // Get teacher info from localStorage
      const staffUser = JSON.parse(localStorage.getItem('staffUser') || '{}');
      const globalStaffId = staffUser.global_staff_id;

      if (!globalStaffId) {
        setError('Staff ID not found. Please login again.');
        return;
      }

      // Fetch class teacher assignment
      const response = await axios.get('https://iqrab1.skoolific.com/api/class-teacher/assignments');
      const assignment = response.data.find(a => a.global_staff_id === globalStaffId);

      if (assignment) {
        setAssignedClass(assignment.assigned_class);
      } else {
        setError('You are not assigned as a class teacher yet.');
      }
    } catch (err) {
      console.error('Error fetching assigned class:', err);
      setError('Failed to fetch your assigned class');
    }
  };

  const fetchCurrentDate = async () => {
    try {
      const response = await axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/current-date');
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
      const response = await axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/settings');
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

  const fetchStudents = async () => {
    try {
      setIsLoading(true);
      const response = await axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/students', {
        params: { class: assignedClass }
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

  const generateSchoolWeeks = async () => {
    if (!settings || !settings.school_days) return;

    setIsLoading(true);
    const weeks = [];
    const schoolDays = settings.school_days;
    const daysPerWeek = schoolDays.length;

    let currentYear = selectedYear;
    let currentMonth = 1;
    let currentDay = 1;
    let weekNumber = 1;
    let daysChecked = 0;
    const maxDays = 365;

    while (daysChecked < maxDays && weekNumber <= 52) {
      try {
        const response = await axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/day-of-week', {
          params: { year: currentYear, month: currentMonth, day: currentDay }
        });

        if (response.data.success && response.data.data.dayOfWeek === 'Monday') {
          const weekDays = [];
          let tempYear = currentYear;
          let tempMonth = currentMonth;
          let tempDay = currentDay;
          let schoolDaysCollected = 0;
          let daysScanned = 0;

          while (schoolDaysCollected < daysPerWeek && daysScanned < 14) {
            const dayResponse = await axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/day-of-week', {
              params: { year: tempYear, month: tempMonth, day: tempDay }
            });

            if (dayResponse.data.success) {
              const dow = dayResponse.data.data.dayOfWeek;
              
              if (schoolDays.includes(dow)) {
                weekDays.push({
                  year: tempYear,
                  month: tempMonth,
                  day: tempDay,
                  dayOfWeek: dow
                });
                schoolDaysCollected++;
              }
            }

            tempDay++;
            daysScanned++;
            const daysInMonth = tempMonth === 13 ? 5 : 30;
            if (tempDay > daysInMonth) {
              tempDay = 1;
              tempMonth++;
              if (tempMonth > 13) {
                tempMonth = 1;
                tempYear++;
              }
            }
          }

          if (weekDays.length > 0) {
            const firstDay = weekDays[0];
            const lastDay = weekDays[weekDays.length - 1];
            
            let isCurrentWeek = false;
            
            if (currentEthiopianDate) {
              const exactMatch = weekDays.some(
                d => d.year === currentEthiopianDate.year && 
                     d.month === currentEthiopianDate.month && 
                     d.day === currentEthiopianDate.day
              );
              
              const withinRange = 
                currentEthiopianDate.year === firstDay.year &&
                currentEthiopianDate.month === firstDay.month &&
                currentEthiopianDate.day >= firstDay.day &&
                currentEthiopianDate.day <= lastDay.day;
              
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
            
            const weekData = {
              id: `week-${weekNumber}`,
              weekNumber,
              label: `${firstDay.day}/${firstDay.month} - ${lastDay.day}/${lastDay.month}`,
              days: weekDays,
              isCurrent: isCurrentWeek
            };
            
            weeks.push(weekData);
            weekNumber++;
          }

          currentDay += 7;
        } else {
          currentDay++;
        }
      } catch (err) {
        console.error('Error generating week:', err);
        currentDay++;
      }

      const daysInMonth = currentMonth === 13 ? 5 : 30;
      if (currentDay > daysInMonth) {
        currentDay -= daysInMonth;
        currentMonth++;
        if (currentMonth > 13) {
          currentMonth = 1;
          currentYear++;
          break;
        }
      }

      daysChecked++;
    }

    setSchoolWeeks(weeks);
    
    const currentWeek = weeks.find(w => w.isCurrent);
    if (currentWeek) {
      setSelectedWeekId(currentWeek.id);
    } else if (weeks.length > 0) {
      setSelectedWeekId(weeks[0].id);
    }
    
    setIsLoading(false);
  };

  const getSelectedWeek = () => {
    return schoolWeeks.find(w => w.id === selectedWeekId);
  };

  const fetchAttendance = async () => {
    const selectedWeek = getSelectedWeek();
    if (!selectedWeek || !selectedWeek.days) return;

    try {
      setIsLoading(true);
      
      const promises = selectedWeek.days.map(day =>
        axios.get('https://iqrab1.skoolific.com/api/academic/student-attendance/weekly', {
          params: {
            week: Math.ceil(day.day / 7),
            year: day.year,
            month: day.month,
            class: assignedClass
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
    
    setSummary({
      present,
      late,
      absent,
      leave,
      total: records.length
    });
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

      const response = await axios.put('https://iqrab1.skoolific.com/api/academic/student-attendance/update', {
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

    const showTime = (status === 'PRESENT' || status === 'LATE') && checkInTime;
    
    let timeDisplay = null;
    if (showTime) {
      const [hours, minutes] = checkInTime.split(':');
      const hour = parseInt(hours);
      const ampm = hour >= 12 ? 'PM' : 'AM';
      const hour12 = hour % 12 || 12;
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

  const selectedWeek = getSelectedWeek();

  // Show error if not assigned
  if (error && !assignedClass) {
    return (
      <div className={styles.container}>
        <div className={styles.errorContainer}>
          <FiAlertCircle size={48} />
          <h2>No Class Assigned</h2>
          <p>{error}</p>
          <p className={styles.hint}>Please contact the administrator to assign you as a class teacher.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1><FiUsers /> My Class Attendance</h1>
          <p>Manage attendance for your assigned class: <strong>{assignedClass}</strong></p>
        </div>
        {currentEthiopianDate && (
          <div className={styles.currentDate}>
            <FiCalendar />
            <span>Today: {ethiopianMonths[currentEthiopianDate.month - 1]} {currentEthiopianDate.day}, {currentEthiopianDate.year}</span>
          </div>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {/* Filters */}
      <div className={styles.filters}>
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
          <button
            onClick={() => fetchAttendance()}
            disabled={!assignedClass || !selectedWeekId}
            className={styles.refreshButton}
            title="Refresh attendance data"
          >
            🔄 Refresh
          </button>
        </div>
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
          💡 Click on any cell to manually edit the attendance status.
          Data auto-refreshes every 30 seconds.
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
    </div>
  );
};

export default TeacherClassAttendance;
