import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../Finance/PaymentManagement.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://iqrab1.skoolific.com';

const ShiftTimeSettings = () => {
  const [shifts, setShifts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchShiftSettings();
  }, []);

  const fetchShiftSettings = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/hr/shift-settings`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setShifts(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching shift settings:', error);
      setMessage('Failed to load shift settings');
    } finally {
      setLoading(false);
    }
  };

  const handleInputChange = (shiftName, field, value) => {
    setShifts(prevShifts =>
      prevShifts.map(shift =>
        shift.shift_name === shiftName
          ? { ...shift, [field]: value }
          : shift
      )
    );
  };

  const handleSave = async (shiftName) => {
    setSaving(true);
    setMessage('');

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const shift = shifts.find(s => s.shift_name === shiftName);

      const response = await axios.put(
        `${API_URL}/hr/shift-settings/${shiftName}`,
        {
          check_in_time: shift.check_in_time,
          check_out_time: shift.check_out_time,
          late_threshold: shift.late_threshold,
          minimum_work_hours: parseFloat(shift.minimum_work_hours),
          half_day_threshold: parseFloat(shift.half_day_threshold),
          grace_period_minutes: parseInt(shift.grace_period_minutes)
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setMessage(`✅ ${shiftName === 'shift1' ? 'Shift 1' : 'Shift 2'} settings saved successfully!`);
        setTimeout(() => setMessage(''), 3000);
      }
    } catch (error) {
      console.error('Error saving shift settings:', error);
      setMessage('❌ Failed to save settings');
    } finally {
      setSaving(false);
    }
  };

  const formatTime12Hour = (time24) => {
    if (!time24) return '';
    const [hours, minutes] = time24.split(':');
    const hour = parseInt(hours);
    const ampm = hour >= 12 ? 'PM' : 'AM';
    const hour12 = hour % 12 || 12;
    return `${hour12}:${minutes} ${ampm}`;
  };

  if (loading) {
    return <div className={styles.loading}>Loading shift settings...</div>;
  }

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>⏰ Shift Time Settings</h1>
        <p>Configure check-in/out times for Shift 1 and Shift 2</p>
      </div>

      {message && (
        <div className={message.includes('✅') ? styles.successMessage : styles.errorMessage}>
          {message}
        </div>
      )}

      <div className={styles.shiftsGrid}>
        {shifts.map((shift) => (
          <div key={shift.shift_name} className={styles.shiftCard}>
            <div className={styles.shiftHeader}>
              <h2>
                {shift.shift_name === 'shift1' ? '🌅 Shift 1 (Morning)' : '🌆 Shift 2 (Afternoon)'}
              </h2>
            </div>

            <div className={styles.formGrid}>
              <div className={styles.formGroup}>
                <label>Check-In Time</label>
                <input
                  type="time"
                  value={shift.check_in_time}
                  onChange={(e) => handleInputChange(shift.shift_name, 'check_in_time', e.target.value)}
                  className={styles.input}
                />
                <small>{formatTime12Hour(shift.check_in_time)}</small>
              </div>

              <div className={styles.formGroup}>
                <label>Late Threshold</label>
                <input
                  type="time"
                  value={shift.late_threshold}
                  onChange={(e) => handleInputChange(shift.shift_name, 'late_threshold', e.target.value)}
                  className={styles.input}
                />
                <small>{formatTime12Hour(shift.late_threshold)}</small>
              </div>

              <div className={styles.formGroup}>
                <label>Check-Out Time</label>
                <input
                  type="time"
                  value={shift.check_out_time}
                  onChange={(e) => handleInputChange(shift.shift_name, 'check_out_time', e.target.value)}
                  className={styles.input}
                />
                <small>{formatTime12Hour(shift.check_out_time)}</small>
              </div>

              <div className={styles.formGroup}>
                <label>Grace Period (minutes)</label>
                <input
                  type="number"
                  value={shift.grace_period_minutes}
                  onChange={(e) => handleInputChange(shift.shift_name, 'grace_period_minutes', e.target.value)}
                  className={styles.input}
                  min="0"
                  max="60"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Minimum Work Hours</label>
                <input
                  type="number"
                  step="0.5"
                  value={shift.minimum_work_hours}
                  onChange={(e) => handleInputChange(shift.shift_name, 'minimum_work_hours', e.target.value)}
                  className={styles.input}
                  min="0"
                  max="12"
                />
              </div>

              <div className={styles.formGroup}>
                <label>Half-Day Threshold (hours)</label>
                <input
                  type="number"
                  step="0.5"
                  value={shift.half_day_threshold}
                  onChange={(e) => handleInputChange(shift.shift_name, 'half_day_threshold', e.target.value)}
                  className={styles.input}
                  min="0"
                  max="8"
                />
              </div>
            </div>

            <div className={styles.buttonGroup}>
              <button
                onClick={() => handleSave(shift.shift_name)}
                disabled={saving}
                className={styles.saveButton}
              >
                {saving ? 'Saving...' : `Save ${shift.shift_name === 'shift1' ? 'Shift 1' : 'Shift 2'} Settings`}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className={styles.infoBox}>
        <h3>ℹ️ How Shifts Work</h3>
        <ul>
          <li><strong>Shift 1:</strong> Typically morning shift (e.g., 8:00 AM - 5:00 PM)</li>
          <li><strong>Shift 2:</strong> Typically afternoon/evening shift (e.g., 2:00 PM - 10:00 PM)</li>
          <li><strong>Both Shifts:</strong> Staff assigned to "Both" will have 2 separate check-in/out records per day</li>
          <li><strong>Late Threshold:</strong> Time after which attendance is marked as "Late"</li>
          <li><strong>Grace Period:</strong> Extra minutes allowed before marking as late</li>
        </ul>
      </div>
    </div>
  );
};

export default ShiftTimeSettings;
