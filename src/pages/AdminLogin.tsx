import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, GraduationCap, ShieldAlert, CheckCircle2, Eye, EyeOff } from 'lucide-react';

const AdminLogin = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register_staff' | 'register_student'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  
  // Student Specific states
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [batchNumber, setBatchNumber] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    fetchCourses();
  }, []);

  const fetchCourses = async () => {
    try {
      const { data, error } = await supabase.from('courses').select('*').order('name', { ascending: true });
      if (error) throw error;
      if (data) {
        setCourses(data);
        if (data.length > 0) setSelectedCourse(data[0].id);
      }
    } catch (err) {
      console.error('Error fetching courses:', err);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { data: authData, error: authError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (authError) throw authError;
      if (!authData.user) throw new Error('Authentication failed.');

      // 1. Check if user is staff
      const { data: staffProfile } = await supabase
        .from('staff_profiles')
        .select('status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (staffProfile) {
        if (staffProfile.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error(
            staffProfile.status === 'pending'
              ? 'Your staff account is pending approval by management.'
              : 'Your staff account has been deactivated.'
          );
        }
        navigate('/admin/dashboard');
        return;
      }

      // 2. Check if user is student
      const { data: studentProfile } = await supabase
        .from('student_profiles')
        .select('status')
        .eq('id', authData.user.id)
        .maybeSingle();

      if (studentProfile) {
        if (studentProfile.status !== 'active') {
          await supabase.auth.signOut();
          throw new Error(
            studentProfile.status === 'pending'
              ? 'Your student account is pending approval by staff.'
              : 'Your student account has been deactivated.'
          );
        }
        navigate('/student/dashboard');
        return;
      }

      // If registered in Auth but not in either profile table
      await supabase.auth.signOut();
      throw new Error('Staff/Student profile not found. Please contact administration.');
    } catch (err: any) {
      setError(err.message || 'Login failed. Please try again.');
      setLoading(false);
    }
  };

  const handleRegisterStaff = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_student: false,
            name: fullName,
            designation: designation,
          },
        },
      });

      if (signUpError) throw signUpError;
      
      setSuccessMsg('🎉 Staff registration successful! Your account is pending approval by the MD or GM.');
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleRegisterStudent = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCourse) {
      setError('Please select a course.');
      return;
    }
    if (!batchNumber || isNaN(Number(batchNumber))) {
      setError('Please enter a valid batch number.');
      return;
    }

    setLoading(true);
    setError('');
    setSuccessMsg('');

    try {
      const { error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            is_student: true,
            name: fullName,
            course_id: selectedCourse,
            batch_number: parseInt(batchNumber),
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccessMsg('🎉 Student registration successful! Your account is pending approval by the institute staff.');
      resetForm();
    } catch (err: any) {
      setError(err.message || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEmail('');
    setPassword('');
    setFullName('');
    setDesignation('');
    setBatchNumber('');
    if (courses.length > 0) setSelectedCourse(courses[0].id);
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '60px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }} className="bg-grid-pattern">
      <div className="hero-blob animate-float-1" style={{ top: '-10%', right: '-5%' }}></div>
      <div className="hero-blob animate-float-2" style={{ bottom: '-15%', left: '-10%' }}></div>
      
      <div className="glass-card" style={{ maxWidth: '480px', width: '90%', height: 'max-content', zIndex: 10, border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 20px 50px rgba(201, 156, 51, 0.15)', padding: '2rem' }}>
        
        {/* Toggle Tabs */}
        <div style={{ display: 'flex', background: 'rgba(0,0,0,0.03)', padding: '0.3rem', borderRadius: '50px', marginBottom: '2rem', flexWrap: 'wrap', gap: '0.2rem' }}>
          <button 
            onClick={() => { setActiveTab('login'); setError(''); setSuccessMsg(''); resetForm(); }}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '50px', border: 'none',
              background: activeTab === 'login' ? 'white' : 'transparent',
              color: activeTab === 'login' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.3s', fontSize: '0.85rem'
            }}
          >
            <LogIn size={14} /> Sign In
          </button>
          
          <button 
            onClick={() => { setActiveTab('register_staff'); setError(''); setSuccessMsg(''); resetForm(); }}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '50px', border: 'none',
              background: activeTab === 'register_staff' ? 'white' : 'transparent',
              color: activeTab === 'register_staff' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.3s', fontSize: '0.85rem'
            }}
          >
            <UserPlus size={14} /> Register Staff
          </button>

          <button 
            onClick={() => { setActiveTab('register_student'); setError(''); setSuccessMsg(''); resetForm(); }}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '50px', border: 'none',
              background: activeTab === 'register_student' ? 'white' : 'transparent',
              color: activeTab === 'register_student' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.3s', fontSize: '0.85rem'
            }}
          >
            <GraduationCap size={14} /> Register Student
          </button>
        </div>

        <h2 className="heading-lg text-center mb-2" style={{ fontSize: '1.6rem' }}>
          Operations <span className="text-primary">{activeTab === 'login' ? 'Portal' : activeTab === 'register_staff' ? 'Staff Signup' : 'Student Signup'}</span>
        </h2>
        <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {activeTab === 'login' ? 'Sign in to access your student leaderboard or staff console.' : activeTab === 'register_staff' ? 'Create a staff account to join the roster.' : 'Sign up to access your gamified scorecard and track your performance.'}
        </p>
        
        {error && (
          <div style={{ background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.2)', color: '#dc2626', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldAlert size={16} /> {error}
          </div>
        )}

        {successMsg && (
          <div style={{ background: 'rgba(34,197,94,0.08)', border: '1px solid rgba(34,197,94,0.2)', color: '#16a34a', padding: '0.8rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.85rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 500 }}>
            <CheckCircle2 size={16} /> {successMsg}
          </div>
        )}
        
        <form onSubmit={activeTab === 'login' ? handleLogin : activeTab === 'register_staff' ? handleRegisterStaff : handleRegisterStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTab !== 'login' && (
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Full Name</label>
              <input 
                type="text" 
                value={fullName}
                onChange={(e) => setFullName(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                placeholder="e.g. John Doe"
                required
              />
            </div>
          )}

          {activeTab === 'register_staff' && (
            <div className="form-group">
              <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Designation / Job Name</label>
              <input 
                type="text" 
                value={designation}
                onChange={(e) => setDesignation(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                placeholder="e.g. Arabic Translator / Office Admin"
                required
              />
            </div>
          )}

          {activeTab === 'register_student' && (
            <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '1rem' }}>
              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Select Course</label>
                <select
                  value={selectedCourse}
                  onChange={(e) => setSelectedCourse(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                  required
                >
                  <option value="">Choose Course...</option>
                  {courses.map(c => (
                    <option key={c.id} value={c.id}>{c.name}</option>
                  ))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Batch #</label>
                <input 
                  type="number" 
                  value={batchNumber}
                  onChange={(e) => setBatchNumber(e.target.value)}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                  placeholder="e.g. 25"
                  min="1"
                  required
                />
              </div>
            </div>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
              placeholder={activeTab === 'register_student' ? "student@gmail.com" : "name@aoeonline.net"}
              required
            />
          </div>

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Password</label>
            <div style={{ position: 'relative' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem 2.8rem 0.75rem 0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                placeholder="••••••••"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={{
                  position: 'absolute', right: '0.8rem', top: '50%', transform: 'translateY(-50%)',
                  background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)',
                  display: 'flex', alignItems: 'center', outline: 'none', padding: 0
                }}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>
          </div>

          <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Request Roster Access'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default AdminLogin;
