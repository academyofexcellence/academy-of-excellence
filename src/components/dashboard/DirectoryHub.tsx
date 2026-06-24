import React, { useState } from 'react';
import { Users, UserCheck, ShieldAlert, KeyRound, Trash2, GraduationCap } from 'lucide-react';
import { StudentProfile, StaffProfile, Course } from '../../lib/types';

interface DirectoryHubProps {
  isLeadership: boolean;
  currentUser: StaffProfile | null;
  studentList: StudentProfile[];
  staffList: StaffProfile[];
  courses: Course[];
  handleUpdateStaff: (staffId: string, role: string, designation: string, status: string) => Promise<void>;
  handleResetPassword: (userId: string, newPw: string) => Promise<void>;
  handleDeleteAccount: (userId: string, name: string) => Promise<void>;
  handleUpdateStudent: (studentId: string, name: string, courseId: string, batchNumber: number, rollNumber: string, status: string) => Promise<void>;
  handleOpenReport: (student: StudentProfile) => void;
  handleGraduateBatch?: (courseId: string, batchNumber: number) => Promise<void>;
  graduatingBatch?: boolean;
}

export const DirectoryHub: React.FC<DirectoryHubProps> = ({
  isLeadership,
  currentUser,
  studentList,
  staffList,
  courses,
  handleUpdateStaff,
  handleResetPassword,
  handleDeleteAccount,
  handleUpdateStudent,
  handleOpenReport,
  handleGraduateBatch,
  graduatingBatch
}) => {
  const [subTab, setSubTab] = useState<'students' | 'staff'>('students');

  // Roster Filters (Students)
  const [studentSearch, setStudentSearch] = useState('');
  const [studentFilterCourse, setStudentFilterCourse] = useState('');
  const [studentFilterBatch, setStudentFilterBatch] = useState('');
  const [studentFilterStatus, setStudentFilterStatus] = useState('');

  if (!isLeadership) {
    return (
      <div className="glass-card text-center" style={{ padding: '3rem', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
        <p style={{ color: 'var(--text-muted)' }}>Only leadership roles can manage the directories.</p>
      </div>
    );
  }

  // Filter students roster
  const filteredStudents = studentList.filter(student => {
    const matchesSearch = student.name.toLowerCase().includes(studentSearch.toLowerCase()) || 
                          student.email.toLowerCase().includes(studentSearch.toLowerCase());
    const matchesCourse = studentFilterCourse ? student.course_id === studentFilterCourse : true;
    const matchesBatch = studentFilterBatch ? student.batch_number === parseInt(studentFilterBatch) : true;
    const matchesStatus = studentFilterStatus ? student.status === studentFilterStatus : true;
    return matchesSearch && matchesCourse && matchesBatch && matchesStatus;
  });

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
      
      {/* Sub-Tabs Selector */}
      <div style={{
        display: 'flex',
        gap: '0.5rem',
        background: 'rgba(0,0,0,0.02)',
        padding: '0.35rem',
        borderRadius: '12px',
        alignSelf: 'flex-start',
        border: '1px solid rgba(0,0,0,0.04)',
        marginBottom: '0.5rem'
      }}>
        <button
          onClick={() => setSubTab('students')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'students' ? 'white' : 'transparent',
            color: subTab === 'students' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'students' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <GraduationCap size={15} /> Student Profiles
        </button>
        <button
          onClick={() => setSubTab('staff')}
          style={{
            padding: '0.5rem 1.2rem',
            border: 'none',
            borderRadius: '8px',
            fontSize: '0.85rem',
            fontWeight: 700,
            cursor: 'pointer',
            background: subTab === 'staff' ? 'white' : 'transparent',
            color: subTab === 'staff' ? 'var(--primary-dark)' : 'var(--text-muted)',
            boxShadow: subTab === 'staff' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
            transition: 'all 0.2s ease',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <UserCheck size={15} /> Staff Directory
        </button>
      </div>

      {subTab === 'students' ? (
        /* STUDENTS DIRECTORY */
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', fontWeight: 800 }}>Student Profiles & Roster</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Approve signups, edit details, assign roll numbers, or perform password resets.
          </p>

          {/* Filters Panel */}
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.8rem', marginBottom: '1.5rem' }}>
            <div style={{ flex: '1 1 200px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Search Student</label>
              <input 
                type="text" 
                placeholder="Search by name or email..." 
                value={studentSearch} 
                onChange={(e) => setStudentSearch(e.target.value)} 
                style={{ padding: '0.45rem 0.6rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              />
            </div>

            <div style={{ flex: '1 1 150px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Course</label>
              <select 
                value={studentFilterCourse} 
                onChange={(e) => setStudentFilterCourse(e.target.value)} 
                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="">All Courses</option>
                {courses.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 100px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Batch</label>
              <select 
                value={studentFilterBatch} 
                onChange={(e) => setStudentFilterBatch(e.target.value)} 
                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="">All Batches</option>
                {[...Array(30)].map((_, i) => (
                  <option key={i + 1} value={i + 1}>Batch {i + 1}</option>
                ))}
              </select>
            </div>

            <div style={{ flex: '1 1 120px', display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
              <label style={{ fontSize: '0.75rem', fontWeight: 600, color: 'var(--text-muted)' }}>Status</label>
              <select 
                value={studentFilterStatus} 
                onChange={(e) => setStudentFilterStatus(e.target.value)} 
                style={{ padding: '0.45rem', borderRadius: '8px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', background: 'white' }}
              >
                <option value="">All Statuses</option>
                <option value="pending">Pending</option>
                <option value="active">Active</option>
                <option value="inactive">Inactive</option>
                <option value="alumni">Alumni</option>
              </select>
            </div>
          </div>

          {/* Batch Actions Row */}
          {studentFilterCourse && studentFilterBatch && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: '1.5rem' }}>
              <button 
                onClick={async () => {
                  if (handleGraduateBatch) {
                    await handleGraduateBatch(studentFilterCourse, parseInt(studentFilterBatch));
                  }
                }}
                disabled={graduatingBatch}
                className="btn btn-outline"
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '0.4rem',
                  borderColor: 'var(--primary)',
                  color: 'var(--primary-dark)',
                  padding: '0.5rem 1.2rem',
                  fontSize: '0.8rem',
                  fontWeight: 700,
                  cursor: 'pointer',
                  borderRadius: '8px',
                  background: 'rgba(201, 156, 51, 0.05)',
                  transition: 'all 0.2s ease'
                }}
              >
                <GraduationCap size={16} />
                {graduatingBatch ? 'Graduating Batch...' : `Graduate Batch ${studentFilterBatch} to Alumni`}
              </button>
            </div>
          )}

          {/* Student Table */}
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '900px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)' }}>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Student Name</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Email Address</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Roll #</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Course</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Batch</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Reset Password</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredStudents.length === 0 ? (
                  <tr>
                    <td colSpan={8} style={{ padding: '2rem 0.5rem', textAlign: 'center', color: 'var(--text-muted)', fontStyle: 'italic' }}>
                      No students found matching your filters.
                    </td>
                  </tr>
                ) : (
                  filteredStudents.map(student => (
                    <StudentRow 
                      key={student.id} 
                      student={student} 
                      courses={courses} 
                      onUpdate={handleUpdateStudent} 
                      onResetPassword={(newPw) => handleResetPassword(student.id, newPw)} 
                      onDeleteAccount={() => handleDeleteAccount(student.id, student.name)} 
                      onOpenReport={handleOpenReport} 
                    />
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* STAFF DIRECTORY */
        <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '1.5rem' }}>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.25rem', fontWeight: 800 }}>Staff Roster & Job Titles</h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', marginBottom: '1.5rem' }}>
            Manage staff designations, role privileges, and account activations.
          </p>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', textAlign: 'left', minWidth: '850px', fontSize: '0.85rem' }}>
              <thead>
                <tr style={{ borderBottom: '2px solid rgba(201,156,51,0.2)' }}>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Staff Name</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Email Address</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Designation (Job Title)</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Access Role</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Status</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700 }}>Reset Password</th>
                  <th style={{ padding: '0.8rem 0.5rem', fontWeight: 700, textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {staffList.map(staff => (
                  <StaffRowItem 
                    key={staff.id} 
                    staff={staff} 
                    isSelf={staff.id === currentUser?.id}
                    onUpdate={handleUpdateStaff}
                    onResetPassword={(newPw) => handleResetPassword(staff.id, newPw)}
                    onDeleteAccount={() => handleDeleteAccount(staff.id, staff.name)}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
};

/* INTERNAL ROW SUB-COMPONENTS */

interface StudentRowProps {
  student: StudentProfile;
  courses: Course[];
  onUpdate: (studentId: string, name: string, courseId: string, batchNumber: number, rollNumber: string, status: string) => Promise<void>;
  onResetPassword: (newPw: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
  onOpenReport: (student: StudentProfile) => void;
}

const StudentRow: React.FC<StudentRowProps> = ({
  student,
  courses,
  onUpdate,
  onResetPassword,
  onDeleteAccount,
  onOpenReport
}) => {
  const [name, setName] = useState(student.name);
  const [rollNumber, setRollNumber] = useState(student.roll_number || '');
  const [courseId, setCourseId] = useState(student.course_id);
  const [batchNumber, setBatchNumber] = useState(student.batch_number);
  const [status, setStatus] = useState(student.status);
  
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(student.id, name, courseId, batchNumber, rollNumber, status);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!newPassword) return;
    setResetting(true);
    await onResetPassword(newPassword);
    setNewPassword('');
    setResetting(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete student account ${student.name}?`)) {
      setDeleting(true);
      await onDeleteAccount();
      setDeleting(false);
    }
  };

  return (
    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.2rem' }}>
          <input 
            type="text" 
            value={name} 
            onChange={(e) => setName(e.target.value)} 
            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '100%', fontSize: '0.85rem', fontWeight: 600 }} 
          />
          {student.status === 'pending' && (
            <span style={{ 
              fontSize: '0.65rem', fontWeight: 700, padding: '0.1rem 0.3rem', borderRadius: '4px', 
              background: student.is_alumni_signup ? 'rgba(59,130,246,0.12)' : 'rgba(245,158,11,0.12)', 
              color: student.is_alumni_signup ? '#2563eb' : '#d97706', alignSelf: 'flex-start'
            }}>
              Signup requested: {student.is_alumni_signup ? 'Alumni' : 'Student'}
            </span>
          )}
        </div>
      </td>
      <td style={{ padding: '0.6rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{student.email}</td>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <input 
          type="text" 
          value={rollNumber} 
          onChange={(e) => setRollNumber(e.target.value)} 
          style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '65px', fontSize: '0.85rem', textAlign: 'center', fontWeight: 600 }} 
          placeholder="Roll #"
        />
      </td>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <select 
          value={courseId} 
          onChange={(e) => setCourseId(e.target.value)} 
          style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none', maxWidth: '160px' }}
        >
          {courses.map(c => (
            <option key={c.id} value={c.id}>{c.name}</option>
          ))}
        </select>
      </td>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <input 
          type="number" 
          value={batchNumber} 
          onChange={(e) => setBatchNumber(parseInt(e.target.value) || 1)} 
          style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '55px', fontSize: '0.85rem', textAlign: 'center' }} 
        />
      </td>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <select 
          value={status} 
          onChange={(e) => setStatus(e.target.value as any)} 
          style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none' }}
        >
          <option value="pending">Pending</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
          <option value="alumni">Alumni</option>
        </select>
      </td>
      <td style={{ padding: '0.6rem 0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <input 
            type="password" 
            placeholder="New PW" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '85px', fontSize: '0.8rem' }} 
          />
          <button 
            onClick={handleReset} 
            disabled={resetting || !newPassword}
            className="btn btn-outline" 
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}
          >
            {resetting ? '...' : 'Reset'}
          </button>
        </div>
      </td>
      <td style={{ padding: '0.6rem 0.5rem', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem' }} disabled={saving}>{saving ? '...' : 'Save'}</button>
          <button 
            onClick={() => onOpenReport(student)}
            className="btn btn-outline" 
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', color: 'var(--primary)', borderColor: 'var(--primary)', background: 'rgba(201,156,51,0.02)' }}
          >
            Report
          </button>
          <button 
            onClick={handleDelete} 
            disabled={deleting} 
            className="btn btn-outline" 
            style={{ padding: '0.35rem 0.7rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
};

/* STAFF DIRECTORY ROW */

interface StaffRowItemProps {
  staff: StaffProfile;
  isSelf: boolean;
  onUpdate: (staffId: string, role: string, designation: string, status: string) => Promise<void>;
  onResetPassword: (newPw: string) => Promise<void>;
  onDeleteAccount: () => Promise<void>;
}

const StaffRowItem: React.FC<StaffRowItemProps> = ({
  staff,
  isSelf,
  onUpdate,
  onResetPassword,
  onDeleteAccount
}) => {
  const [role, setRole] = useState(staff.role);
  const [designation, setDesignation] = useState(staff.designation || '');
  const [status, setStatus] = useState(staff.status);
  
  const [saving, setSaving] = useState(false);
  const [newPassword, setNewPassword] = useState('');
  const [resetting, setResetting] = useState(false);
  const [deleting, setDeleting] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    await onUpdate(staff.id, role, designation, status);
    setSaving(false);
  };

  const handleReset = async () => {
    if (!newPassword) return;
    setResetting(true);
    await onResetPassword(newPassword);
    setNewPassword('');
    setResetting(false);
  };

  const handleDelete = async () => {
    if (window.confirm(`Are you sure you want to permanently delete staff account ${staff.name}?`)) {
      setDeleting(true);
      await onDeleteAccount();
      setDeleting(false);
    }
  };

  return (
    <tr style={{ borderBottom: '1px solid rgba(0,0,0,0.05)' }}>
      <td style={{ padding: '0.8rem 0.5rem', fontWeight: 650 }}>{staff.name} {isSelf && <span style={{ color: 'var(--primary-dark)', fontSize: '0.7rem' }}>(You)</span>}</td>
      <td style={{ padding: '0.8rem 0.5rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>{staff.email}</td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <input type="text" value={designation} onChange={(e) => setDesignation(e.target.value)} style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '100%', fontSize: '0.85rem' }} />
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <select value={role} onChange={(e) => setRole(e.target.value as any)} style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none' }} disabled={isSelf}>
          <option value="staff">Staff</option>
          <option value="gm">GM (General Manager)</option>
          <option value="md">MD (Managing Director)</option>
          <option value="director">Director</option>
        </select>
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <select value={status} onChange={(e) => setStatus(e.target.value as any)} style={{ padding: '0.35rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', fontSize: '0.85rem', outline: 'none' }} disabled={isSelf}>
          <option value="pending">Pending Approval</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive / Deactivated</option>
        </select>
      </td>
      <td style={{ padding: '0.8rem 0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.25rem', alignItems: 'center' }}>
          <input 
            type="password" 
            placeholder="New PW" 
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            style={{ padding: '0.35rem 0.5rem', borderRadius: '6px', border: '1px solid rgba(0,0,0,0.12)', width: '90px', fontSize: '0.8rem' }} 
          />
          <button 
            onClick={handleReset} 
            disabled={resetting || !newPassword}
            className="btn btn-outline" 
            style={{ padding: '0.35rem 0.6rem', fontSize: '0.7rem' }}
          >
            {resetting ? '...' : 'Reset'}
          </button>
        </div>
      </td>
      <td style={{ padding: '0.8rem 0.5rem', textAlign: 'right' }}>
        <div style={{ display: 'flex', gap: '0.3rem', justifyContent: 'flex-end', alignItems: 'center' }}>
          <button onClick={handleSave} className="btn btn-primary" style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem' }} disabled={saving}>{saving ? '...' : 'Save'}</button>
          <button 
            onClick={handleDelete} 
            disabled={deleting || isSelf} 
            className="btn btn-outline" 
            style={{ padding: '0.35rem 0.75rem', fontSize: '0.75rem', color: '#dc2626', borderColor: '#fca5a5', background: 'rgba(239,68,68,0.02)' }}
          >
            <Trash2 size={12} />
          </button>
        </div>
      </td>
    </tr>
  );
};
