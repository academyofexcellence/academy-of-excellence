import { useState, useEffect } from 'react';
import { useSearchParams, useParams, Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { CertificateRecord } from '../lib/types';
import { ShieldCheck, XCircle, Search, Award, Calendar, CheckCircle2, FileCheck, ArrowLeft, Printer, ExternalLink } from 'lucide-react';
import QRCode from 'qrcode';

export default function VerifyCertificate() {
  const [searchParams, setSearchParams] = useSearchParams();
  const params = useParams();
  
  // Get code from query string ?code=... or route param /verify/*
  const queryCode = searchParams.get('code');
  const pathCode = params['*'];
  
  const initialCode = queryCode || pathCode || '';

  const [inputCode, setInputCode] = useState(initialCode);
  const [searchedCode, setSearchedCode] = useState(initialCode);
  const [certificate, setCertificate] = useState<CertificateRecord | null>(null);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [qrDataUrl, setQrDataUrl] = useState<string>('');

  useEffect(() => {
    if (initialCode) {
      handleSearchCode(initialCode);
    }
  }, [queryCode, pathCode]);

  const handleSearchCode = async (codeToVerify: string) => {
    const cleanCode = codeToVerify.trim();
    if (!cleanCode) return;

    setLoading(true);
    setSearched(true);
    setSearchedCode(cleanCode);
    setCertificate(null);

    try {
      const { data, error } = await supabase
        .from('certificates')
        .select('*')
        .ilike('certificate_code', cleanCode)
        .maybeSingle();

      if (error) throw error;
      setCertificate(data as CertificateRecord);

      if (data) {
        // Generate high-res QR for visual confirmation
        const verifyUrl = `${window.location.origin}/verify?code=${encodeURIComponent(data.certificate_code)}`;
        const url = await QRCode.toDataURL(verifyUrl, {
          width: 300,
          margin: 1,
          color: { dark: '#0f172a', light: '#ffffff' }
        });
        setQrDataUrl(url);
      }
    } catch (err) {
      console.error('Error fetching certificate:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleFormSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputCode.trim()) return;
    setSearchParams({ code: inputCode.trim() });
    handleSearchCode(inputCode.trim());
  };

  return (
    <div style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: '#f8fafc', padding: '2rem 1rem' }}>
      <div style={{ maxWidth: '850px', margin: '0 auto' }}>
        
        {/* Header */}
        <div style={{ textAlign: 'center', marginBottom: '2.5rem' }}>
          <Link to="/" style={{ display: 'inline-block', marginBottom: '1rem' }}>
            <img 
              src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/academylogom.svg" 
              alt="Academy of Excellence Logo" 
              style={{ height: '75px', filter: 'drop-shadow(0 4px 12px rgba(255,255,255,0.15))' }}
            />
          </Link>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, margin: '0 0 0.5rem 0', background: 'linear-gradient(135deg, #fbbf24 0%, #f59e0b 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
            Official Certificate Verification Portal
          </h1>
          <p style={{ color: '#94a3b8', fontSize: '0.95rem', margin: 0 }}>
            Verify authentic credentials & graduation records issued by Academy of Excellence.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ background: 'rgba(255, 255, 255, 0.05)', backdropFilter: 'blur(12px)', border: '1px solid rgba(255, 255, 255, 0.12)', borderRadius: '16px', padding: '1.25rem', marginBottom: '2rem', boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.3)' }}>
          <form onSubmit={handleFormSubmit} style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
            <div style={{ flex: 1, position: 'relative', minWidth: '240px' }}>
              <input
                type="text"
                value={inputCode}
                onChange={(e) => setInputCode(e.target.value)}
                placeholder="Enter Certificate ID (e.g. DPT0208/26/001)"
                style={{
                  width: '100%',
                  padding: '0.85rem 1rem 0.85rem 2.75rem',
                  borderRadius: '10px',
                  border: '1px solid rgba(255, 255, 255, 0.2)',
                  background: 'rgba(15, 23, 42, 0.8)',
                  color: 'white',
                  fontSize: '1rem',
                  fontWeight: 600,
                  outline: 'none'
                }}
              />
              <Search size={20} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: '#94a3b8' }} />
            </div>
            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ padding: '0.85rem 1.75rem', borderRadius: '10px', fontWeight: 700, fontSize: '0.95rem', background: 'linear-gradient(135deg, #d97706 0%, #b45309 100%)', border: 'none', color: 'white', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.5rem' }}
            >
              {loading ? 'Verifying...' : 'Verify Certificate'}
            </button>
          </form>
        </div>

        {/* Results Container */}
        {loading && (
          <div style={{ textAlign: 'center', padding: '4rem 1rem', background: 'rgba(255,255,255,0.03)', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.08)' }}>
            <div style={{ fontSize: '1.2rem', color: '#fbbf24', fontWeight: 700, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
              <ShieldCheck size={28} className="animate-pulse" /> Validating Credentials with Academy Database...
            </div>
          </div>
        )}

        {!loading && searched && certificate && certificate.status === 'valid' && (
          <div className="certificate-verification-card" style={{ background: '#ffffff', color: '#0f172a', borderRadius: '24px', overflow: 'hidden', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)', border: '4px solid #f59e0b', position: 'relative' }}>
            
            {/* Top Verification Banner */}
            <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.25rem 2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', borderBottom: '2px solid #f59e0b' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                <div style={{ background: '#16a34a', borderRadius: '50%', padding: '0.4rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  <ShieldCheck size={26} color="white" />
                </div>
                <div>
                  <div style={{ fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#fbbf24', fontWeight: 800 }}>
                    Official Accreditation
                  </div>
                  <div style={{ fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>
                    Authentic & Verified Certificate
                  </div>
                </div>
              </div>
              <div style={{ background: 'rgba(34, 197, 94, 0.15)', border: '1px solid #22c55e', color: '#4ade80', padding: '0.35rem 0.85rem', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <CheckCircle2 size={16} /> Status: Valid
              </div>
            </div>

            {/* Body Content */}
            <div style={{ padding: '2.5rem 2rem' }}>
              
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '2rem', marginBottom: '2rem' }}>
                
                {/* Left Metadata */}
                <div style={{ flex: 1, minWidth: '280px' }}>
                  <div style={{ fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b', fontWeight: 700, marginBottom: '0.25rem' }}>
                    Certificate Holder
                  </div>
                  <h2 style={{ fontSize: '2.2rem', fontWeight: 900, color: '#0f172a', margin: '0 0 1rem 0', fontFamily: 'serif' }}>
                    {certificate.student_name}
                  </h2>

                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '1.25rem', background: '#f8fafc', padding: '1.25rem', borderRadius: '16px', border: '1px solid #e2e8f0' }}>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Course Program</span>
                      <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{certificate.course_name}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Batch Number</span>
                      <strong style={{ fontSize: '1rem', color: '#1e293b' }}>Batch {certificate.batch_number}</strong>
                    </div>
                    {certificate.roll_number && (
                      <div>
                        <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Roll Number</span>
                        <strong style={{ fontSize: '1rem', color: '#1e293b' }}>#{certificate.roll_number}</strong>
                      </div>
                    )}
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Issue Date</span>
                      <strong style={{ fontSize: '1rem', color: '#1e293b' }}>{new Date(certificate.issue_date).toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' })}</strong>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Performance Grade</span>
                      <span style={{ fontSize: '0.9rem', fontWeight: 800, color: '#b45309', background: 'rgba(245, 158, 11, 0.1)', padding: '0.15rem 0.5rem', borderRadius: '6px', display: 'inline-block', marginTop: '0.2rem' }}>
                        {certificate.grade_description || 'Completed Course'}
                      </span>
                    </div>
                    <div>
                      <span style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 700, display: 'block' }}>Verification Serial</span>
                      <code style={{ fontSize: '0.95rem', fontWeight: 800, color: '#0f172a', background: '#e2e8f0', padding: '0.2rem 0.5rem', borderRadius: '6px', display: 'inline-block', marginTop: '0.2rem' }}>
                        {certificate.certificate_code}
                      </code>
                    </div>
                  </div>
                </div>

                {/* Right QR Badge */}
                <div style={{ textAlign: 'center', background: '#f8fafc', border: '2px dashed #cbd5e1', padding: '1.25rem', borderRadius: '20px', minWidth: '180px' }}>
                  {qrDataUrl ? (
                    <img src={qrDataUrl} alt="Certificate QR Code" style={{ width: '140px', height: '140px', display: 'block', margin: '0 auto 0.5rem auto' }} />
                  ) : (
                    <div style={{ width: '140px', height: '140px', background: '#e2e8f0', borderRadius: '12px', margin: '0 auto 0.5rem auto' }} />
                  )}
                  <div style={{ fontSize: '0.7rem', color: '#64748b', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Digital Verification Code
                  </div>
                  <div style={{ fontSize: '0.8rem', fontWeight: 800, color: '#0f172a', marginTop: '0.2rem' }}>
                    {certificate.certificate_code}
                  </div>
                </div>

              </div>

              {/* Institution Seal & Verification Statement */}
              <div style={{ borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                  <Award size={32} style={{ color: '#d97706' }} />
                  <div style={{ fontSize: '0.8rem', color: '#475569' }}>
                    <strong>Academy of Excellence Verification Authority</strong><br />
                    This record confirms that the individual above completed all requirements in good standing.
                  </div>
                </div>

                <button
                  onClick={() => window.print()}
                  className="btn btn-outline"
                  style={{ padding: '0.6rem 1.25rem', borderRadius: '8px', fontSize: '0.85rem', fontWeight: 700, display: 'flex', alignItems: 'center', gap: '0.4rem', border: '1px solid #cbd5e1', color: '#1e293b', cursor: 'pointer' }}
                >
                  <Printer size={16} /> Print Verification Page
                </button>
              </div>

            </div>
          </div>
        )}

        {!loading && searched && (!certificate || certificate.status === 'revoked') && (
          <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '2px solid #ef4444', borderRadius: '20px', padding: '2.5rem 2rem', textAlign: 'center', color: 'white' }}>
            <XCircle size={56} style={{ color: '#f87171', margin: '0 auto 1rem auto' }} />
            <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#f87171', margin: '0 0 0.5rem 0' }}>
              Certificate Not Found or Revoked
            </h2>
            <p style={{ color: '#cbd5e1', maxWidth: '520px', margin: '0 auto 1.5rem auto', fontSize: '0.95rem' }}>
              No active certificate was found for code <strong style={{ color: 'white' }}>"{searchedCode}"</strong>. Please double-check the code printed on the document or contact the Academy administration.
            </p>
            <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', flexWrap: 'wrap' }}>
              <button
                onClick={() => { setInputCode(''); setSearched(false); setCertificate(null); }}
                className="btn btn-outline"
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', color: 'white', borderColor: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}
              >
                Try Another Code
              </button>
              <Link
                to="/"
                className="btn btn-primary"
                style={{ padding: '0.65rem 1.25rem', borderRadius: '8px', background: '#d97706', color: 'white', textDecoration: 'none', fontWeight: 700 }}
              >
                Return to Academy Home
              </Link>
            </div>
          </div>
        )}

        {!searched && (
          <div style={{ textAlign: 'center', padding: '3rem 1.5rem', background: 'rgba(255, 255, 255, 0.02)', borderRadius: '20px', border: '1px border rgba(255,255,255,0.06)' }}>
            <FileCheck size={48} style={{ color: '#fbbf24', opacity: 0.8, marginBottom: '1rem' }} />
            <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '0 0 0.5rem 0' }}>Enter a Certificate Code Above</h3>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', maxWidth: '440px', margin: '0 auto' }}>
              Format example: <code style={{ color: '#fbbf24', background: 'rgba(251, 191, 36, 0.1)', padding: '0.2rem 0.5rem', borderRadius: '4px' }}>DPT0208/26/001</code>. Scanning the QR code on any certificate will automatically open its verification record here.
            </p>
          </div>
        )}

        {/* Footer Navigation */}
        <div style={{ textAlign: 'center', marginTop: '3rem', fontSize: '0.85rem', color: '#64748b' }}>
          <Link to="/" style={{ color: '#94a3b8', textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: '0.4rem' }}>
            <ArrowLeft size={16} /> Back to Academy of Excellence Website
          </Link>
        </div>

      </div>
    </div>
  );
}
