// PAGE/CreateMarklist/SubjectMappingSetup.jsx
import React, { useState, useEffect } from 'react';
import styles from './CreateMarklist/CreateMarklist.module.css';

const API_BASE_URL = 'https://bilal.skoolific.com/api';

const SubjectConfiguration = ({ onSubjectsConfigured }) => {
  const [subjects, setSubjects] = useState([]);
  const [newSubjectName, setNewSubjectName] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editingName, setEditingName] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    fetchSubjects();
  }, []);

  const fetchSubjects = async () => {
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/subjects`);
      const data = await res.json();
      setSubjects(data);
    } catch (err) {
      console.error('Error fetching subjects:', err);
    }
  };

  const handleAdd = async () => {
    if (!newSubjectName.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/add-subject`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_name: newSubjectName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setNewSubjectName('');
        setMessage('Subject added!');
        fetchSubjects();
        if (onSubjectsConfigured) onSubjectsConfigured();
      } else {
        setMessage(data.error || 'Failed to add subject');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = async (id) => {
    if (!editingName.trim()) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/update-subject/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ subject_name: editingName.trim() }),
      });
      const data = await res.json();
      if (res.ok) {
        setEditingId(null);
        setEditingName('');
        setMessage('Subject updated!');
        fetchSubjects();
      } else {
        setMessage(data.error || 'Failed to update');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id, name) => {
    if (!window.confirm(`Delete "${name}"? This cannot be undone.`)) return;
    setLoading(true);
    setMessage('');
    try {
      const res = await fetch(`${API_BASE_URL}/mark-list/delete-subject/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (res.ok) {
        setMessage('Subject deleted!');
        fetchSubjects();
      } else {
        setMessage(data.error || 'Failed to delete');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>📚</div>
        <h2>Subject Configuration</h2>
        <p>Add, edit, or remove subjects. Existing subjects are preserved.</p>
      </div>

      {/* Add new subject */}
      <div className={styles.inputGroup}>
        <label>Add New Subject</label>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <input
            type="text"
            value={newSubjectName}
            onChange={(e) => setNewSubjectName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
            placeholder="Enter subject name"
            className={styles.modernInput}
            style={{ flex: 1 }}
          />
          <button
            onClick={handleAdd}
            disabled={loading || !newSubjectName.trim()}
            className={styles.primaryButton}
            style={{ whiteSpace: 'nowrap' }}
          >
            + Add
          </button>
        </div>
      </div>

      {/* Existing subjects list */}
      {subjects.length > 0 && (
        <div className={styles.inputGroup}>
          <label>Current Subjects ({subjects.length})</label>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            {subjects.map((s) => (
              <div key={s.id} style={{
                display: 'flex', alignItems: 'center', gap: '0.5rem',
                background: '#f8f9fa', borderRadius: '8px', padding: '0.5rem 0.75rem'
              }}>
                {editingId === s.id ? (
                  <>
                    <input
                      type="text"
                      value={editingName}
                      onChange={(e) => setEditingName(e.target.value)}
                      onKeyDown={(e) => e.key === 'Enter' && handleEdit(s.id)}
                      className={styles.modernInput}
                      style={{ flex: 1, padding: '0.4rem 0.6rem' }}
                      autoFocus
                    />
                    <button onClick={() => handleEdit(s.id)} disabled={loading}
                      style={{ background: '#10b981', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Save
                    </button>
                    <button onClick={() => { setEditingId(null); setEditingName(''); }}
                      style={{ background: '#e5e7eb', color: '#333', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Cancel
                    </button>
                  </>
                ) : (
                  <>
                    <span style={{ flex: 1, fontWeight: 500 }}>{s.subject_name}</span>
                    <button onClick={() => { setEditingId(s.id); setEditingName(s.subject_name); }}
                      style={{ background: '#3b82f6', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Edit
                    </button>
                    <button onClick={() => handleDelete(s.id, s.subject_name)} disabled={loading}
                      style={{ background: '#ef4444', color: 'white', border: 'none', borderRadius: '6px', padding: '0.4rem 0.75rem', cursor: 'pointer', fontSize: '0.85rem' }}>
                      Delete
                    </button>
                  </>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {message && (
        <div className={`${styles.message} ${message.includes('!') ? styles.success : styles.error}`}>
          {message}
        </div>
      )}

      {subjects.length > 0 && (
        <div className={styles.buttonGroup}>
          <button onClick={() => onSubjectsConfigured && onSubjectsConfigured()} className={styles.primaryButton}>
            Next: Class Mapping →
          </button>
        </div>
      )}
    </div>
  );
};

const ClassSubjectMapping = ({ onMappingCompleted }) => {
  const [classes, setClasses] = useState([]);
  const [subjects, setSubjects] = useState([]);
  const [mappings, setMappings] = useState({});
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [existingMappings, setExistingMappings] = useState([]);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      const [classesRes, subjectsRes, mappingsRes] = await Promise.all([
        fetch(`${API_BASE_URL}/mark-list/classes`),
        fetch(`${API_BASE_URL}/mark-list/subjects`),
        fetch(`${API_BASE_URL}/mark-list/subjects-classes`)
      ]);
      const [classesData, subjectsData, mappingsData] = await Promise.all([
        classesRes.json(), subjectsRes.json(), mappingsRes.json()
      ]);
      setClasses(classesData);
      setSubjects(subjectsData);
      setExistingMappings(mappingsData);
      const mappingState = {};
      mappingsData.forEach(m => { mappingState[`${m.class_name}-${m.subject_name}`] = true; });
      setMappings(mappingState);
    } catch (err) {
      setMessage('Error loading data: ' + err.message);
    }
  };

  const handleMappingChange = (className, subjectName, isChecked) => {
    setMappings(prev => ({ ...prev, [`${className}-${subjectName}`]: isChecked }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage('');
    try {
      const mappingsArray = Object.entries(mappings)
        .filter(([, v]) => v)
        .map(([key]) => {
          const idx = key.indexOf('-');
          return { className: key.substring(0, idx), subjectName: key.substring(idx + 1) };
        });
      const res = await fetch(`${API_BASE_URL}/mark-list/map-subjects-classes`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ mappings: mappingsArray }),
      });
      const data = await res.json();
      if (res.ok) {
        setMessage('Mappings saved!');
        fetchData();
        if (onMappingCompleted) onMappingCompleted();
      } else {
        setMessage(data.error || 'Failed to save');
      }
    } catch (err) {
      setMessage('Error: ' + err.message);
    } finally {
      setLoading(false);
    }
  };

  if (classes.length === 0 || subjects.length === 0) {
    return (
      <div className={styles.content}>
        <div className={styles.emptyState}>
          <h3>No Data Available</h3>
          <p>{classes.length === 0 ? 'No classes found.' : 'No subjects found. Please add subjects first.'}</p>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.content}>
      <div className={styles.stepHeader}>
        <div className={styles.stepIcon}>🔄</div>
        <h2>Class-Subject Mapping</h2>
        <p>Select which subjects are taught in each class</p>
      </div>
      <form onSubmit={handleSubmit}>
        <div className={styles.tableContainer}>
          <div className={styles.tableScroll}>
            <table className={styles.modernTable}>
              <thead>
                <tr>
                  <th className={styles.classHeader}>Classes / Subjects</th>
                  {subjects.map(s => <th key={s.id} className={styles.subjectHeader}>{s.subject_name}</th>)}
                </tr>
              </thead>
              <tbody>
                {classes.map(className => (
                  <tr key={className}>
                    <td className={styles.classCell}>{className}</td>
                    {subjects.map(s => (
                      <td key={s.id} className={styles.subjectCell}>
                        <label className={styles.radioContainer}>
                          <input
                            type="checkbox"
                            checked={mappings[`${className}-${s.subject_name}`] || false}
                            onChange={(e) => handleMappingChange(className, s.subject_name, e.target.checked)}
                          />
                          <span className={styles.radioCheckmark}></span>
                        </label>
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
        {message && (
          <div className={`${styles.message} ${message.includes('!') ? styles.success : styles.error}`}>{message}</div>
        )}
        <div className={styles.buttonGroup}>
          <button type="submit" disabled={loading} className={styles.primaryButton}>
            {loading ? 'Saving...' : 'Save Mappings'}
          </button>
        </div>
      </form>
    </div>
  );
};

const SubjectMappingSetup = ({ onComplete }) => {
  const [currentStep, setCurrentStep] = useState(1);
  const [subjectsConfigured, setSubjectsConfigured] = useState(false);
  const [mappingCompleted, setMappingCompleted] = useState(false);

  const steps = [
    { number: 1, title: 'Subject Setup', completed: subjectsConfigured },
    { number: 2, title: 'Class Mapping', completed: mappingCompleted }
  ];

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <h1 className={styles.title}>Subject & Class Setup</h1>
        <p>Configure subjects and map them to classes</p>
        <div className={styles.progressSteps}>
          {steps.map((step, index) => (
            <React.Fragment key={step.number}>
              <button
                className={`${styles.stepIndicator} ${step.completed ? styles.completed : currentStep === step.number ? styles.active : ''}`}
                onClick={() => setCurrentStep(step.number)}
              >
                <span className={styles.stepIconInner}>{step.completed ? '✓' : step.number}</span>
              </button>
              {index < steps.length - 1 && <div className={styles.stepConnector}></div>}
            </React.Fragment>
          ))}
        </div>
      </div>
      {currentStep === 1 && (
        <SubjectConfiguration onSubjectsConfigured={() => { setSubjectsConfigured(true); setCurrentStep(2); }} />
      )}
      {currentStep === 2 && (
        <ClassSubjectMapping onMappingCompleted={() => { setMappingCompleted(true); if (onComplete) onComplete(); }} />
      )}
    </div>
  );
};

export default SubjectMappingSetup;
