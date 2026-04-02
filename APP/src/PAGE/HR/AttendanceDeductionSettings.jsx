import React, { useState, useEffect } from 'react';
import axios from 'axios';
import styles from '../Finance/PaymentManagement.module.css';

const API_URL = import.meta.env.VITE_API_URL || 'https://iqrab1.skoolific.com';

const AttendanceDeductionSettings = () => {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editingRule, setEditingRule] = useState(null);

  const staffTypes = ['Teachers', 'Supportive Staff', 'Administrative Staff'];
  const deductionTypes = ['ABSENT', 'LATE', 'HALF_DAY', 'LATE_HALF_DAY', 'NO_CHECKOUT'];

  useEffect(() => {
    fetchSettings();
  }, []);

  const fetchSettings = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(
        `${API_URL}/api/hr/attendance/deduction-settings`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        setSettings(response.data.data);
      }
    } catch (error) {
      console.error('Error fetching settings:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (rule) => {
    setEditingRule(rule);
    setShowModal(true);
  };

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this deduction rule?')) {
      return;
    }

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.delete(
        `${API_URL}/api/hr/attendance/deduction-settings/${id}`,
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert('✅ Deduction rule deleted successfully!');
        fetchSettings();
      }
    } catch (error) {
      console.error('Error deleting rule:', error);
      alert('❌ Failed to delete rule');
    }
  };

  const getDeductionTypeLabel = (type) => {
    const labels = {
      'ABSENT': 'Absent (Full Day)',
      'LATE': 'Late Arrival',
      'HALF_DAY': 'Half Day',
      'LATE_HALF_DAY': 'Late + Half Day',
      'NO_CHECKOUT': 'No Check-Out'
    };
    return labels[type] || type;
  };

  const getDeductionTypeColor = (type) => {
    const colors = {
      'ABSENT': '#F44336',
      'LATE': '#FF9800',
      'HALF_DAY': '#2196F3',
      'LATE_HALF_DAY': '#9C27B0',
      'NO_CHECKOUT': '#FF5722'
    };
    return colors[type] || '#9E9E9E';
  };

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <div>
          <h1>Attendance Deduction Settings</h1>
          <p>Configure salary deductions based on attendance for different staff types</p>
        </div>
        <button 
          className={styles.recordButton} 
          onClick={() => { setEditingRule(null); setShowModal(true); }}
        >
          ➕ Add Deduction Rule
        </button>
      </div>

      {/* Summary Cards */}
      <div style={{ 
        display: 'grid', 
        gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', 
        gap: '20px', 
        marginBottom: '24px' 
      }}>
        {staffTypes.map(staffType => {
          const typeSettings = settings.filter(s => s.staff_type === staffType);
          const totalRules = typeSettings.length;
          const avgAbsentDeduction = typeSettings
            .filter(s => s.deduction_type === 'ABSENT')
            .reduce((sum, s) => sum + parseFloat(s.deduction_amount || 0), 0) / 
            (typeSettings.filter(s => s.deduction_type === 'ABSENT').length || 1);

          return (
            <div 
              key={staffType}
              style={{
                background: 'white',
                padding: '20px',
                borderRadius: '12px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.1)'
              }}
            >
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '8px' }}>
                {staffType}
              </div>
              <div style={{ fontSize: '28px', fontWeight: 700, color: '#333', marginBottom: '4px' }}>
                {totalRules}
              </div>
              <div style={{ fontSize: '12px', color: '#999' }}>
                Active Rules
              </div>
              {totalRules > 0 && (
                <div style={{ marginTop: '12px', paddingTop: '12px', borderTop: '1px solid #f0f0f0' }}>
                  <div style={{ fontSize: '12px', color: '#666' }}>
                    Avg. Absent Deduction
                  </div>
                  <div style={{ fontSize: '18px', fontWeight: 600, color: '#F44336' }}>
                    {avgAbsentDeduction.toFixed(2)} Birr
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Settings Table */}
      {loading ? (
        <div className={styles.loading}>Loading settings...</div>
      ) : (
        <div style={{ background: 'white', borderRadius: '12px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)', overflow: 'hidden' }}>
          <table style={{ width: '100%', fontSize: '14px' }}>
            <thead>
              <tr style={{ background: '#f5f5f5', borderBottom: '2px solid #e0e0e0' }}>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Staff Type</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Deduction Type</th>
                <th style={{ padding: '16px', textAlign: 'right', fontWeight: 600 }}>Deduction Amount</th>
                <th style={{ padding: '16px', textAlign: 'left', fontWeight: 600 }}>Description</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>Status</th>
                <th style={{ padding: '16px', textAlign: 'center', fontWeight: 600 }}>Actions</th>
              </tr>
            </thead>
            <tbody>
              {settings.length === 0 ? (
                <tr>
                  <td colSpan="6" className={styles.noData}>
                    No deduction rules configured. Click "Add Deduction Rule" to create one.
                  </td>
                </tr>
              ) : (
                settings.map(rule => (
                  <tr key={rule.id} style={{ borderBottom: '1px solid #f0f0f0' }}>
                    <td style={{ padding: '16px', fontWeight: 600 }}>
                      {rule.staff_type}
                    </td>
                    <td style={{ padding: '16px' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: getDeductionTypeColor(rule.deduction_type) + '20',
                        color: getDeductionTypeColor(rule.deduction_type),
                        fontSize: '13px',
                        fontWeight: 600
                      }}>
                        {getDeductionTypeLabel(rule.deduction_type)}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'right', fontWeight: 600, color: '#F44336' }}>
                      {parseFloat(rule.deduction_amount).toFixed(2)} Birr
                    </td>
                    <td style={{ padding: '16px', color: '#666' }}>
                      {rule.description || '-'}
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <span style={{
                        padding: '4px 12px',
                        borderRadius: '6px',
                        background: rule.is_active ? '#4CAF5020' : '#9E9E9E20',
                        color: rule.is_active ? '#4CAF50' : '#9E9E9E',
                        fontSize: '12px',
                        fontWeight: 600
                      }}>
                        {rule.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td style={{ padding: '16px', textAlign: 'center' }}>
                      <button
                        onClick={() => handleEdit(rule)}
                        style={{
                          padding: '6px 12px',
                          marginRight: '8px',
                          background: '#2196F3',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        ✏️ Edit
                      </button>
                      <button
                        onClick={() => handleDelete(rule.id)}
                        style={{
                          padding: '6px 12px',
                          background: '#F44336',
                          color: 'white',
                          border: 'none',
                          borderRadius: '6px',
                          cursor: 'pointer',
                          fontSize: '13px'
                        }}
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      )}

      {showModal && (
        <DeductionRuleModal
          rule={editingRule}
          staffTypes={staffTypes}
          deductionTypes={deductionTypes}
          onClose={() => { setShowModal(false); setEditingRule(null); }}
          onSuccess={() => { setShowModal(false); setEditingRule(null); fetchSettings(); }}
        />
      )}
    </div>
  );
};

const DeductionRuleModal = ({ rule, staffTypes, deductionTypes, onClose, onSuccess }) => {
  const [formData, setFormData] = useState({
    staffType: rule?.staff_type || '',
    deductionType: rule?.deduction_type || '',
    deductionAmount: rule?.deduction_amount || '',
    description: rule?.description || '',
    isActive: rule?.is_active !== undefined ? rule.is_active : true
  });
  const [loading, setLoading] = useState(false);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData({
      ...formData,
      [name]: type === 'checkbox' ? checked : value
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!formData.staffType || !formData.deductionType || !formData.deductionAmount) {
      alert('Please fill in all required fields');
      return;
    }

    if (parseFloat(formData.deductionAmount) < 0) {
      alert('Deduction amount must be positive');
      return;
    }

    setLoading(true);

    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const url = rule 
        ? `${API_URL}/api/hr/attendance/deduction-settings/${rule.id}`
        : `${API_URL}/api/hr/attendance/deduction-settings`;
      
      const method = rule ? 'put' : 'post';

      const response = await axios[method](
        url,
        {
          staffType: formData.staffType,
          deductionType: formData.deductionType,
          deductionAmount: parseFloat(formData.deductionAmount),
          description: formData.description,
          isActive: formData.isActive
        },
        { headers: { 'Authorization': `Bearer ${token}` } }
      );

      if (response.data.success) {
        alert(`✅ Deduction rule ${rule ? 'updated' : 'created'} successfully!`);
        onSuccess();
      }
    } catch (error) {
      console.error('Error saving rule:', error);
      alert(`❌ Failed to save rule: ${error.response?.data?.error || error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.modalOverlay} onClick={onClose}>
      <div className={styles.modal} onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px' }}>
        <div className={styles.modalHeader}>
          <h2>{rule ? 'Edit Deduction Rule' : 'Add Deduction Rule'}</h2>
          <button className={styles.closeButton} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className={styles.form}>
          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Staff Type *
            </label>
            <select
              name="staffType"
              value={formData.staffType}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }}
            >
              <option value="">Select staff type...</option>
              {staffTypes.map(type => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Deduction Type *
            </label>
            <select
              name="deductionType"
              value={formData.deductionType}
              onChange={handleChange}
              required
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }}
            >
              <option value="">Select deduction type...</option>
              <option value="ABSENT">Absent (Full Day)</option>
              <option value="LATE">Late Arrival</option>
              <option value="HALF_DAY">Half Day</option>
              <option value="LATE_HALF_DAY">Late + Half Day</option>
              <option value="NO_CHECKOUT">No Check-Out</option>
            </select>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Deduction Amount (Birr) *
            </label>
            <input
              type="number"
              name="deductionAmount"
              value={formData.deductionAmount}
              onChange={handleChange}
              required
              min="0"
              step="0.01"
              placeholder="Enter amount in Birr"
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px'
              }}
            />
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px' }}>
              This amount will be deducted from staff salary for each occurrence
            </div>
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'block', marginBottom: '8px', fontWeight: 600 }}>
              Description
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows="3"
              placeholder="Optional description or notes..."
              style={{
                width: '100%',
                padding: '10px',
                borderRadius: '8px',
                border: '1px solid #e0e0e0',
                fontSize: '14px',
                resize: 'vertical'
              }}
            />
          </div>

          <div style={{ marginBottom: '20px' }}>
            <label style={{ display: 'flex', alignItems: 'center', cursor: 'pointer' }}>
              <input
                type="checkbox"
                name="isActive"
                checked={formData.isActive}
                onChange={handleChange}
                style={{ marginRight: '8px', width: '18px', height: '18px' }}
              />
              <span style={{ fontWeight: 600 }}>Active Rule</span>
            </label>
            <div style={{ fontSize: '12px', color: '#666', marginTop: '4px', marginLeft: '26px' }}>
              Only active rules will be applied to salary calculations
            </div>
          </div>

          <div className={styles.modalActions}>
            <button type="button" onClick={onClose} className={styles.cancelButton}>
              Cancel
            </button>
            <button type="submit" disabled={loading} className={styles.submitButton}>
              {loading ? 'Saving...' : (rule ? 'Update Rule' : 'Create Rule')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default AttendanceDeductionSettings;
