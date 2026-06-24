import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { HelpCircle, Plus } from 'lucide-react';

interface PrefillAppealData {
  date: string;
  type: 'attendance' | 'checklist' | 'scoring';
  activity: string;
  currentValue: string;
}

interface StudentAppealsProps {
  studentId: string;
  studentName: string;
  prefillData: PrefillAppealData | null;
  onClearPrefill: () => void;
}

export const StudentAppeals: React.FC<StudentAppealsProps> = ({
  studentId,
  studentName,
  prefillData,
  onClearPrefill
}) => {
  const [appeals, setAppeals] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [showAppealModal, setShowAppealModal] = useState(false);
  const [submittingAppeal, setSubmittingAppeal] = useState(false);

  // Form states
  const [appealType, setAppealType] = useState<'attendance' | 'scoring' | 'checklist'>('attendance');
  const [appealDate, setAppealDate] = useState(new Date().toISOString().split('T')[0]);
  const [appealActivity, setAppealActivity] = useState('Attendance');
  const [appealCurrentValue, setAppealCurrentValue] = useState('Absent');
  const [appealExpectedValue, setAppealExpectedValue] = useState('Present');
  const [appealReason, setAppealReason] = useState('');

  useEffect(() => {
    fetchAppeals();
  }, [studentId]);

  useEffect(() => {
    if (prefillData) {
      setAppealDate(prefillData.date);
      setAppealType(prefillData.type);
      setAppealActivity(prefillData.activity);
      setAppealCurrentValue(prefillData.currentValue);
      setAppealReason('');
      
      if (prefillData.type === 'attendance') {
        setAppealExpectedValue('Present');
      } else if (prefillData.type === 'checklist') {
        setAppealExpectedValue('Completed');
      } else {
        setAppealExpectedValue('');
      }
      
      setShowAppealModal(true);
    }
  }, [prefillData]);

  const fetchAppeals = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('correction_requests')
        .select('*')
        .eq('student_id', studentId)
        .order('created_at', { ascending: false });

      if (error) throw error;
      setAppeals(data || []);
    } catch (err) {
      console.error('Error fetching appeals:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleAppealTypeChange = (type: 'attendance' | 'scoring' | 'checklist') => {
    setAppealType(type);
    if (type === 'attendance') {
      setAppealActivity('Attendance');
      setAppealCurrentValue('Absent');
      setAppealExpectedValue('Present');
    } else if (type === 'checklist') {
      setAppealActivity('Daily Vocab');
      setAppealCurrentValue('Incomplete');
      setAppealExpectedValue('Completed');
    } else {
      setAppealActivity('Exam: ');
      setAppealCurrentValue('');
      setAppealExpectedValue('');
    }
  };

  const handleSubmitAppeal = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setSubmittingAppeal(true);
      const { error } = await supabase
        .from('correction_requests')
        .insert({
          student_id: studentId,
          request_type: appealType,
          logged_date: appealDate,
          activity_name: appealActivity,
          current_value: appealCurrentValue,
          expected_value: appealExpectedValue,
          reason: appealReason,
          status: 'pending'
        });

      if (error) throw error;
      
      // Reset form and reload
      setAppealReason('');
      setShowAppealModal(false);
      onClearPrefill();
      await fetchAppeals();
    } catch (err) {
      console.error('Error submitting appeal:', err);
      alert('Failed to submit appeal. Please try again.');
    } finally {
      setSubmittingAppeal(false);
    }
  };

  const handleCloseModal = () => {
    setShowAppealModal(false);
    onClearPrefill();
  };

  return (
    <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem', maxWidth: '980px', margin: '0 auto' }}>
      
      {/* Header section */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <HelpCircle size={20} className="text-primary" /> Appeals & Correction Requests
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Submit a request if you notice any discrepancies in your attendance, daily checklist tasks, or exam scores.
          </p>
        </div>
        <button 
          onClick={() => {
            setAppealDate(new Date().toISOString().split('T')[0]);
            handleAppealTypeChange('attendance');
            setAppealReason('');
            setShowAppealModal(true);
          }} 
          className="btn btn-outline" 
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, cursor: 'pointer' }}
        >
          <Plus size={16} /> New Appeal Request
        </button>
      </div>

      {/* Appeals Table */}
      {loading ? (
        <div style={{ textAlign: 'center', padding: '1.5rem', color: 'var(--text-muted)' }}>Loading appeals...</div>
      ) : appeals.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '2rem', background: 'rgba(0,0,0,0.02)', borderRadius: '12px', color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
          No correction requests submitted yet.
        </div>
      ) : (
        <div style={{ overflowX: 'auto', background: 'white', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.05)' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem' }}>
            <thead>
              <tr style={{ background: 'var(--bg-light)', borderBottom: '1px solid rgba(0,0,0,0.08)' }}>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Date</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Category</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Activity Name</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>Current</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>Expected</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Reason</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700 }}>Status</th>
                <th style={{ padding: '0.75rem 1rem', textAlign: 'left', fontWeight: 700 }}>Response Feedback</th>
              </tr>
            </thead>
            <tbody>
              {appeals.map((app) => {
                let statusColor = '#eab308'; // yellow for pending
                let statusBg = 'rgba(234, 179, 8, 0.1)';
                if (app.status === 'approved') {
                  statusColor = '#16a34a'; // green
                  statusBg = 'rgba(22, 163, 74, 0.1)';
                } else if (app.status === 'rejected') {
                  statusColor = '#dc2626'; // red
                  statusBg = 'rgba(220, 38, 38, 0.1)';
                }

                return (
                  <tr key={app.id} style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
                    <td style={{ padding: '0.75rem 1rem', whiteSpace: 'nowrap' }}>{new Date(app.logged_date).toLocaleDateString()}</td>
                    <td style={{ padding: '0.75rem 1rem', textTransform: 'capitalize', fontWeight: 600 }}>{app.request_type}</td>
                    <td style={{ padding: '0.75rem 1rem' }}>{app.activity_name}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', color: '#64748b' }}>{app.current_value}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center', fontWeight: 700, color: 'var(--primary-dark)' }}>{app.expected_value}</td>
                    <td style={{ padding: '0.75rem 1rem', color: '#64748b', maxWidth: '200px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={app.reason}>{app.reason}</td>
                    <td style={{ padding: '0.75rem 1rem', textAlign: 'center' }}>
                      <span style={{ display: 'inline-block', padding: '0.2rem 0.5rem', borderRadius: '50px', fontSize: '0.75rem', fontWeight: 700, color: statusColor, background: statusBg }}>
                        {app.status}
                      </span>
                    </td>
                    <td style={{ padding: '0.75rem 1rem', color: '#334155', fontStyle: app.admin_remark ? 'normal' : 'italic' }}>
                      {app.admin_remark || <span style={{ color: '#94a3b8' }}>Pending review...</span>}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}

      {/* --- APPEAL SUBMISSION MODAL --- */}
      {showAppealModal && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 999 }}>
          <div className="glass-card" style={{ width: '100%', maxWidth: '500px', padding: '2rem', position: 'relative', border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 20px 40px rgba(0,0,0,0.15)', background: 'white' }}>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, borderBottom: '1px solid rgba(0,0,0,0.08)', paddingBottom: '0.8rem', marginBottom: '1.2rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <HelpCircle className="text-primary" /> Request Correction / Appeal
            </h3>

            <form onSubmit={handleSubmitAppeal} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Request Category</label>
                <select 
                  value={appealType} 
                  onChange={(e) => handleAppealTypeChange(e.target.value as any)} 
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', background: 'white' }}
                >
                  <option value="attendance">Attendance Correction</option>
                  <option value="checklist">Weekly Checklist Task (Vocab/Sentences/etc)</option>
                  <option value="scoring">Scoring / Marks (Exam/Talk/etc)</option>
                </select>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Date of Activity</label>
                <input 
                  type="date" 
                  required 
                  value={appealDate} 
                  onChange={(e) => setAppealDate(e.target.value)} 
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Activity / Exam Name</label>
                <input 
                  type="text" 
                  required 
                  placeholder="e.g. Attendance, Daily Vocab, Exam: Grammar 1" 
                  value={appealActivity} 
                  onChange={(e) => setAppealActivity(e.target.value)} 
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Recorded Status</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Absent, Incomplete, 0/10" 
                    value={appealCurrentValue} 
                    onChange={(e) => setAppealCurrentValue(e.target.value)} 
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
                <div className="form-group">
                  <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Correct Expected Value</label>
                  <input 
                    type="text" 
                    required 
                    placeholder="e.g. Present, Completed, 8/10" 
                    value={appealExpectedValue} 
                    onChange={(e) => setAppealExpectedValue(e.target.value)} 
                    style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem' }}
                  />
                </div>
              </div>

              <div className="form-group">
                <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Reason for Correction</label>
                <textarea 
                  required 
                  placeholder="Explain why this needs correction..." 
                  value={appealReason} 
                  onChange={(e) => setAppealReason(e.target.value)} 
                  rows={3} 
                  style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', outline: 'none', fontSize: '0.9rem', resize: 'vertical' }}
                />
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', marginTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
                <button 
                  type="button" 
                  onClick={handleCloseModal} 
                  className="btn btn-outline" 
                  style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#64748b', borderColor: '#cbd5e1', cursor: 'pointer' }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  disabled={submittingAppeal} 
                  className="btn btn-primary" 
                  style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
                >
                  {submittingAppeal ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
