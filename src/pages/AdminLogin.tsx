import React, { useState, useEffect } from 'react';
import { supabase } from '../lib/supabase';
import { useNavigate } from 'react-router-dom';
import { LogIn, UserPlus, ShieldAlert, CheckCircle2, Eye, EyeOff, X, Key } from 'lucide-react';

const AdminLogin = () => {
  const [activeTab, setActiveTab] = useState<'login' | 'register'>('login');
  const [registerType, setRegisterType] = useState<'student' | 'staff'>('student');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [designation, setDesignation] = useState('');
  
  // Student Specific states
  const [courses, setCourses] = useState<any[]>([]);
  const [selectedCourse, setSelectedCourse] = useState('');
  const [batchNumber, setBatchNumber] = useState('');
  const [rollNumber, setRollNumber] = useState('');
  const [isAlumniSignup, setIsAlumniSignup] = useState(false);

  // Address & Contact states
  const [mobileNumber, setMobileNumber] = useState('');
  const [whatsappNumber, setWhatsAppNumber] = useState('');
  const [hometown, setHometown] = useState('');
  const [houseName, setHouseName] = useState('');
  const [street, setStreet] = useState('');
  const [locality, setLocality] = useState('');
  const [district, setDistrict] = useState('');
  const [stateStr, setStateStr] = useState('Kerala');
  const [pincode, setPincode] = useState('');

  // Experience states
  const [totalExperienceYears, setTotalExperienceYears] = useState('');
  const [experienceDetails, setExperienceDetails] = useState('');

  // Career states (Alumni only)
  const [employmentStatus, setEmploymentStatus] = useState<'unemployed_looking' | 'unemployed_not_looking' | 'employed' | 'employed_looking' | 'higher_studies'>('unemployed_looking');
  const [preferredLocation, setPreferredLocation] = useState<'near_home' | 'india' | 'abroad' | 'anywhere'>('anywhere');
  const [preferredRoles, setPreferredRoles] = useState('');
  const [currentJobTitle, setCurrentJobTitle] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentWorkLocation, setCurrentWorkLocation] = useState('');
  const [skillsLearned, setSkillsLearned] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Spouse & Family states (Alumni only)
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [spouseName, setSpouseName] = useState('');
  const [spouseProfession, setSpouseProfession] = useState('');
  const [spouseCompany, setSpouseCompany] = useState('');
  const [spouseWorkLocation, setSpouseWorkLocation] = useState('');

  const [showPassword, setShowPassword] = useState(false);
  const [showForgotModal, setShowForgotModal] = useState(false);
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
        if (studentProfile.status !== 'active' && studentProfile.status !== 'alumni') {
          await supabase.auth.signOut();
          throw new Error(
            studentProfile.status === 'pending'
              ? 'Your account is pending approval by the admin.'
              : 'Your account has been deactivated.'
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
            roll_number: rollNumber,
            is_alumni_signup: isAlumniSignup,
            // Contact & Address
            mobile_number: mobileNumber,
            whatsapp_number: whatsappNumber,
            hometown: hometown,
            house_name: houseName,
            street: street,
            locality: locality,
            district: district,
            state: stateStr,
            pincode: pincode,
            // Experience
            total_experience_years: totalExperienceYears,
            experience_details: experienceDetails,
            // Career Details (if Alumnus)
            employment_status: isAlumniSignup ? employmentStatus : 'unemployed_looking',
            preferred_location: isAlumniSignup ? preferredLocation : 'anywhere',
            preferred_roles: isAlumniSignup ? preferredRoles : null,
            current_job_title: isAlumniSignup && (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentJobTitle : null,
            current_company: isAlumniSignup && (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentCompany : null,
            current_work_location: isAlumniSignup && (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentWorkLocation : null,
            skills_learned: isAlumniSignup ? skillsLearned : null,
            linkedin_url: isAlumniSignup ? linkedinUrl : null,
            // Spouse Details (if Alumnus)
            marital_status: isAlumniSignup ? maritalStatus : 'single',
            spouse_name: isAlumniSignup && maritalStatus === 'married' ? spouseName : null,
            spouse_profession: isAlumniSignup && maritalStatus === 'married' ? spouseProfession : null,
            spouse_company: isAlumniSignup && maritalStatus === 'married' ? spouseCompany : null,
            spouse_work_location: isAlumniSignup && maritalStatus === 'married' ? spouseWorkLocation : null,
          },
        },
      });

      if (signUpError) throw signUpError;

      setSuccessMsg(
        isAlumniSignup 
          ? '🎉 Alumni registration successful! Your account is pending approval by the admin.'
          : '🎉 Student registration successful! Your account is pending approval by the institute staff.'
      );
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
    setRollNumber('');
    setIsAlumniSignup(false);
    setRegisterType('student');
    
    // Reset address & contacts
    setMobileNumber('');
    setWhatsAppNumber('');
    setHometown('');
    setHouseName('');
    setStreet('');
    setLocality('');
    setDistrict('');
    setStateStr('Kerala');
    setPincode('');

    // Reset experience
    setTotalExperienceYears('');
    setExperienceDetails('');

    // Reset career
    setEmploymentStatus('unemployed_looking');
    setPreferredLocation('anywhere');
    setPreferredRoles('');
    setCurrentJobTitle('');
    setCurrentCompany('');
    setCurrentWorkLocation('');
    setSkillsLearned('');
    setLinkedinUrl('');

    // Reset marital
    setMaritalStatus('single');
    setSpouseName('');
    setSpouseProfession('');
    setSpouseCompany('');
    setSpouseWorkLocation('');

    if (courses.length > 0) setSelectedCourse(courses[0].id);
  };

  return (
    <div style={{ paddingTop: '130px', paddingBottom: '60px', minHeight: '100vh', display: 'flex', justifyContent: 'center', alignItems: 'center', position: 'relative', overflow: 'hidden' }} className="bg-grid-pattern">
      <div className="hero-blob animate-float-1" style={{ top: '-10%', right: '-5%' }}></div>
      <div className="hero-blob animate-float-2" style={{ bottom: '-15%', left: '-10%' }}></div>
      
      <div className="glass-card animate-fade-in" style={{ maxWidth: (activeTab === 'register' && registerType === 'student') ? '680px' : '480px', width: '90%', maxHeight: '85vh', overflowY: 'auto', zIndex: 10, border: '1px solid rgba(201, 156, 51, 0.2)', boxShadow: '0 20px 50px rgba(201, 156, 51, 0.15)', padding: '2rem', transition: 'max-width 0.3s ease' }}>
        
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
            onClick={() => { setActiveTab('register'); setError(''); setSuccessMsg(''); resetForm(); }}
            style={{
              flex: 1, padding: '0.6rem', borderRadius: '50px', border: 'none',
              background: activeTab === 'register' ? 'white' : 'transparent',
              color: activeTab === 'register' ? 'var(--text-main)' : 'var(--text-muted)',
              fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.4rem', transition: 'all 0.3s', fontSize: '0.85rem'
            }}
          >
            <UserPlus size={14} /> Register
          </button>
        </div>

        <h2 className="heading-lg text-center mb-2" style={{ fontSize: '1.6rem' }}>
          Operations <span className="text-primary">{activeTab === 'login' ? 'Portal' : 'Registration'}</span>
        </h2>
        <p className="text-center" style={{ color: 'var(--text-muted)', fontSize: '0.85rem', marginBottom: '1.5rem' }}>
          {activeTab === 'login' ? 'Sign in to access your student leaderboard or staff console.' : 'Submit a registration request to access the platform.'}
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
        
        <form onSubmit={activeTab === 'login' ? handleLogin : registerType === 'staff' ? handleRegisterStaff : handleRegisterStudent} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {activeTab === 'register' && (
            <div className="form-group" style={{ marginBottom: '1rem' }}>
              <label style={{ fontWeight: 700, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block', color: 'var(--primary-dark)' }}>I want to register as a:</label>
              <select
                value={registerType}
                onChange={(e) => {
                  setRegisterType(e.target.value as any);
                  setError('');
                  setSuccessMsg('');
                }}
                className="form-input"
                style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white', fontWeight: 600 }}
              >
                <option value="student">Student or Alumnus / Graduate</option>
                <option value="staff">Staff Member / Operations Office</option>
              </select>
            </div>
          )}

          {activeTab === 'register' && (
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

          {activeTab === 'register' && registerType === 'staff' && (
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

          {activeTab === 'register' && registerType === 'student' && (
            <>
              <div className="form-group" style={{ marginBottom: '1.2rem' }}>
                <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>I am registering as a:</label>
                <select
                  value={isAlumniSignup ? 'alumni' : 'student'}
                  onChange={(e) => setIsAlumniSignup(e.target.value === 'alumni')}
                  className="form-input"
                  style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white', fontWeight: 600 }}
                >
                  <option value="student">Active Student (Current Course Member)</option>
                  <option value="alumni">Alumnus / Graduate (Finished Course)</option>
                </select>
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr 1fr', gap: '1rem', marginBottom: '1.2rem' }}>
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

                <div className="form-group">
                  <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Roll #{isAlumniSignup ? ' (Opt)' : ''}</label>
                  <input 
                    type="text" 
                    value={rollNumber}
                    onChange={(e) => setRollNumber(e.target.value)}
                    className="form-input"
                    style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                    placeholder="e.g. 1"
                    required={!isAlumniSignup}
                  />
                </div>
              </div>

              {/* 🏠 Contact & Address Details */}
              <div style={{ background: 'rgba(201, 156, 51, 0.02)', border: '1px solid rgba(201, 156, 51, 0.1)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>🏠 Contact & Address Details</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Mobile Number *</label>
                    <input 
                      type="tel" 
                      value={mobileNumber}
                      onChange={(e) => setMobileNumber(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>WhatsApp Number *</label>
                    <input 
                      type="tel" 
                      value={whatsappNumber}
                      onChange={(e) => setWhatsAppNumber(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. 9876543210"
                      required
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Hometown *</label>
                    <input 
                      type="text" 
                      value={hometown}
                      onChange={(e) => setHometown(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. Calicut"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>House Name/No.</label>
                    <input 
                      type="text" 
                      value={houseName}
                      onChange={(e) => setHouseName(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. Green Villa"
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Street/Road</label>
                    <input 
                      type="text" 
                      value={street}
                      onChange={(e) => setStreet(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. Stadium Rd"
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1.5fr 1fr', gap: '0.8rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Locality/PO *</label>
                    <input 
                      type="text" 
                      value={locality}
                      onChange={(e) => setLocality(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. Palayam PO"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>District *</label>
                    <input 
                      type="text" 
                      value={district}
                      onChange={(e) => setDistrict(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="e.g. Kozhikode"
                      required
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Pincode *</label>
                    <input 
                      type="text" 
                      value={pincode}
                      onChange={(e) => setPincode(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      placeholder="673001"
                      required
                    />
                  </div>
                </div>
              </div>

              {/* 💼 Prior Work Experience */}
              <div style={{ background: 'rgba(201, 156, 51, 0.02)', border: '1px solid rgba(201, 156, 51, 0.1)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>💼 Prior Work Experience</h4>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '0.8rem' }}>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Total Experience *</label>
                    <select
                      value={totalExperienceYears}
                      onChange={(e) => setTotalExperienceYears(e.target.value)}
                      className="form-input"
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                      required
                    >
                      <option value="">Select Experience...</option>
                      <option value="None / Fresher">None / Fresher</option>
                      <option value="6 Months">6 Months</option>
                      <option value="1 Year">1 Year</option>
                      <option value="2 Years">2 Years</option>
                      <option value="3-5 Years">3-5 Years</option>
                      <option value="5+ Years">5+ Years</option>
                    </select>
                  </div>
                  <div className="form-group">
                    <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Prior Experience Details</label>
                    <textarea 
                      value={experienceDetails}
                      onChange={(e) => setExperienceDetails(e.target.value)}
                      className="form-input"
                      rows={2}
                      style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white', fontSize: '0.8rem', resize: 'vertical' }}
                      placeholder="e.g. 1 year as Arabic Content Writer, freelancer..."
                    />
                  </div>
                </div>
              </div>

              {/* 🚀 Career & Placement Details (Alumni Only) */}
              {isAlumniSignup && (
                <>
                  <div style={{ background: 'rgba(201, 156, 51, 0.02)', border: '1px solid rgba(201, 156, 51, 0.1)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>🚀 Career & Placement Details</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Employment Status *</label>
                        <select
                          value={employmentStatus}
                          onChange={(e) => setEmploymentStatus(e.target.value as any)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                          required
                        >
                          <option value="unemployed_looking">Unemployed (Actively Looking)</option>
                          <option value="unemployed_not_looking">Unemployed (Not Looking)</option>
                          <option value="employed">Employed (Not Looking for Job)</option>
                          <option value="employed_looking">Employed (Looking for Opportunities)</option>
                          <option value="higher_studies">Higher Studies</option>
                        </select>
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Preferred Job Location *</label>
                        <select
                          value={preferredLocation}
                          onChange={(e) => setPreferredLocation(e.target.value as any)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                          required
                        >
                          <option value="near_home">Near Home / Local Area</option>
                          <option value="india">Anywhere in India</option>
                          <option value="abroad">Abroad / GCC / International</option>
                          <option value="anywhere">Anywhere (Flexible)</option>
                        </select>
                      </div>
                    </div>

                    {employmentStatus === 'employed' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Current Job Title *</label>
                          <input 
                            type="text" 
                            value={currentJobTitle}
                            onChange={(e) => setCurrentJobTitle(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Translation Lead"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Company Name *</label>
                          <input 
                            type="text" 
                            value={currentCompany}
                            onChange={(e) => setCurrentCompany(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Amazon Arabia"
                            required
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Work Location *</label>
                          <input 
                            type="text" 
                            value={currentWorkLocation}
                            onChange={(e) => setCurrentWorkLocation(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Dubai, UAE"
                            required
                          />
                        </div>
                      </div>
                    )}

                    <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: '0.8rem', marginBottom: '0.8rem' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Skills & Specializations</label>
                        <input 
                          type="text" 
                          value={skillsLearned}
                          onChange={(e) => setSkillsLearned(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                          placeholder="e.g. Simultaneous Translation, coding"
                        />
                      </div>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>LinkedIn Profile URL</label>
                        <input 
                          type="url" 
                          value={linkedinUrl}
                          onChange={(e) => setLinkedinUrl(e.target.value)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                          placeholder="https://linkedin.com/..."
                        />
                      </div>
                    </div>

                    <div className="form-group">
                      <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Preferred Roles / Fields of Interest</label>
                      <input 
                        type="text" 
                        value={preferredRoles}
                        onChange={(e) => setPreferredRoles(e.target.value)}
                        className="form-input"
                        style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                        placeholder="e.g. Translation, Web Development, Teaching"
                      />
                    </div>
                  </div>

                  {/* ❤️ Family & Spouse Details (Alumni Only) */}
                  <div style={{ background: 'rgba(201, 156, 51, 0.02)', border: '1px solid rgba(201, 156, 51, 0.1)', borderRadius: '12px', padding: '1rem', marginBottom: '1.2rem' }}>
                    <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem', color: 'var(--primary-dark)' }}>❤️ Family & Spouse Details</h4>
                    
                    <div style={{ display: 'grid', gridTemplateColumns: maritalStatus === 'married' ? '1fr 1.5fr' : '1fr', gap: '0.8rem', marginBottom: maritalStatus === 'married' ? '0.8rem' : '0' }}>
                      <div className="form-group">
                        <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Marital Status *</label>
                        <select
                          value={maritalStatus}
                          onChange={(e) => setMaritalStatus(e.target.value as any)}
                          className="form-input"
                          style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                          required
                        >
                          <option value="single">Single / Unmarried</option>
                          <option value="married">Married</option>
                        </select>
                      </div>
                      
                      {maritalStatus === 'married' && (
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Spouse Name *</label>
                          <input 
                            type="text" 
                            value={spouseName}
                            onChange={(e) => setSpouseName(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="Spouse's Full Name"
                            required
                          />
                        </div>
                      )}
                    </div>

                    {maritalStatus === 'married' && (
                      <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr 1fr', gap: '0.8rem' }}>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Spouse's Occupation</label>
                          <input 
                            type="text" 
                            value={spouseProfession}
                            onChange={(e) => setSpouseProfession(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Teacher, Engineer"
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Spouse's Company</label>
                          <input 
                            type="text" 
                            value={spouseCompany}
                            onChange={(e) => setSpouseCompany(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Govt School"
                          />
                        </div>
                        <div className="form-group">
                          <label style={{ fontWeight: 600, fontSize: '0.75rem', marginBottom: '0.2rem', display: 'block' }}>Spouse's Work Place</label>
                          <input 
                            type="text" 
                            value={spouseWorkLocation}
                            onChange={(e) => setSpouseWorkLocation(e.target.value)}
                            className="form-input"
                            style={{ width: '100%', padding: '0.6rem', borderRadius: '6px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
                            placeholder="e.g. Malappuram"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}
            </>
          )}

          <div className="form-group">
            <label style={{ fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.3rem', display: 'block' }}>Email Address</label>
            <input 
              type="email" 
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="form-input"
              style={{ width: '100%', padding: '0.75rem', borderRadius: '8px', border: '1px solid rgba(201, 156, 51, 0.2)', background: 'white' }}
              placeholder={(activeTab === 'register' && registerType === 'student') ? "student@gmail.com" : "name@aoeonline.net"}
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

          {activeTab === 'login' && (
            <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: '-0.5rem' }}>
              <button
                type="button"
                onClick={() => setShowForgotModal(true)}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--primary-dark)',
                  fontSize: '0.78rem',
                  fontWeight: 600,
                  cursor: 'pointer',
                  padding: '0.2rem 0',
                  transition: 'opacity 0.2s',
                  outline: 'none'
                }}
                onMouseOver={(e) => (e.currentTarget.style.opacity = '0.8')}
                onMouseOut={(e) => (e.currentTarget.style.opacity = '1')}
              >
                Forgot Password?
              </button>
            </div>
          )}

          <button type="submit" className="btn btn-primary mt-2" style={{ width: '100%', justifyContent: 'center' }} disabled={loading}>
            {loading ? 'Processing...' : activeTab === 'login' ? 'Sign In' : 'Request Roster Access'}
          </button>
        </form>
      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div style={{
          position: 'fixed',
          top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(0, 0, 0, 0.5)',
          backdropFilter: 'blur(8px)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 9999,
          padding: '1rem'
        }}>
          <div className="glass-card" style={{
            maxWidth: '420px',
            width: '100%',
            padding: '2rem',
            border: '1px solid rgba(201, 156, 51, 0.3)',
            boxShadow: '0 20px 50px rgba(0,0,0,0.3)',
            position: 'relative',
            background: 'white',
            textAlign: 'center',
            borderRadius: '16px'
          }}>
            <button 
              onClick={() => setShowForgotModal(false)}
              style={{
                position: 'absolute', top: '1.2rem', right: '1.2rem',
                background: 'none', border: 'none', cursor: 'pointer',
                color: 'var(--text-muted)', display: 'flex', alignItems: 'center', justifyContent: 'center',
                padding: '0.3rem', borderRadius: '50%', transition: 'background-color 0.2s'
              }}
              onMouseOver={(e) => (e.currentTarget.style.backgroundColor = 'rgba(0,0,0,0.05)')}
              onMouseOut={(e) => (e.currentTarget.style.backgroundColor = 'transparent')}
            >
              <X size={18} />
            </button>
            
            <div style={{
              width: '56px', height: '56px', borderRadius: '50%',
              background: 'rgba(201, 156, 51, 0.1)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              margin: '0 auto 1.2rem', color: 'var(--primary-dark)'
            }}>
              <Key size={26} />
            </div>

            <h3 style={{ fontSize: '1.35rem', marginBottom: '0.6rem', fontWeight: 700, color: 'var(--text-main)' }}>
              Forgot Password?
            </h3>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.88rem', lineHeight: 1.5, marginBottom: '1.5rem' }}>
              For security, account credentials can only be updated with administration authorization.
            </p>

            <div style={{
              background: 'rgba(201, 156, 51, 0.04)',
              border: '1px solid rgba(201, 156, 51, 0.12)',
              borderRadius: '12px',
              padding: '1rem',
              fontSize: '0.85rem',
              color: 'var(--text-main)',
              textAlign: 'left',
              marginBottom: '1.5rem',
              boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.02)'
            }}>
              <div style={{ fontWeight: 700, color: 'var(--primary-dark)', marginBottom: '0.4rem', fontSize: '0.9rem' }}>
                How to reset your password:
              </div>
              <ol style={{ paddingLeft: '1.2rem', margin: 0, display: 'flex', flexDirection: 'column', gap: '0.3rem', color: 'var(--text-muted)' }}>
                <li>Contact the Institute Management (GM, MD, or Director).</li>
                <li>Provide your registered login email address.</li>
                <li>The administrator will instantly reset or assign a new password for you via the Admin Panel.</li>
              </ol>
            </div>

            <button 
              onClick={() => setShowForgotModal(false)}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '0.75rem', fontSize: '0.9rem', fontWeight: 600 }}
            >
              Okay, I Understand
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminLogin;
