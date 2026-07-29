import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, StudentProfile, CertificateRecord } from '../../lib/types';
import { Award, Download, Printer, RefreshCw, Search, ShieldCheck, Trash2, CheckCircle2, AlertCircle, Eye, ExternalLink, QrCode, Keyboard, CheckSquare, Square } from 'lucide-react';
import QRCode from 'qrcode';

interface CertificateHubProps {
  coursesList: Course[];
  studentList: StudentProfile[];
}

export default function CertificateHub({ coursesList, studentList }: CertificateHubProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursesList[0]?.id || '');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number>(26);
  const [fourDigitBatchCode, setFourDigitBatchCode] = useState<string>('0208'); // e.g. 0208 for DPT0208 or CAT0208
  const [certType, setCertType] = useState<'DPT' | 'CAT'>('DPT');
  const [gradeDescription, setGradeDescription] = useState<string>('Passed with Distinction');

  // Selected students checklist for selective generation (useful for CAT typing certs)
  const [selectedStudentIds, setSelectedStudentIds] = useState<string[]>([]);

  const [certificates, setCertificates] = useState<CertificateRecord[]>([]);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Diploma Preview Modal State
  const [activePreviewCert, setActivePreviewCert] = useState<CertificateRecord | null>(null);
  const [previewQrUrl, setPreviewQrUrl] = useState<string>('');

  // Filter students by selected Course & Batch
  const filteredStudents = studentList.filter(
    s => s.course_id === selectedCourseId && Number(s.batch_number) === Number(selectedBatchNumber)
  );

  const selectedCourse = coursesList.find(c => c.id === selectedCourseId);

  useEffect(() => {
    fetchCertificates();
  }, []);

  // When course or batch changes, pre-select all students in batch by default
  useEffect(() => {
    setSelectedStudentIds(filteredStudents.map(s => s.id));
  }, [selectedCourseId, selectedBatchNumber, studentList]);

  // Update default grade description when certificate type changes
  useEffect(() => {
    if (certType === 'CAT') {
      setGradeDescription('Passed Speed & Accuracy Evaluation');
    } else {
      setGradeDescription('Passed with Distinction');
    }
  }, [certType]);

  const fetchCertificates = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .order('created_at', { ascending: false });

      if (error) throw error;
      setCertificates(data as CertificateRecord[] || []);
    } catch (err: any) {
      console.error('Error fetching certificates:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleSelectAll = () => {
    if (selectedStudentIds.length === filteredStudents.length) {
      setSelectedStudentIds([]);
    } else {
      setSelectedStudentIds(filteredStudents.map(s => s.id));
    }
  };

  const handleToggleStudent = (id: string) => {
    if (selectedStudentIds.includes(id)) {
      setSelectedStudentIds(prev => prev.filter(sId => sId !== id));
    } else {
      setSelectedStudentIds(prev => [...prev, id]);
    }
  };

  // Generate Certificates for checked students in batch
  const handleGenerateBatchCertificates = async () => {
    const rawDigits = fourDigitBatchCode.trim().replace(/[^0-9]/g, '');
    if (rawDigits.length !== 4) {
      setMessage('⚠️ Please enter a valid 4-digit batch code (e.g. 0208).');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    const targetStudents = filteredStudents.filter(s => selectedStudentIds.includes(s.id));

    if (targetStudents.length === 0) {
      setMessage('⚠️ Please select at least one student from the checklist below.');
      setTimeout(() => setMessage(''), 4000);
      return;
    }

    const batchPrefix = `${certType}${rawDigits}`;
    const yearDigits = new Date().getFullYear().toString().slice(-2); // e.g. '26'

    setGenerating(true);
    setMessage(`Generating ${certType} certificates for ${targetStudents.length} student(s)...`);

    try {
      const recordsToUpsert = targetStudents.map((student, idx) => {
        // Roll number padded to 3 digits (e.g. '001', '010', '105')
        let rollStr = student.roll_number?.trim();
        if (!rollStr || isNaN(Number(rollStr))) {
          rollStr = String(idx + 1).padStart(3, '0');
        } else {
          rollStr = String(Number(rollStr)).padStart(3, '0');
        }

        const certCode = `${batchPrefix}/${yearDigits}/${rollStr}`;
        const courseName = certType === 'CAT' 
          ? 'Computer & Arabic Typing Certificate' 
          : (selectedCourse?.name || 'Diploma Program');

        return {
          certificate_code: certCode,
          batch_code_prefix: batchPrefix,
          student_id: student.id,
          student_name: student.name,
          course_id: student.course_id,
          course_name: courseName,
          batch_number: student.batch_number,
          roll_number: rollStr,
          issue_date: new Date().toISOString().split('T')[0],
          certificate_type: certType,
          grade_description: gradeDescription,
          status: 'valid'
        };
      });

      const { error } = await supabase
        .from('certificates')
        .upsert(recordsToUpsert, { onConflict: 'certificate_code' });

      if (error) throw error;

      setMessage(`✅ Successfully generated ${recordsToUpsert.length} ${certType} certificate(s) for ${batchPrefix}!`);
      await fetchCertificates();
    } catch (err: any) {
      console.error('Error generating certificates:', err);
      setMessage(`❌ Failed to generate certificates: ${err.message}`);
    } finally {
      setGenerating(false);
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Download High-Resolution PNG QR Code for Staff
  const handleDownloadQrPng = async (cert: CertificateRecord) => {
    try {
      const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(cert.certificate_code)}`;

      const canvas = document.createElement('canvas');
      const ctx = canvas.getContext('2d');
      const width = 500;
      const height = 630;
      canvas.width = width;
      canvas.height = height;

      if (!ctx) return;

      // Fill background
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(0, 0, width, height);

      // Border frame color based on type
      ctx.strokeStyle = cert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706';
      ctx.lineWidth = 8;
      ctx.strokeRect(12, 12, width - 24, height - 24);

      // Header title
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 22px sans-serif';
      ctx.textAlign = 'center';
      ctx.fillText('ACADEMY OF EXCELLENCE', width / 2, 50);

      ctx.fillStyle = cert.certificate_code.startsWith('CAT') ? '#1d4ed8' : '#b45309';
      ctx.font = 'bold 15px sans-serif';
      const labelType = cert.certificate_code.startsWith('CAT') ? 'TYPING CERTIFICATE QR' : 'DIPLOMA CERTIFICATE QR';
      ctx.fillText(`OFFICIAL ${labelType}`, width / 2, 78);

      // Draw QR Code onto canvas
      const qrCanvas = document.createElement('canvas');
      await QRCode.toCanvas(qrCanvas, verifyUrl, {
        width: 340,
        margin: 1,
        color: { dark: '#0f172a', light: '#ffffff' }
      });

      ctx.drawImage(qrCanvas, (width - 340) / 2, 98, 340, 340);

      // Student metadata
      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 20px sans-serif';
      ctx.fillText(cert.student_name, width / 2, 475);

      ctx.fillStyle = '#475569';
      ctx.font = '15px sans-serif';
      ctx.fillText(`${cert.course_name} (Batch ${cert.batch_number})`, width / 2, 505);

      // Certificate Code Badge
      ctx.fillStyle = '#f1f5f9';
      ctx.fillRect((width - 330) / 2, 530, 330, 44);

      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 1;
      ctx.strokeRect((width - 330) / 2, 530, 330, 44);

      ctx.fillStyle = '#0f172a';
      ctx.font = 'bold 18px monospace';
      ctx.fillText(cert.certificate_code, width / 2, 558);

      // Convert to image and trigger download
      const dataUrl = canvas.toDataURL('image/png');
      const safeFilename = cert.certificate_code.replace(/[\/\\?%*:|"<>]/g, '-');
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = `QR_${safeFilename}_${cert.student_name.replace(/\s+/g, '_')}.png`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

    } catch (err) {
      console.error('Error rendering QR PNG:', err);
    }
  };

  // Open Preview Modal
  const handleOpenPreview = async (cert: CertificateRecord) => {
    setActivePreviewCert(cert);
    const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(cert.certificate_code)}`;
    const url = await QRCode.toDataURL(verifyUrl, {
      width: 250,
      margin: 1,
      color: { dark: '#0f172a', light: '#ffffff' }
    });
    setPreviewQrUrl(url);
  };

  // Toggle Revoked Status
  const handleToggleStatus = async (cert: CertificateRecord) => {
    const newStatus = cert.status === 'valid' ? 'revoked' : 'valid';
    try {
      const { error } = await supabase
        .from('certificates')
        .update({ status: newStatus })
        .eq('id', cert.id);

      if (error) throw error;
      await fetchCertificates();
    } catch (err: any) {
      console.error('Error updating certificate status:', err);
    }
  };

  // Delete Certificate Record
  const handleDeleteCert = async (id: string) => {
    if (!confirm('Are you sure you want to delete this certificate record?')) return;
    try {
      const { error } = await supabase
        .from('certificates')
        .delete()
        .eq('id', id);

      if (error) throw error;
      await fetchCertificates();
    } catch (err: any) {
      console.error('Error deleting certificate:', err);
    }
  };

  const filteredCertificates = certificates.filter(c => 
    c.student_name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.certificate_code.toLowerCase().includes(searchTerm.toLowerCase()) ||
    c.course_name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div style={{ padding: '1rem 0' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(245, 158, 11, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#fbbf24', border: '1px solid rgba(251, 191, 36, 0.3)' }}>
            <Award size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#fbbf24' }}>
              Certificate & Verification Hub
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Generate & manage <strong style={{ color: '#fbbf24' }}>DPT</strong> Diploma and <strong style={{ color: '#60a5fa' }}>CAT</strong> Typing certificates with QR verification.
            </p>
          </div>
        </div>

        <button
          onClick={fetchCertificates}
          className="btn btn-outline"
          style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', color: 'white', borderColor: 'rgba(255,255,255,0.2)', borderRadius: '8px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh
        </button>
      </div>

      {message && (
        <div style={{ padding: '1rem 1.25rem', borderRadius: '12px', background: message.startsWith('✅') ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)', border: `1px solid ${message.startsWith('✅') ? '#22c55e' : '#ef4444'}`, color: message.startsWith('✅') ? '#15803d' : '#b91c1c', fontWeight: 700, marginBottom: '1.5rem', fontSize: '0.9rem' }}>
          {message}
        </div>
      )}

      {/* Generator Form Card */}
      <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px', border: certType === 'CAT' ? '1px solid rgba(59, 130, 246, 0.3)' : '1px solid rgba(217, 119, 6, 0.2)', background: 'linear-gradient(180deg, rgba(255,255,255,0.95) 0%, rgba(248,250,252,0.95) 100%)', marginBottom: '2rem' }}>
        
        {/* Certificate Type Switcher */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', flexWrap: 'wrap', gap: '1rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--text-main)' }}>
            <QrCode size={20} className="text-primary" /> Certificate Generator
          </h3>

          {/* Type Toggle Tabs */}
          <div style={{ display: 'flex', background: '#e2e8f0', padding: '0.25rem', borderRadius: '10px', gap: '0.25rem' }}>
            <button
              onClick={() => setCertType('DPT')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: certType === 'DPT' ? '#d97706' : 'transparent',
                color: certType === 'DPT' ? 'white' : '#475569',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Award size={15} /> DPT - Diploma Certificate
            </button>
            <button
              onClick={() => setCertType('CAT')}
              style={{
                padding: '0.45rem 1rem',
                borderRadius: '8px',
                border: 'none',
                background: certType === 'CAT' ? '#2563eb' : '#475569',
                color: 'white',
                fontWeight: 700,
                fontSize: '0.85rem',
                cursor: 'pointer',
                display: 'flex',
                alignItems: 'center',
                gap: '0.4rem',
                transition: 'all 0.2s'
              }}
            >
              <Keyboard size={15} /> CAT - Typing Certificate
            </button>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '1.25rem', marginBottom: '1.5rem' }}>
          
          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Course Program</label>
            <select
              value={selectedCourseId}
              onChange={(e) => setSelectedCourseId(e.target.value)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            >
              {coursesList.map(c => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Batch Number</label>
            <input
              type="number"
              value={selectedBatchNumber}
              onChange={(e) => setSelectedBatchNumber(parseInt(e.target.value) || 1)}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>4-Digit Batch Code *</label>
            <div style={{ display: 'flex', alignItems: 'center' }}>
              <span style={{ background: certType === 'CAT' ? '#dbeafe' : '#fef3c7', padding: '0.6rem 0.6rem', border: '1px solid #cbd5e1', borderRight: 'none', borderRadius: '8px 0 0 8px', fontSize: '0.85rem', fontWeight: 800, color: certType === 'CAT' ? '#1e40af' : '#b45309' }}>
                {certType}
              </span>
              <input
                type="text"
                maxLength={4}
                value={fourDigitBatchCode}
                onChange={(e) => setFourDigitBatchCode(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="0208"
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '0 8px 8px 0', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700, outline: 'none' }}
              />
            </div>
            <span style={{ fontSize: '0.7rem', color: '#64748b', marginTop: '0.2rem', display: 'block' }}>
              Prefix: <strong style={{ color: certType === 'CAT' ? '#2563eb' : '#d97706' }}>{certType}{fourDigitBatchCode || '0000'}</strong>
            </span>
          </div>

          <div>
            <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.4rem' }}>Grade / Evaluation Honor</label>
            <input
              type="text"
              value={gradeDescription}
              onChange={(e) => setGradeDescription(e.target.value)}
              placeholder={certType === 'CAT' ? "e.g. Speed: 40 WPM / Distinction" : "e.g. Passed with Distinction"}
              style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', outline: 'none' }}
            />
          </div>

        </div>

        {/* Student Checklist Selection Section */}
        <div style={{ background: '#f8fafc', padding: '1rem 1.25rem', borderRadius: '12px', border: '1px solid #e2e8f0', marginBottom: '1.25rem' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.75rem', flexWrap: 'wrap', gap: '0.5rem' }}>
            <div style={{ fontSize: '0.85rem', fontWeight: 800, color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              Select Students for {certType} Certificate ({selectedStudentIds.length} / {filteredStudents.length} selected)
            </div>

            <button
              onClick={handleToggleSelectAll}
              style={{ background: 'none', border: 'none', color: '#2563eb', fontSize: '0.8rem', fontWeight: 700, cursor: 'pointer', textDecoration: 'underline' }}
            >
              {selectedStudentIds.length === filteredStudents.length ? 'Deselect All' : 'Select All Students'}
            </button>
          </div>

          {filteredStudents.length === 0 ? (
            <div style={{ fontSize: '0.85rem', color: '#64748b', fontStyle: 'italic', padding: '0.5rem 0' }}>
              No students found in this course and batch.
            </div>
          ) : (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(220px, 1fr))', gap: '0.6rem', maxHeight: '160px', overflowY: 'auto', paddingRight: '0.25rem' }}>
              {filteredStudents.map(student => {
                const isSelected = selectedStudentIds.includes(student.id);
                return (
                  <div
                    key={student.id}
                    onClick={() => handleToggleStudent(student.id)}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '0.5rem',
                      background: isSelected ? (certType === 'CAT' ? 'rgba(37, 99, 235, 0.08)' : 'rgba(217, 119, 6, 0.08)') : 'white',
                      border: `1px solid ${isSelected ? (certType === 'CAT' ? '#93c5fd' : '#fde68a') : '#cbd5e1'}`,
                      padding: '0.45rem 0.65rem',
                      borderRadius: '8px',
                      cursor: 'pointer',
                      fontSize: '0.8rem',
                      fontWeight: isSelected ? 700 : 500,
                      color: isSelected ? '#0f172a' : '#475569',
                      userSelect: 'none'
                    }}
                  >
                    {isSelected ? <CheckSquare size={16} color={certType === 'CAT' ? '#2563eb' : '#d97706'} /> : <Square size={16} color="#94a3b8" />}
                    <span style={{ whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                      {student.name} {student.roll_number && `(#${student.roll_number})`}
                    </span>
                  </div>
                );
              })}
            </div>
          )}

        </div>

        {/* Live Code Preview */}
        <div style={{ background: '#f1f5f9', padding: '0.85rem 1.25rem', borderRadius: '10px', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem', border: '1px solid #e2e8f0' }}>
          <div style={{ fontSize: '0.85rem', color: '#334155' }}>
            Target: <strong>{selectedStudentIds.length} student(s)</strong> selected for <strong>{certType}</strong>
          </div>
          <div style={{ fontSize: '0.85rem', color: '#0f172a' }}>
            Code Format Preview: <code style={{ background: '#e2e8f0', color: certType === 'CAT' ? '#2563eb' : '#b45309', padding: '0.25rem 0.6rem', borderRadius: '6px', fontWeight: 800 }}>{certType}{fourDigitBatchCode || 'XXXX'}/{new Date().getFullYear().toString().slice(-2)}/001</code>
          </div>
        </div>

        <button
          onClick={handleGenerateBatchCertificates}
          disabled={generating}
          className="btn btn-primary"
          style={{ padding: '0.75rem 1.5rem', borderRadius: '10px', fontWeight: 800, background: certType === 'CAT' ? 'linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%)' : 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', border: 'none', color: 'white', cursor: 'pointer', display: 'inline-flex', alignItems: 'center', gap: '0.5rem' }}
        >
          {certType === 'CAT' ? <Keyboard size={18} /> : <Award size={18} />} 
          {generating ? `Generating ${certType} Certificates...` : `Generate ${selectedStudentIds.length} ${certType} Certificate Records`}
        </button>
      </div>

      {/* Certificates List Table */}
      <div className="glass-card" style={{ padding: '1.5rem', borderRadius: '16px' }}>
        
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem', marginBottom: '1.25rem' }}>
          <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <ShieldCheck size={20} className="text-primary" /> Issued Certificate Registry ({certificates.length})
          </h3>

          <div style={{ position: 'relative', width: '260px' }}>
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by student, code, or CAT/DPT..."
              style={{ width: '100%', padding: '0.5rem 0.75rem 0.5rem 2.25rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
            />
            <Search size={16} style={{ position: 'absolute', left: '0.75rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
          </div>
        </div>

        {loading ? (
          <div style={{ padding: '3rem', textAlign: 'center', color: '#64748b' }}>Loading certificates...</div>
        ) : filteredCertificates.length === 0 ? (
          <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.01)', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
            No certificate records found matching your query. Generate certificates using the form above.
          </div>
        ) : (
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Certificate Serial Code</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Certificate / Course Title</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Issue Date</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                  <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredCertificates.map(cert => {
                  const isTypingCert = cert.certificate_code.startsWith('CAT') || cert.certificate_type === 'CAT';
                  return (
                    <tr key={cert.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {isTypingCert ? (
                          <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Keyboard size={12} /> CAT
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem', display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Award size={12} /> DPT
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {cert.student_name}
                        {cert.roll_number && <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 500 }}>(Roll #{cert.roll_number})</span>}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        <code style={{ background: '#f1f5f9', color: isTypingCert ? '#1e40af' : '#b45309', padding: '0.2rem 0.5rem', borderRadius: '6px', fontWeight: 800, border: '1px solid #cbd5e1' }}>
                          {cert.certificate_code}
                        </code>
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                        {cert.course_name} (Batch {cert.batch_number})
                      </td>

                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {new Date(cert.issue_date).toLocaleDateString()}
                      </td>

                      <td style={{ padding: '0.85rem 1rem' }}>
                        {cert.status === 'valid' ? (
                          <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <CheckCircle2 size={13} /> Valid
                          </span>
                        ) : (
                          <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '0.2rem 0.6rem', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 700, display: 'inline-flex', alignItems: 'center', gap: '0.25rem' }}>
                            <AlertCircle size={13} /> Revoked
                          </span>
                        )}
                      </td>

                      <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                        <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                          
                          {/* Download QR PNG */}
                          <button
                            onClick={() => handleDownloadQrPng(cert)}
                            title="Download High-Res QR Code (PNG)"
                            style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: '#f1f5f9', border: '1px solid #cbd5e1', color: '#0f172a', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Download size={14} className="text-primary" /> QR PNG
                          </button>

                          {/* Print / Preview Certificate */}
                          <button
                            onClick={() => handleOpenPreview(cert)}
                            title="Print Certificate Diploma"
                            style={{ padding: '0.4rem 0.65rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 700, cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                          >
                            <Printer size={14} /> Diploma
                          </button>

                          {/* Public Link */}
                          <a
                            href={`/verify?code=${encodeURIComponent(cert.certificate_code)}`}
                            target="_blank"
                            rel="noreferrer"
                            title="Open Public Verification Link"
                            style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: '#475569', cursor: 'pointer', display: 'flex', alignItems: 'center' }}
                          >
                            <ExternalLink size={14} />
                          </a>

                          {/* Toggle Status */}
                          <button
                            onClick={() => handleToggleStatus(cert)}
                            title={cert.status === 'valid' ? 'Revoke Certificate' : 'Re-activate Certificate'}
                            style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#f8fafc', border: '1px solid #e2e8f0', color: cert.status === 'valid' ? '#dc2626' : '#16a34a', cursor: 'pointer' }}
                          >
                            <RefreshCw size={14} />
                          </button>

                          {/* Delete */}
                          <button
                            onClick={() => handleDeleteCert(cert.id)}
                            title="Delete Record"
                            style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', cursor: 'pointer' }}
                          >
                            <Trash2 size={14} />
                          </button>

                        </div>
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

      </div>

      {/* --- DIPLOMA PRINT PREVIEW MODAL --- */}
      {activePreviewCert && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '850px', maxHeight: '90vh', overflowY: 'auto', borderRadius: '16px', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', padding: '2rem' }}>
            
            {/* Action Bar inside modal */}
            <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '1rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                {activePreviewCert.certificate_code.startsWith('CAT') ? 'Typing Certificate Preview' : 'Diploma Certificate Preview'}
              </h4>
              <div style={{ display: 'flex', gap: '0.75rem' }}>
                <button
                  onClick={() => window.print()}
                  className="btn btn-primary"
                  style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', background: activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
                >
                  <Printer size={16} /> Print / Save PDF
                </button>
                <button
                  onClick={() => setActivePreviewCert(null)}
                  className="btn btn-outline"
                  style={{ padding: '0.5rem 1rem', borderRadius: '8px', borderColor: '#cbd5e1', cursor: 'pointer' }}
                >
                  Close
                </button>
              </div>
            </div>

            {/* Print Container Document */}
            <div className="printable-diploma" style={{ border: `12px double ${activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706'}`, padding: '3rem 2.5rem', textAlign: 'center', background: '#fffdfa', position: 'relative', color: '#0f172a', fontFamily: 'serif' }}>
              
              {/* Corner Ornaments */}
              <div style={{ position: 'absolute', top: '15px', left: '15px', fontSize: '1.5rem', color: activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706' }}>❖</div>
              <div style={{ position: 'absolute', top: '15px', right: '15px', fontSize: '1.5rem', color: activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706' }}>❖</div>
              <div style={{ position: 'absolute', bottom: '15px', left: '15px', fontSize: '1.5rem', color: activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706' }}>❖</div>
              <div style={{ position: 'absolute', bottom: '15px', right: '15px', fontSize: '1.5rem', color: activePreviewCert.certificate_code.startsWith('CAT') ? '#2563eb' : '#d97706' }}>❖</div>

              <img 
                src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" 
                alt="Academy Logo" 
                style={{ height: '70px', margin: '0 auto 1rem auto', display: 'block' }}
              />

              <h1 style={{ fontSize: '2.4rem', fontWeight: 900, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#0f172a', margin: '0 0 0.25rem 0' }}>
                Academy of Excellence
              </h1>
              <p style={{ fontFamily: 'sans-serif', fontSize: '0.85rem', color: activePreviewCert.certificate_code.startsWith('CAT') ? '#1d4ed8' : '#b45309', textTransform: 'uppercase', letterSpacing: '0.2em', fontWeight: 800, margin: '0 0 2rem 0' }}>
                {activePreviewCert.certificate_code.startsWith('CAT') ? 'Certificate of Typing Proficiency' : 'Certificate of Completion'}
              </p>

              <p style={{ fontFamily: 'sans-serif', fontSize: '0.95rem', color: '#475569', margin: '0 0 0.5rem 0' }}>
                This is to certify that
              </p>

              <h2 style={{ fontSize: '2.5rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', textDecoration: `underline ${activePreviewCert.certificate_code.startsWith('CAT') ? '#3b82f6' : '#f59e0b'} 2px`, textUnderlineOffset: '8px' }}>
                {activePreviewCert.student_name}
              </h2>

              <p style={{ fontFamily: 'sans-serif', fontSize: '0.95rem', color: '#475569', maxWidth: '560px', margin: '0 auto 1.5rem auto', lineHeight: 1.6 }}>
                {activePreviewCert.certificate_code.startsWith('CAT')
                  ? 'has successfully satisfied all speed, accuracy, and proficiency standards for'
                  : 'has successfully completed the prescribed curriculum and evaluation for the program'}
              </p>

              <h3 style={{ fontSize: '1.6rem', fontWeight: 800, color: activePreviewCert.certificate_code.startsWith('CAT') ? '#1d4ed8' : '#b45309', margin: '0 0 0.4rem 0' }}>
                {activePreviewCert.course_name}
              </h3>
              <p style={{ fontFamily: 'sans-serif', fontSize: '0.9rem', color: '#64748b', fontWeight: 700, margin: '0 0 2rem 0' }}>
                Batch {activePreviewCert.batch_number} • {activePreviewCert.grade_description || 'Passed Evaluation'}
              </p>

              {/* Bottom Row: QR & Signatures */}
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid #e2e8f0', fontFamily: 'sans-serif' }}>
                
                {/* Issue Date */}
                <div style={{ textAlign: 'left', fontSize: '0.85rem', color: '#475569' }}>
                  <strong>Date of Issue:</strong><br />
                  {new Date(activePreviewCert.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}
                  <div style={{ marginTop: '0.75rem', fontSize: '0.75rem', color: '#64748b' }}>
                    Serial: <code style={{ fontWeight: 800, color: '#0f172a' }}>{activePreviewCert.certificate_code}</code>
                  </div>
                </div>

                {/* Embedded QR Code */}
                <div style={{ textAlign: 'center' }}>
                  {previewQrUrl && (
                    <img src={previewQrUrl} alt="QR Code" style={{ width: '105px', height: '105px', display: 'block', margin: '0 auto' }} />
                  )}
                  <span style={{ fontSize: '0.65rem', color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>
                    Scan to Verify
                  </span>
                </div>

                {/* Signature */}
                <div style={{ textAlign: 'right', fontSize: '0.85rem', color: '#475569' }}>
                  <div style={{ height: '35px', borderBottom: '1px solid #0f172a', width: '150px', marginLeft: 'auto', marginBottom: '0.3rem' }} />
                  <strong>Authorized Signatory</strong><br />
                  <span style={{ fontSize: '0.75rem', color: '#64748b' }}>Academy Director</span>
                </div>

              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
