import { useState, useEffect } from 'react';
import axios from 'axios';
import styles from './GuardianNotifications.module.css';

const GuardianNotifications = () => {
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [guardians, setGuardians] = useState([]);
  const [selectedGuardian, setSelectedGuardian] = useState('');
  const [previewData, setPreviewData] = useState(null);
  const [previewType, setPreviewType] = useState('');
  const [testEmail, setTestEmail] = useState('');

  useEffect(() => {
    fetchStatus();
    fetchGuardians();
  }, []);

  const fetchStatus = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://iqrab1.skoolific.com/api/guardian-notifications/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStatus(response.data.status);
    } catch (error) {
      console.error('Error fetching status:', error);
    }
  };

  const fetchGuardians = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await axios.get('https://iqrab1.skoolific.com/api/guardian-list/guardians', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setGuardians(response.data);
    } catch (error) {
      console.error('Error fetching guardians:', error);
    }
  };

  const handleSendAttendance = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://iqrab1.skoolific.com/api/guardian-notifications/send-attendance',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send attendance reports' });
    } finally {
      setLoading(false);
    }
  };

  const handleSendPayments = async () => {
    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://iqrab1.skoolific.com/api/guardian-notifications/send-payments',
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send payment summaries' });
    } finally {
      setLoading(false);
    }
  };

  const handleTestEmail = async () => {
    if (!testEmail) {
      setMessage({ type: 'error', text: 'Please enter an email address' });
      return;
    }

    setLoading(true);
    setMessage('');
    try {
      const token = localStorage.getItem('token');
      const response = await axios.post(
        'https://iqrab1.skoolific.com/api/guardian-notifications/test-email',
        { email: testEmail },
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setMessage({ type: 'success', text: response.data.message });
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to send test email' });
    } finally {
      setLoading(false);
    }
  };

  const handlePreview = async (type) => {
    if (!selectedGuardian) {
      setMessage({ type: 'error', text: 'Please select a guardian' });
      return;
    }

    setLoading(true);
    setMessage('');
    setPreviewData(null);
    try {
      const token = localStorage.getItem('token');
      const endpoint = type === 'attendance' 
        ? `https://iqrab1.skoolific.com/api/guardian-notifications/preview-attendance/${selectedGuardian}`
        : `https://iqrab1.skoolific.com/api/guardian-notifications/preview-payment/${selectedGuardian}`;
      
      const response = await axios.get(endpoint, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setPreviewData(response.data);
      setPreviewType(type);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'Failed to load preview' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1>📬 Guardian Notifications</h1>
        <p>Manage automated notifications for guardians</p>
      </div>

      {/* Status Card */}
      <div className={styles.statusCard}>
        <h2>🔧 System Status</h2>
        {status ? (
          <div className={styles.statusGrid}>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Service Running:</span>
              <span className={status.isRunning ? styles.statusActive : styles.statusInactive}>
                {status.isRunning ? '✅ Active' : '❌ Inactive'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>Email Configured:</span>
              <span className={status.emailConfigured ? styles.statusActive : styles.statusInactive}>
                {status.emailConfigured ? '✅ Yes' : '❌ No'}
              </span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>SMTP Host:</span>
              <span>{status.smtpHost}</span>
            </div>
            <div className={styles.statusItem}>
              <span className={styles.statusLabel}>SMTP User:</span>
              <span>{status.smtpUser}</span>
            </div>
          </div>
        ) : (
          <p>Loading status...</p>
        )}
      </div>

      {/* Message Display */}
      {message && (
        <div className={`${styles.message} ${styles[message.type]}`}>
          {message.text}
        </div>
      )}

      {/* Scheduled Notifications Info */}
      <div className={styles.infoCard}>
        <h2>📅 Scheduled Notifications</h2>
        <div className={styles.scheduleGrid}>
          <div className={styles.scheduleItem}>
            <div className={styles.scheduleIcon}>📊</div>
            <h3>Daily Attendance Reports</h3>
            <p>Sent automatically at <strong>4:00 PM</strong> every day</p>
            <ul>
              <li>Today's attendance status for all wards</li>
              <li>Check-in and check-out times</li>
              <li>Color-coded status indicators</li>
            </ul>
          </div>
          <div className={styles.scheduleItem}>
            <div className={styles.scheduleIcon}>💰</div>
            <h3>Monthly Payment Summaries</h3>
            <p>Sent automatically on <strong>1st of each month at 8:00 AM</strong></p>
            <ul>
              <li>Previous month's payment details</li>
              <li>Total due, paid, and balance</li>
              <li>Invoice breakdown per ward</li>
              <li>Payment reminders</li>
            </ul>
          </div>
        </div>
      </div>

      {/* Manual Triggers */}
      <div className={styles.actionsCard}>
        <h2>🚀 Manual Triggers</h2>
        <p>Send notifications immediately to all guardians</p>
        <div className={styles.buttonGroup}>
          <button 
            onClick={handleSendAttendance}
            disabled={loading}
            className={styles.btnPrimary}
          >
            {loading ? '⏳ Sending...' : '📊 Send Attendance Reports Now'}
          </button>
          <button 
            onClick={handleSendPayments}
            disabled={loading}
            className={styles.btnSecondary}
          >
            {loading ? '⏳ Sending...' : '💰 Send Payment Summaries Now'}
          </button>
        </div>
      </div>

      {/* Test Email */}
      <div className={styles.testCard}>
        <h2>🧪 Test Email Configuration</h2>
        <p>Send a test email to verify your SMTP settings</p>
        <div className={styles.testForm}>
          <input
            type="email"
            placeholder="Enter test email address"
            value={testEmail}
            onChange={(e) => setTestEmail(e.target.value)}
            className={styles.input}
          />
          <button 
            onClick={handleTestEmail}
            disabled={loading || !testEmail}
            className={styles.btnTest}
          >
            {loading ? '⏳ Sending...' : '📧 Send Test Email'}
          </button>
        </div>
      </div>

      {/* Preview */}
      <div className={styles.previewCard}>
        <h2>👁️ Preview Notifications</h2>
        <p>Preview how notifications will look for a specific guardian</p>
        <div className={styles.previewForm}>
          <select
            value={selectedGuardian}
            onChange={(e) => setSelectedGuardian(e.target.value)}
            className={styles.select}
          >
            <option value="">Select a guardian...</option>
            {guardians.map((guardian) => (
              <option key={guardian.guardian_username} value={guardian.guardian_username}>
                {guardian.guardian_name} ({guardian.guardian_username})
              </option>
            ))}
          </select>
          <div className={styles.buttonGroup}>
            <button 
              onClick={() => handlePreview('attendance')}
              disabled={loading || !selectedGuardian}
              className={styles.btnPreview}
            >
              Preview Attendance
            </button>
            <button 
              onClick={() => handlePreview('payment')}
              disabled={loading || !selectedGuardian}
              className={styles.btnPreview}
            >
              Preview Payment
            </button>
          </div>
        </div>

        {/* Preview Display */}
        {previewData && (
          <div className={styles.previewDisplay}>
            <h3>Preview for {previewData.guardian.name}</h3>
            <div className={styles.previewInfo}>
              <p><strong>Email:</strong> {previewData.guardian.phone}</p>
              <p><strong>Username:</strong> {previewData.guardian.username}</p>
            </div>
            
            {previewType === 'attendance' && previewData.attendanceData && (
              <div className={styles.previewContent}>
                <h4>Attendance Data:</h4>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Ward</th>
                      <th>Class</th>
                      <th>Status</th>
                      <th>Check In</th>
                      <th>Check Out</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.attendanceData.map((data, index) => (
                      <tr key={index}>
                        <td>{data.ward}</td>
                        <td>{data.class}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[data.attendance.status]}`}>
                            {data.attendance.status || 'Not Marked'}
                          </span>
                        </td>
                        <td>{data.attendance.check_in_time || '-'}</td>
                        <td>{data.attendance.check_out_time || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            {previewType === 'payment' && previewData.paymentData && (
              <div className={styles.previewContent}>
                <h4>Payment Data ({previewData.month}/{previewData.year}):</h4>
                <table className={styles.previewTable}>
                  <thead>
                    <tr>
                      <th>Ward</th>
                      <th>Class</th>
                      <th>Total Due</th>
                      <th>Paid</th>
                      <th>Balance</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {previewData.paymentData.map((data, index) => (
                      <tr key={index}>
                        <td>{data.ward}</td>
                        <td>{data.class}</td>
                        <td>ETB {data.totalAmount.toFixed(2)}</td>
                        <td>ETB {data.paidAmount.toFixed(2)}</td>
                        <td>ETB {data.balance.toFixed(2)}</td>
                        <td>
                          <span className={`${styles.badge} ${styles[data.status.toLowerCase().replace(' ', '')]}`}>
                            {data.status}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}

            <div className={styles.emailPreview}>
              <h4>Email Preview:</h4>
              <div 
                className={styles.emailContent}
                dangerouslySetInnerHTML={{ __html: previewData.emailPreview }}
              />
            </div>
          </div>
        )}
      </div>

      {/* Setup Instructions */}
      <div className={styles.setupCard}>
        <h2>⚙️ Setup Instructions</h2>
        <ol>
          <li>
            <strong>Configure Email:</strong> Update <code>backend/.env</code> with your SMTP credentials
            <pre>
              SMTP_HOST=smtp.gmail.com{'\n'}
              SMTP_PORT=587{'\n'}
              SMTP_USER=your-school-email@gmail.com{'\n'}
              SMTP_PASS=your-app-password
            </pre>
          </li>
          <li>
            <strong>Add Guardian Emails:</strong> Update the <code>guardian_phone</code> field in your database with email addresses
          </li>
          <li>
            <strong>Test Configuration:</strong> Use the "Test Email" feature above to verify your setup
          </li>
          <li>
            <strong>Preview Notifications:</strong> Select a guardian and preview how emails will look
          </li>
          <li>
            <strong>Monitor:</strong> Check server logs for automated sends at scheduled times
          </li>
        </ol>
      </div>
    </div>
  );
};

export default GuardianNotifications;
