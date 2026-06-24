import React, { useEffect, useState } from 'react';
import { supabase } from '../../lib/supabase';
import { StudentProfile as StudentType } from '../../lib/types';
import { Briefcase } from 'lucide-react';
import { requestAndSubscribePush, unsubscribePush } from '../../lib/pushNotifications';

interface StudentProfileProps {
  currentStudent: StudentType;
  onProfileUpdate: (updatedStudent: any) => void;
}

export const StudentProfile: React.FC<StudentProfileProps> = ({
  currentStudent,
  onProfileUpdate
}) => {
  const [loading, setLoading] = useState(false);
  const [showProfileForm, setShowProfileForm] = useState(false);
  const [savingCareer, setSavingCareer] = useState(false);
  const [careerMessage, setCareerMessage] = useState('');
  
  // Notification states
  const [pushSubscribed, setPushSubscribed] = useState(false);
  const [notificationLoading, setNotificationLoading] = useState(false);

  // Address & Contacts States
  const [hometown, setHometown] = useState(currentStudent.hometown || '');
  const [houseName, setHouseName] = useState(currentStudent.house_name || '');
  const [street, setStreet] = useState(currentStudent.street || '');
  const [locality, setLocality] = useState(currentStudent.locality || '');
  const [district, setDistrict] = useState(currentStudent.district || '');
  const [stateStr, setStateStr] = useState(currentStudent.state || 'Kerala');
  const [pincode, setPincode] = useState(currentStudent.pincode || '');
  const [mobileNumber, setMobileNumber] = useState(currentStudent.mobile_number || '');
  const [whatsappNumber, setWhatsAppNumber] = useState(currentStudent.whatsapp_number || '');

  // Experience States
  const [totalExperienceYears, setTotalExperienceYears] = useState(currentStudent.total_experience_years || '');
  const [experienceDetails, setExperienceDetails] = useState(currentStudent.experience_details || '');

  // Career States
  const [employmentStatus, setEmploymentStatus] = useState<'unemployed_looking' | 'unemployed_not_looking' | 'employed' | 'employed_looking' | 'higher_studies'>('unemployed_looking');
  const [preferredLocation, setPreferredLocation] = useState<'near_home' | 'india' | 'abroad' | 'anywhere'>('anywhere');
  const [preferredRoles, setPreferredRoles] = useState('');
  const [currentJobTitle, setCurrentJobTitle] = useState('');
  const [currentCompany, setCurrentCompany] = useState('');
  const [currentWorkLocation, setCurrentWorkLocation] = useState('');
  const [skillsLearned, setSkillsLearned] = useState('');
  const [linkedinUrl, setLinkedinUrl] = useState('');

  // Spouse & Family States
  const [maritalStatus, setMaritalStatus] = useState<'single' | 'married'>('single');
  const [spouseName, setSpouseName] = useState('');
  const [spouseProfession, setSpouseProfession] = useState('');
  const [spouseCompany, setSpouseCompany] = useState('');
  const [spouseWorkLocation, setSpouseWorkLocation] = useState('');

  useEffect(() => {
    fetchCareerProfile();
    checkNotificationState();
  }, [currentStudent.id]);

  const checkNotificationState = async () => {
    if ('serviceWorker' in navigator) {
      try {
        const reg = await navigator.serviceWorker.ready;
        const sub = await reg.pushManager.getSubscription();
        setPushSubscribed(!!sub);
      } catch (err) {
        console.error('Error checking subscription:', err);
      }
    }
  };

  const handleToggleNotifications = async () => {
    setNotificationLoading(true);
    try {
      if (pushSubscribed) {
        const success = await unsubscribePush(currentStudent.id);
        if (success) setPushSubscribed(false);
      } else {
        const success = await requestAndSubscribePush(currentStudent.id);
        if (success) setPushSubscribed(true);
      }
    } catch (err) {
      console.error('Error toggling push notifications:', err);
    } finally {
      setNotificationLoading(false);
    }
  };

  const fetchCareerProfile = async () => {
    setLoading(true);
    // Prefill contacts from currentStudent
    setHometown(currentStudent.hometown || '');
    setHouseName(currentStudent.house_name || '');
    setStreet(currentStudent.street || '');
    setLocality(currentStudent.locality || '');
    setDistrict(currentStudent.district || '');
    setStateStr(currentStudent.state || 'Kerala');
    setPincode(currentStudent.pincode || '');
    setMobileNumber(currentStudent.mobile_number || '');
    setWhatsAppNumber(currentStudent.whatsapp_number || '');
    setTotalExperienceYears(currentStudent.total_experience_years || '');
    setExperienceDetails(currentStudent.experience_details || '');

    try {
      const { data, error } = await supabase
        .from('alumni_profiles')
        .select('*')
        .eq('student_id', currentStudent.id)
        .maybeSingle();

      if (error) throw error;
      if (data) {
        setEmploymentStatus(data.employment_status || 'unemployed_looking');
        setPreferredLocation(data.preferred_location || 'anywhere');
        setPreferredRoles(data.preferred_roles || '');
        setCurrentJobTitle(data.current_job_title || '');
        setCurrentCompany(data.current_company || '');
        setCurrentWorkLocation(data.current_work_location || '');
        setSkillsLearned(data.skills_learned || '');
        setLinkedinUrl(data.linkedin_url || '');
        setMaritalStatus(data.marital_status || 'single');
        setSpouseName(data.spouse_name || '');
        setSpouseProfession(data.spouse_profession || '');
        setSpouseCompany(data.spouse_company || '');
        setSpouseWorkLocation(data.spouse_work_location || '');
      }
    } catch (err) {
      console.error('Error fetching alumni career profile:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveCareerProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSavingCareer(true);
    setCareerMessage('');

    try {
      // 1. Update Student Profiles Table
      const { error: profileErr } = await supabase
        .from('student_profiles')
        .update({
          hometown,
          house_name: houseName,
          street,
          locality,
          district,
          state: stateStr,
          pincode,
          mobile_number: mobileNumber,
          whatsapp_number: whatsappNumber,
          total_experience_years: totalExperienceYears,
          experience_details: experienceDetails
        })
        .eq('id', currentStudent.id);

      if (profileErr) throw profileErr;

      // Notify parent of updated student metadata
      onProfileUpdate({
        ...currentStudent,
        hometown,
        house_name: houseName,
        street,
        locality,
        district,
        state: stateStr,
        pincode,
        mobile_number: mobileNumber,
        whatsapp_number: whatsappNumber,
        total_experience_years: totalExperienceYears,
        experience_details: experienceDetails
      });

      // 2. Upsert Alumni Placement details
      const { error: careerErr } = await supabase
        .from('alumni_profiles')
        .upsert({
          student_id: currentStudent.id,
          employment_status: employmentStatus,
          preferred_location: preferredLocation,
          preferred_roles: preferredRoles,
          current_job_title: (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentJobTitle : null,
          current_company: (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentCompany : null,
          current_work_location: (employmentStatus === 'employed' || employmentStatus === 'employed_looking') ? currentWorkLocation : null,
          skills_learned: skillsLearned,
          linkedin_url: linkedinUrl,
          marital_status: maritalStatus,
          spouse_name: maritalStatus === 'married' ? spouseName : null,
          spouse_profession: maritalStatus === 'married' ? spouseProfession : null,
          spouse_company: maritalStatus === 'married' ? spouseCompany : null,
          spouse_work_location: maritalStatus === 'married' ? spouseWorkLocation : null,
          updated_at: new Date().toISOString()
        });

      if (careerErr) throw careerErr;

      setCareerMessage('✅ Profile updated successfully!');
      setShowProfileForm(false);
    } catch (err: any) {
      console.error(err);
      setCareerMessage(`❌ Save failed: ${err.message}`);
    } finally {
      setSavingCareer(false);
      setTimeout(() => setCareerMessage(''), 4000);
    }
  };

  if (loading) {
    return <div style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>Loading profile data...</div>;
  }

  return (
    <div className="glass-card" style={{ border: '1px solid rgba(201, 156, 51, 0.15)', padding: '2rem', maxWidth: '880px', margin: '0 auto' }}>
      
      {/* 🔔 Push Notification Toggle Card */}
      <div style={{ 
        background: 'rgba(201, 156, 51, 0.03)', 
        border: '1px solid rgba(201, 156, 51, 0.15)', 
        borderRadius: '12px', 
        padding: '1.2rem', 
        marginBottom: '1.5rem',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexWrap: 'wrap',
        gap: '1rem'
      }}>
        <div style={{ flex: 1, minWidth: '240px' }}>
          <h4 style={{ margin: '0 0 0.2rem 0', fontSize: '0.95rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
            🔔 Mobile & Desktop Alerts
          </h4>
          <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
            Get notified instantly when scores are updated, appeals are resolved, or announcements are made.
          </p>
        </div>
        <button
          onClick={handleToggleNotifications}
          disabled={notificationLoading}
          className="btn"
          style={{
            padding: '0.5rem 1.2rem',
            fontSize: '0.85rem',
            fontWeight: 700,
            background: pushSubscribed ? 'rgba(239, 68, 68, 0.1)' : 'linear-gradient(135deg, var(--primary), var(--primary-dark))',
            color: pushSubscribed ? '#dc2626' : 'white',
            border: pushSubscribed ? '1px solid rgba(239, 68, 68, 0.2)' : 'none',
            borderRadius: '50px',
            cursor: 'pointer',
            transition: 'all 0.2s',
            boxShadow: pushSubscribed ? 'none' : '0 4px 10px rgba(201, 156, 51, 0.2)'
          }}
        >
          {notificationLoading ? 'Processing...' : pushSubscribed ? 'Disable Alerts' : 'Enable Alerts'}
        </button>
      </div>

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h3 style={{ fontSize: '1.25rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.5rem', fontWeight: 800 }}>
            <Briefcase size={20} className="text-primary" /> Career & Contact Profile
          </h3>
          <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>
            Keep your contact info and career status updated for placement tracking and coordination.
          </p>
        </div>
        {!showProfileForm && (
          <button 
            onClick={() => setShowProfileForm(true)} 
            className="btn btn-outline" 
            style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderColor: 'var(--primary)', color: 'var(--primary-dark)', display: 'flex', alignItems: 'center', gap: '0.4rem', fontWeight: 700, cursor: 'pointer' }}
          >
            Edit Profile Info
          </button>
        )}
      </div>

      {careerMessage && (
        <div style={{ 
          padding: '0.75rem', 
          borderRadius: '8px', 
          marginBottom: '1rem', 
          fontSize: '0.85rem', 
          background: careerMessage.includes('❌') ? 'rgba(220,38,38,0.1)' : 'rgba(34,197,94,0.1)', 
          color: careerMessage.includes('❌') ? '#dc2626' : '#16a34a',
          fontWeight: 600
        }}>
          {careerMessage}
        </div>
      )}

      {!showProfileForm ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem', fontSize: '0.85rem' }}>
          
          {/* Contact Address card */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, color: 'var(--primary-dark)' }}>📞 Contact & Address</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Mobile:</strong> {mobileNumber || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
              <div><strong>WhatsApp:</strong> {whatsappNumber || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
              <div>
                <strong>Address:</strong>
                {(houseName || street || locality || district || stateStr || pincode) ? (
                  <div style={{ marginTop: '0.2rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(201,156,51,0.2)', color: 'var(--text-main)' }}>
                    {houseName && <p style={{ margin: 0 }}>{houseName}</p>}
                    {street && <p style={{ margin: 0 }}>{street}</p>}
                    {locality && <p style={{ margin: 0 }}>{locality}</p>}
                    {(district || stateStr) && <p style={{ margin: 0 }}>{[district, stateStr].filter(Boolean).join(', ')}</p>}
                    {pincode && <p style={{ margin: 0 }}>PIN: {pincode}</p>}
                    {hometown && <p style={{ margin: 0 }}>Hometown: {hometown}</p>}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.2rem' }}>Not provided</span>
                )}
              </div>
            </div>
          </div>

          {/* Work Experience Card */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, color: 'var(--primary-dark)' }}>💼 Prior Work Experience</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Total Experience:</strong> {totalExperienceYears || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not specified</span>}</div>
              <div>
                <strong>Experience Details:</strong>
                {experienceDetails ? (
                  <div style={{ marginTop: '0.2rem', paddingLeft: '0.5rem', borderLeft: '2px solid rgba(201,156,51,0.2)', color: 'var(--text-main)' }}>
                    {experienceDetails}
                  </div>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic', marginLeft: '0.2rem' }}>None logged</span>
                )}
              </div>
            </div>
          </div>

          {/* Employment/Placement status */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, color: 'var(--primary-dark)' }}>💼 Career Status</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div>
                <strong>Employment Status:</strong>{' '}
                <span style={{
                  padding: '0.15rem 0.4rem', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 700,
                  background: employmentStatus === 'employed' || employmentStatus === 'employed_looking' ? 'rgba(34,197,94,0.1)' : 'rgba(0,0,0,0.05)',
                  color: employmentStatus === 'employed' || employmentStatus === 'employed_looking' ? '#16a34a' : 'var(--text-main)'
                }}>
                  {({
                    unemployed_looking: 'Unemployed (Seeking Job)',
                    unemployed_not_looking: 'Unemployed (Not Seeking)',
                    employed: 'Employed / Self-Employed (Not Seeking)',
                    employed_looking: 'Employed (Looking for Opportunities)',
                    higher_studies: 'Higher Studies'
                  })[employmentStatus] || employmentStatus}
                </span>
              </div>

              {(employmentStatus === 'employed' || employmentStatus === 'employed_looking') && (
                <>
                  <div><strong>Job Title:</strong> {currentJobTitle || <span style={{ color: 'var(--text-muted)' }}>-</span>}</div>
                  <div><strong>Company:</strong> {currentCompany || <span style={{ color: 'var(--text-muted)' }}>-</span>}</div>
                  <div><strong>Work Location:</strong> {currentWorkLocation || <span style={{ color: 'var(--text-muted)' }}>-</span>}</div>
                </>
              )}

              <div>
                <strong>Preferred Work Location:</strong>{' '}
                {({
                  near_home: 'Near Home / Local',
                  india: 'Anywhere in India',
                  abroad: 'Abroad / GCC',
                  anywhere: 'Anywhere / Flexible'
                })[preferredLocation] || preferredLocation}
              </div>
              <div><strong>Preferred Roles:</strong> {preferredRoles || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not specified</span>}</div>
              <div><strong>Key Skills:</strong> {skillsLearned || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not specified</span>}</div>
              <div>
                <strong>LinkedIn:</strong>{' '}
                {linkedinUrl ? (
                  <a href={linkedinUrl} target="_blank" rel="noopener noreferrer" style={{ color: 'var(--primary-dark)', fontWeight: 600 }}>
                    View Profile
                  </a>
                ) : (
                  <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not linked</span>
                )}
              </div>
            </div>
          </div>

          {/* Marital card */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, color: 'var(--primary-dark)' }}>💍 Marital & Family</h4>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <div><strong>Marital Status:</strong> <span style={{ textTransform: 'capitalize' }}>{maritalStatus}</span></div>
              {maritalStatus === 'married' && (
                <>
                  <div><strong>Spouse Name:</strong> {spouseName || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                  <div><strong>Spouse Work:</strong> {spouseProfession || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                  <div><strong>Spouse Company:</strong> {spouseCompany || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                  <div><strong>Spouse Work Place:</strong> {spouseWorkLocation || <span style={{ color: 'var(--text-muted)', fontStyle: 'italic' }}>Not provided</span>}</div>
                </>
              )}
            </div>
          </div>

        </div>
      ) : (
        <form onSubmit={handleSaveCareerProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', fontSize: '0.85rem' }}>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Mobile Number *</label>
              <input type="tel" required value={mobileNumber} onChange={e => setMobileNumber(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>WhatsApp Number *</label>
              <input type="tel" required value={whatsappNumber} onChange={e => setWhatsAppNumber(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} />
            </div>
            <div>
              <label style={{ display: 'block', fontWeight: 700, fontSize: '0.85rem', marginBottom: '0.3rem' }}>Hometown</label>
              <input type="text" value={hometown} onChange={e => setHometown(e.target.value)} style={{ width: '100%', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }} placeholder="e.g. Kozhikode" />
            </div>
          </div>

          {/* Complete Address details */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem' }}>📬 Complete Address Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>House Name/No.</label>
                <input type="text" value={houseName} onChange={e => setHouseName(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Street/Road</label>
                <input type="text" value={street} onChange={e => setStreet(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Locality/City</label>
                <input type="text" value={locality} onChange={e => setLocality(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>District</label>
                <input type="text" value={district} onChange={e => setDistrict(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>State</label>
                <input type="text" value={stateStr} onChange={e => setStateStr(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Pincode</label>
                <input type="text" value={pincode} onChange={e => setPincode(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
              </div>
            </div>
          </div>

          {/* Work Experience */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem' }}>💼 Prior Work Experience</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 650, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Total Experience *</label>
                <select value={totalExperienceYears} onChange={e => setTotalExperienceYears(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }} required>
                  <option value="">Select Experience...</option>
                  <option value="None / Fresher">None / Fresher</option>
                  <option value="6 Months">6 Months</option>
                  <option value="1 Year">1 Year</option>
                  <option value="2 Years">2 Years</option>
                  <option value="3-5 Years">3-5 Years</option>
                  <option value="5+ Years">5+ Years</option>
                </select>
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Prior Experience Details</label>
                <textarea value={experienceDetails} onChange={e => setExperienceDetails(e.target.value)} rows={2} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }} placeholder="e.g. 1 year as Arabic Translator..." />
              </div>
            </div>
          </div>

          {/* Marital Details */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem' }}>💍 Marital & Family Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: maritalStatus === 'married' ? '1rem' : '0' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 650, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Marital Status</label>
                <select value={maritalStatus} onChange={e => setMaritalStatus(e.target.value as any)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                  <option value="single">Single / Unmarried</option>
                  <option value="married">Married</option>
                </select>
              </div>
              
              {maritalStatus === 'married' && (
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Spouse's Name</label>
                  <input type="text" value={spouseName} onChange={e => setSpouseName(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="Spouse's full name" />
                </div>
              )}
            </div>

            {maritalStatus === 'married' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Spouse's Occupation</label>
                  <input type="text" value={spouseProfession} onChange={e => setSpouseProfession(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Teacher" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Spouse's Employer</label>
                  <input type="text" value={spouseCompany} onChange={e => setSpouseCompany(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Government School" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Spouse's Working Place</label>
                  <input type="text" value={spouseWorkLocation} onChange={e => setSpouseWorkLocation(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Dubai" />
                </div>
              </div>
            )}
          </div>

          {/* Placement Preferences */}
          <div style={{ background: 'rgba(0,0,0,0.01)', padding: '1rem', borderRadius: '12px', border: '1px solid rgba(0,0,0,0.04)' }}>
            <h4 style={{ margin: '0 0 0.8rem 0', fontWeight: 700, fontSize: '0.9rem' }}>💼 Placement & Career Details</h4>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 650, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Employment Status</label>
                <select value={employmentStatus} onChange={e => setEmploymentStatus(e.target.value as any)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                  <option value="unemployed_looking">Unemployed (Actively Looking)</option>
                  <option value="unemployed_not_looking">Unemployed (Not Looking)</option>
                  <option value="employed">Employed (Not Looking for Job)</option>
                  <option value="employed_looking">Employed (Looking for Opportunities)</option>
                  <option value="higher_studies">Higher Studies</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontWeight: 650, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Work Location Preference</label>
                <select value={preferredLocation} onChange={e => setPreferredLocation(e.target.value as any)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', background: 'white' }}>
                  <option value="near_home">Near Home / Local Area</option>
                  <option value="india">Anywhere in India</option>
                  <option value="abroad">Abroad / GCC / International</option>
                  <option value="anywhere">Anywhere (Flexible)</option>
                </select>
              </div>
            </div>

            {(employmentStatus === 'employed' || employmentStatus === 'employed_looking') && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Job Title</label>
                  <input type="text" value={currentJobTitle} onChange={e => setCurrentJobTitle(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Arabic Translator" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Employer / Company Name</label>
                  <input type="text" value={currentCompany} onChange={e => setCurrentCompany(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Global Tech Solutions" />
                </div>
                <div>
                  <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Work Location</label>
                  <input type="text" value={currentWorkLocation} onChange={e => setCurrentWorkLocation(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Dubai, UAE" />
                </div>
              </div>
            )}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Preferred Roles</label>
                <input type="text" value={preferredRoles} onChange={e => setPreferredRoles(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="e.g. Translation, Web Development" />
              </div>
              <div>
                <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>LinkedIn Profile URL</label>
                <input type="url" value={linkedinUrl} onChange={e => setLinkedinUrl(e.target.value)} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} placeholder="https://linkedin.com/in/username" />
              </div>
            </div>

            <div style={{ marginTop: '1rem' }}>
              <label style={{ display: 'block', fontWeight: 600, fontSize: '0.8rem', marginBottom: '0.2rem' }}>Skills & Specializations</label>
              <textarea value={skillsLearned} onChange={e => setSkillsLearned(e.target.value)} rows={2} style={{ width: '100%', padding: '0.4rem 0.6rem', borderRadius: '6px', border: '1px solid #cbd5e1', fontSize: '0.85rem', resize: 'vertical' }} placeholder="e.g. Arabic translation, React, public speaking..." />
            </div>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.8rem', borderTop: '1px solid rgba(0,0,0,0.08)', paddingTop: '1rem' }}>
            <button 
              type="button" 
              onClick={() => setShowProfileForm(false)} 
              className="btn btn-outline" 
              style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: '#64748b', borderColor: '#cbd5e1', cursor: 'pointer' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              disabled={savingCareer} 
              className="btn btn-primary" 
              style={{ padding: '0.5rem 1.2rem', fontSize: '0.85rem', fontWeight: 700, cursor: 'pointer' }}
            >
              {savingCareer ? 'Saving...' : 'Save Profile'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};
