import React, { useState, useEffect } from 'react';
import axios from 'axios';
import './SalaryManagement.css';
import AddSalaryCompleteModal from './components/AddSalaryCompleteModal';
import EditSalaryModal from './components/EditSalaryModal';
import AddDeductionModal from './components/AddDeductionModal';
import AddAllowanceModal from './components/AddAllowanceModal';
import AddRetentionModal from './components/AddRetentionModal';
import StaffDeductionsAllowancesModal from './components/StaffDeductionsAllowancesModal';
import { getCurrentEthiopianMonth } from '../../utils/ethiopianCalendar';

const API_URL = import.meta.env.VITE_API_URL || 'https://iqrab1.skoolific.com';

const SalaryManagement = () => {
  const [allStaff, setAllStaff] = useState([]);
  const [salaries, setSalaries] = useState([]);
  const [deductions, setDeductions] = useState([]);
  const [allowances, setAllowances] = useState([]);
  const [retentions, setRetentions] = useState([]);
  const [activeTab, setActiveTab] = useState('staff'); // staff, deductions, allowances, retentions
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedStaffForSalary, setSelectedStaffForSalary] = useState(null);
  
  // Modals
  const [showAddSalaryModal, setShowAddSalaryModal] = useState(false);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [showAddDeductionModal, setShowAddDeductionModal] = useState(false);
  const [showAddAllowanceModal, setShowAddAllowanceModal] = useState(false);
  const [showAddRetentionModal, setShowAddRetentionModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [currentEthiopianDate, setCurrentEthiopianDate] = useState(() => {
    return getCurrentEthiopianMonth();
  });

  useEffect(() => {
    fetchAllStaff();
    fetchSalaries();
    fetchDeductions();
    fetchAllowances();
    fetchRetentions();
    
    // Update Ethiopian date every minute
    const interval = setInterval(() => {
      setCurrentEthiopianDate(getCurrentEthiopianMonth());
    }, 60000);
    
    return () => clearInterval(interval);
  }, []);

  const fetchAllStaff = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const types = ['Teachers', 'Supportive Staff', 'Administrative Staff'];
      let allStaffMembers = [];
      
      for (const staffType of types) {
        try {
          const classesResponse = await axios.get(
            `${API_URL}/staff/classes?staffType=${encodeURIComponent(staffType)}`
          );
          
          for (const className of classesResponse.data) {
            try {
              const dataResponse = await axios.get(
                `${API_URL}/staff/data/${staffType}/${className}`
              );
              const staffData = dataResponse.data.data || [];
              
              const transformedStaff = staffData.map(staff => ({
                id: staff.global_staff_id || staff.id,
                employeeNumber: staff.global_staff_id || staff.id,
                firstName: (staff.full_name || staff.name || '').split(' ')[0] || '',
                lastName: (staff.full_name || staff.name || '').split(' ').slice(1).join(' ') || '',
                fullName: staff.full_name || staff.name || 'Unknown',
                email: staff.email || '',
                phone: staff.phone || '',
                staffType: staffType,
                role: staff.role || staff.position || staffType,
                profilePhotoUrl: staff.image_staff || null
              }));
              
              allStaffMembers = [...allStaffMembers, ...transformedStaff];
            } catch (err) {
              console.log(`Error fetching ${className}:`, err.message);
            }
          }
        } catch (err) {
          console.log(`No data for: ${staffType}`);
        }
      }
      
      setAllStaff(allStaffMembers);
    } catch (err) {
      setError('Failed to fetch staff members');
      console.error('Error fetching staff:', err);
    } finally {
      setLoading(false);
    }
  };

  const fetchSalaries = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      
      const response = await axios.get(`${API_URL}/hr/salary/all-salaries`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.data.success) {
        setSalaries(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching salaries:', err);
    }
  };

  const fetchDeductions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/hr/salary/deductions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setDeductions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching deductions:', err);
    }
  };

  const fetchAllowances = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/hr/salary/allowances`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setAllowances(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching allowances:', err);
    }
  };

  const fetchRetentions = async () => {
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      const response = await axios.get(`${API_URL}/hr/salary/retentions`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (response.data.success) {
        setRetentions(response.data.data);
      }
    } catch (err) {
      console.error('Error fetching retentions:', err);
    }
  };

  const handleDeleteDeduction = async (id) => {
    if (!window.confirm('Are you sure you want to delete this deduction?')) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await axios.delete(`${API_URL}/hr/salary/deductions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchDeductions();
    } catch (err) {
      alert('Failed to delete deduction');
    }
  };

  const handleDeleteAllowance = async (id) => {
    if (!window.confirm('Are you sure you want to delete this allowance?')) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await axios.delete(`${API_URL}/hr/salary/allowances/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchAllowances();
    } catch (err) {
      alert('Failed to delete allowance');
    }
  };

  const handleDeleteRetention = async (id) => {
    if (!window.confirm('Are you sure you want to delete this retention benefit?')) return;
    try {
      const token = localStorage.getItem('authToken') || localStorage.getItem('token');
      await axios.delete(`${API_URL}/hr/salary/retentions/${id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRetentions();
    } catch (err) {
      alert('Failed to delete retention benefit');
    }
  };

  // Check if staff has salary
  const staffHasSalary = (staffId) => {
    // Convert both to strings for comparison
    const staffIdStr = String(staffId);
    const hasSalary = salaries.some(salary => String(salary.staffId) === staffIdStr);
    console.log(`🔍 Checking salary for staff ${staffIdStr}:`, hasSalary, 'Salaries:', salaries.map(s => String(s.staffId)));
    return hasSalary;
  };

  // Get salary for staff
  const getStaffSalary = (staffId) => {
    const staffIdStr = String(staffId);
    return salaries.find(salary => String(salary.staffId) === staffIdStr);
  };

  // Handle add salary for specific staff
  const handleAddSalaryForStaff = (staff) => {
    // Check if staff already has a salary
    const existingSalary = salaries.find(s => s.staffId === staff.id);
    
    console.log('🔍 handleAddSalaryForStaff called');
    console.log('🔍 staff:', staff);
    console.log('🔍 staff.id:', staff.id);
    console.log('🔍 all salaries:', salaries);
    console.log('🔍 existingSalary found:', existingSalary);
    
    setSelectedStaffForSalary({
      ...staff,
      existingSalary: existingSalary || null
    });
    setShowAddSalaryModal(true);
  };

  // Handle edit salary for specific staff
  const handleEditSalaryForStaff = (staff) => {
    console.log('✏️ handleEditSalaryForStaff called');
    console.log('✏️ staff:', staff);
    console.log('✏️ staff.id:', staff.id, 'type:', typeof staff.id);
    console.log('✏️ all salaries:', salaries);
    
    // Try to find salary with different comparison methods
    const existingSalary1 = salaries.find(s => s.staffId === staff.id);
    const existingSalary2 = salaries.find(s => String(s.staffId) === String(staff.id));
    const existingSalary3 = salaries.find(s => parseInt(s.staffId) === parseInt(staff.id));
    
    console.log('✏️ existingSalary (===):', existingSalary1);
    console.log('✏️ existingSalary (String):', existingSalary2);
    console.log('✏️ existingSalary (parseInt):', existingSalary3);
    
    const existingSalary = existingSalary1 || existingSalary2 || existingSalary3;
    
    if (!existingSalary) {
      console.error('❌ No salary found!');
      console.error('❌ Looking for staff.id:', staff.id);
      console.error('❌ Available staffIds in salaries:', salaries.map(s => ({id: s.staffId, type: typeof s.staffId})));
      alert('No salary found for this staff member');
      return;
    }
    
    console.log('✅ Found salary:', existingSalary);
    
    setSelectedStaffForSalary({
      ...staff,
      existingSalary: existingSalary
    });
    setShowEditSalaryModal(true);
  };

  // Handle add deduction for specific staff
  const handleAddDeductionForStaff = (staff) => {
    setSelectedStaffForSalary(staff);
    setShowAddDeductionModal(true);
  };

  // Handle add allowance for specific staff
  const handleAddAllowanceForStaff = (staff) => {
    setSelectedStaffForSalary(staff);
    setShowAddAllowanceModal(true);
  };

  // Handle view details for specific staff
  const handleViewDetails = (staff) => {
    setSelectedStaffForSalary(staff);
    setShowDetailsModal(true);
  };

  return (
    <div className="salary-management">
      <div className="salary-header">
        <div>
          <h1>HR & Staff Salary Management</h1>
          <p>Manage staff salaries, deductions, allowances, and retention benefits</p>
          <div style={{ 
            marginTop: '10px', 
            padding: '8px 15px', 
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
            color: 'white', 
            borderRadius: '8px',
            display: 'inline-block',
            fontSize: '0.9em',
            fontWeight: '500'
          }}>
            📅 Current Ethiopian Date: {currentEthiopianDate.day} {currentEthiopianDate.monthName} {currentEthiopianDate.year}
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div className="tab-navigation">
        <button 
          className={`tab-btn ${activeTab === 'staff' ? 'active' : ''}`}
          onClick={() => setActiveTab('staff')}
        >
          👥 All Staff
        </button>
        <button 
          className={`tab-btn ${activeTab === 'deductions' ? 'active' : ''}`}
          onClick={() => setActiveTab('deductions')}
        >
          📉 Deductions
        </button>
        <button 
          className={`tab-btn ${activeTab === 'allowances' ? 'active' : ''}`}
          onClick={() => setActiveTab('allowances')}
        >
          📈 Allowances
        </button>
        <button 
          className={`tab-btn ${activeTab === 'retentions' ? 'active' : ''}`}
          onClick={() => setActiveTab('retentions')}
        >
          🎯 Staff Retention
        </button>
      </div>

      {/* Add Button for other tabs */}
      {activeTab !== 'staff' && (
        <div className="action-bar">
          {activeTab === 'deductions' && (
            <button className="btn-add-main" onClick={() => setShowAddDeductionModal(true)}>
              ➕ Add Deduction
            </button>
          )}
          {activeTab === 'allowances' && (
            <button className="btn-add-main" onClick={() => setShowAddAllowanceModal(true)}>
              ➕ Add Allowance
            </button>
          )}
          {activeTab === 'retentions' && (
            <button className="btn-add-main" onClick={() => setShowAddRetentionModal(true)}>
              ➕ Add Retention Benefit
            </button>
          )}
        </div>
      )}

      {/* Refresh button for staff tab */}
      {activeTab === 'staff' && (
        <div className="action-bar">
          <button 
            className="btn-refresh" 
            onClick={() => {
              fetchAllStaff();
              fetchSalaries();
            }}
          >
            🔄 Refresh
          </button>
        </div>
      )}

      {/* Content Area */}
      {loading ? (
        <div className="loading">Loading...</div>
      ) : error ? (
        <div className="error">{error}</div>
      ) : (
        <>
          {/* All Staff Tab */}
          {activeTab === 'staff' && (
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Photo</th>
                    <th>Staff Name</th>
                    <th>Staff Type</th>
                    <th>Role</th>
                    <th>Account Number</th>
                    <th>Salary Status</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allStaff.length === 0 ? (
                    <tr>
                      <td colSpan="7" style={{ textAlign: 'center', padding: '40px' }}>
                        No staff members found.
                      </td>
                    </tr>
                  ) : (
                    allStaff.map(staff => {
                      const hasSalary = staffHasSalary(staff.id);
                      const salary = getStaffSalary(staff.id);
                      
                      return (
                        <tr key={staff.id}>
                          <td>
                            {staff.profilePhotoUrl ? (
                              <img 
                                src={`${API_URL}/uploads/${staff.profilePhotoUrl}`}
                                alt={staff.fullName}
                                className="staff-photo"
                                onError={(e) => e.target.style.display = 'none'}
                              />
                            ) : (
                              <div className="staff-photo-placeholder">
                                {staff.firstName.charAt(0)}{staff.lastName.charAt(0)}
                              </div>
                            )}
                          </td>
                          <td>
                            <strong>{staff.fullName}</strong>
                            <br />
                            <small style={{ color: '#7f8c8d' }}>ID: {staff.employeeNumber}</small>
                          </td>
                          <td>
                            <span className={`staff-type-badge ${staff.staffType.toLowerCase().replace(' ', '-')}`}>
                              {staff.staffType}
                            </span>
                          </td>
                          <td>{staff.role}</td>
                          <td>
                            {hasSalary && salary?.accountName ? (
                              <span style={{ fontWeight: '500', color: '#2c3e50' }}>
                                {salary.accountName}
                              </span>
                            ) : (
                              <span style={{ color: '#95a5a6' }}>-</span>
                            )}
                          </td>
                          <td>
                            {hasSalary ? (
                              <div className="salary-info">
                                <span className="salary-badge has-salary">✓ Salary Added</span>
                                <div className="salary-details">
                                  <small>Base: {parseFloat(salary.baseSalary).toFixed(2)} Birr</small>
                                  <small>Net: {parseFloat(salary.netSalary).toFixed(2)} Birr</small>
                                </div>
                              </div>
                            ) : (
                              <span className="salary-badge no-salary">✗ No Salary</span>
                            )}
                          </td>
                          <td>
                            {!hasSalary ? (
                              <button 
                                className="btn-add-salary"
                                onClick={() => handleAddSalaryForStaff(staff)}
                              >
                                ➕ Add Salary
                              </button>
                            ) : (
                              <div className="action-buttons-group">
                                <button 
                                  className="btn-edit-salary"
                                  onClick={() => handleEditSalaryForStaff(staff)}
                                >
                                  ✏️ Edit Salary
                                </button>
                                <button 
                                  className="btn-add-deduction"
                                  onClick={() => handleAddDeductionForStaff(staff)}
                                >
                                  📉 Deductions
                                </button>
                                <button 
                                  className="btn-add-allowance"
                                  onClick={() => handleAddAllowanceForStaff(staff)}
                                >
                                  📈 Allowances
                                </button>
                                <button 
                                  className="btn-view-details"
                                  onClick={() => handleViewDetails(staff)}
                                >
                                  👁️ View Details
                                </button>
                              </div>
                            )}
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          )}

          {/* Deductions Tab */}
          {activeTab === 'deductions' && (
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Deduction Type</th>
                    <th>Amount</th>
                    <th>Ethiopian Month</th>
                    <th>Period</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {deductions.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No deductions added yet. Click "Add Deduction" to get started.
                      </td>
                    </tr>
                  ) : (
                    deductions.map(deduction => (
                      <tr key={deduction.id}>
                        <td>{deduction.staff_name}</td>
                        <td>
                          <span className="deduction-badge">
                            {deduction.deduction_type.charAt(0).toUpperCase() + deduction.deduction_type.slice(1)}
                          </span>
                        </td>
                        <td>${parseFloat(deduction.amount).toFixed(2)}</td>
                        <td>
                          <strong>{deduction.ethiopian_month} {deduction.ethiopian_year}</strong>
                        </td>
                        <td>
                          <small>{deduction.start_date} to {deduction.end_date}</small>
                        </td>
                        <td>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteDeduction(deduction.id)}
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

          {/* Allowances Tab */}
          {activeTab === 'allowances' && (
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Allowance Name</th>
                    <th>Amount</th>
                    <th>Ethiopian Month</th>
                    <th>Period</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {allowances.length === 0 ? (
                    <tr>
                      <td colSpan="6" style={{ textAlign: 'center', padding: '40px' }}>
                        No allowances added yet. Click "Add Allowance" to get started.
                      </td>
                    </tr>
                  ) : (
                    allowances.map(allowance => (
                      <tr key={allowance.id}>
                        <td>{allowance.staff_name}</td>
                        <td>
                          <span className="allowance-badge">
                            {allowance.allowance_name}
                          </span>
                        </td>
                        <td>${parseFloat(allowance.amount).toFixed(2)}</td>
                        <td>
                          <strong>{allowance.ethiopian_month} {allowance.ethiopian_year}</strong>
                        </td>
                        <td>
                          <small>{allowance.start_date} to {allowance.end_date}</small>
                        </td>
                        <td>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteAllowance(allowance.id)}
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

          {/* Retentions Tab */}
          {activeTab === 'retentions' && (
            <div className="staff-table-container">
              <table className="staff-table">
                <thead>
                  <tr>
                    <th>Staff Name</th>
                    <th>Retention Type</th>
                    <th>Amount</th>
                    <th>Date Added</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {retentions.length === 0 ? (
                    <tr>
                      <td colSpan="5" style={{ textAlign: 'center', padding: '40px' }}>
                        No retention benefits added yet. Click "Add Retention Benefit" to get started.
                      </td>
                    </tr>
                  ) : (
                    retentions.map(retention => (
                      <tr key={retention.id}>
                        <td>{retention.staff_name}</td>
                        <td>
                          <span className="retention-badge">
                            {retention.retention_type.replace('_', ' ').split(' ').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' ')}
                          </span>
                        </td>
                        <td>${parseFloat(retention.amount).toFixed(2)}</td>
                        <td>{new Date(retention.created_at).toLocaleDateString()}</td>
                        <td>
                          <button 
                            className="btn-delete"
                            onClick={() => handleDeleteRetention(retention.id)}
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
        </>
      )}

      {/* Modals */}
      {showAddSalaryModal && (
        <AddSalaryCompleteModal
          preSelectedStaff={selectedStaffForSalary}
          onClose={() => {
            setShowAddSalaryModal(false);
            setSelectedStaffForSalary(null);
            // Refresh both salaries and staff list
            fetchSalaries().then(() => {
              fetchAllStaff();
            });
          }}
        />
      )}

      {showEditSalaryModal && selectedStaffForSalary && (
        <EditSalaryModal
          staff={selectedStaffForSalary}
          existingSalary={selectedStaffForSalary.existingSalary}
          onClose={() => {
            setShowEditSalaryModal(false);
            setSelectedStaffForSalary(null);
          }}
          onSuccess={() => {
            fetchSalaries().then(() => {
              fetchAllStaff();
            });
          }}
        />
      )}

      {showAddDeductionModal && (
        <AddDeductionModal
          preSelectedStaff={selectedStaffForSalary}
          onClose={() => {
            setShowAddDeductionModal(false);
            setSelectedStaffForSalary(null);
            fetchDeductions();
          }}
        />
      )}

      {showAddAllowanceModal && (
        <AddAllowanceModal
          preSelectedStaff={selectedStaffForSalary}
          onClose={() => {
            setShowAddAllowanceModal(false);
            setSelectedStaffForSalary(null);
            fetchAllowances();
          }}
        />
      )}

      {showAddRetentionModal && (
        <AddRetentionModal
          onClose={() => {
            setShowAddRetentionModal(false);
            fetchRetentions();
          }}
        />
      )}

      {showDetailsModal && selectedStaffForSalary && (
        <StaffDeductionsAllowancesModal
          staff={selectedStaffForSalary}
          onClose={() => {
            setShowDetailsModal(false);
            setSelectedStaffForSalary(null);
          }}
        />
      )}
    </div>
  );
};

export default SalaryManagement;
