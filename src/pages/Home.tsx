import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { 
  ArrowRight, 
  CheckCircle, 
  Briefcase, 
  Globe, 
  BookOpen, 
  Star, 
  Award, 
  Users, 
  GraduationCap, 
  Quote, 
  Send, 
  Clock,
  Phone,
  Mail,
  MapPin
} from 'lucide-react';

interface Testimonial {
  id: string;
  student_name: string;
  course: string;
  feedback_text: string;
  image_url: string;
}

const Home = () => {
  const [testimonials, setTestimonials] = useState<Testimonial[]>([]);
  const [loadingTestimonials, setLoadingTestimonials] = useState(true);
  
  // Form states
  const [enquiry, setEnquiry] = useState({
    name: '',
    email: '',
    phone: '',
    course: 'Translation & Office Admin',
    message: ''
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'success' | 'error'>('idle');

  useEffect(() => {
    const fetchTestimonials = async () => {
      const mockTestimonials: Testimonial[] = [
        {
          id: '1',
          student_name: 'Mohammed Shaheen',
          course: 'Admin / Arabic Translator, Gulf Dev. Co., Riyadh',
          feedback_text: 'Transforming lives through translation, thank you Academy of Excellence.',
          image_url: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=150&h=150&q=80'
        },
        {
          id: '2',
          student_name: 'Havva Nihma',
          course: 'HR Executive, Cygnus Solutions, Mangalore',
          feedback_text: "After completing my course and internship at the Academy of Excellence, I didn't just gain skills, I found direction, confidence, and a clear path forward. Our team supports the dynamic operations of Expertise Saudi Company.",
          image_url: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?auto=format&fit=crop&w=150&h=150&q=80'
        },
        {
          id: '3',
          student_name: 'Nafiya K',
          course: 'Operation Associate, The Visa Guy, Calicut',
          feedback_text: 'The training polished my skills and boosted my confidence. Today, I proudly work as an Operation Associate in a global MNC.',
          image_url: 'https://images.unsplash.com/photo-1438761681033-6461ffad8d80?auto=format&fit=crop&w=150&h=150&q=80'
        },
        {
          id: '4',
          student_name: 'Abdullah',
          course: 'Business Associate, Al Thewakkal Group, Abu Dhabi',
          feedback_text: 'What started in Kottakkal is now taking me to Abu Dhabi. Grateful to my Trainers for preparing me for real-world success.',
          image_url: 'https://images.unsplash.com/photo-1500648767791-00dcc994a43e?auto=format&fit=crop&w=150&h=150&q=80'
        },
        {
          id: '5',
          student_name: 'Mohammad Muneebullah',
          course: 'Arabic Quality Analyst, Amazon',
          feedback_text: 'The Academy empowers you to think, implement, and manage moving beyond memorizing and forgetting, towards lasting knowledge and practical skills.',
          image_url: 'https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?auto=format&fit=crop&w=150&h=150&q=80'
        },
        {
          id: '6',
          student_name: 'Safeer. C',
          course: 'Arabic Secretary, Gulf Dev. Co., Riyadh, Saudi Arabia',
          feedback_text: 'The academy provides us with the best faculties to teach. There are native arab speakers and professors from great universities that gives the best touch to the teaching here which helps us to improve ourselves.',
          image_url: 'https://images.unsplash.com/photo-1519085360753-af0119f7cbe7?auto=format&fit=crop&w=150&h=150&q=80'
        }
      ];

      try {
        const { data } = await supabase.from('testimonials').select('*');
        if (data && data.length > 0) {
          setTestimonials(data);
        } else {
          setTestimonials(mockTestimonials);
        }
      } catch (err) {
        setTestimonials(mockTestimonials);
      } finally {
        setLoadingTestimonials(false);
      }
    };

    fetchTestimonials();
  }, []);

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setEnquiry(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmitEnquiry = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    try {
      const { error } = await supabase.from('inquiries').insert([enquiry]);
      if (error) throw error;
      setSubmitStatus('success');
      setEnquiry({
        name: '',
        email: '',
        phone: '',
        course: 'Translation & Office Admin',
        message: ''
      });
    } catch (err) {
      console.error(err);
      setSubmitStatus('error');
    } finally {
      setSubmitting(false);
      setTimeout(() => setSubmitStatus('idle'), 5000);
    }
  };

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id);
    if (element) {
      element.scrollIntoView({ behavior: 'smooth' });
    }
  };

  return (
    <div className="bg-grid-pattern">
      {/* Hero Section */}
      <section className="hero">
        <div className="hero-blob animate-float-1" style={{ top: '-10%', right: '-5%' }}></div>
        <div className="hero-blob animate-float-2" style={{ bottom: '-15%', left: '-10%', width: '500px', height: '500px', background: 'radial-gradient(circle, rgba(201,156,51,0.1) 0%, rgba(253,251,247,0) 70%)' }}></div>
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="grid grid-2" style={{ alignItems: 'center', gap: '3rem' }}>
            <div className="hero-content">
              <span className="badge">
                <Award size={16} className="text-primary" /> Ranked #1 Bilingual Training Academy
              </span>
              
              <h1 className="heading-xl">
                Shape Your Future with <span className="text-gradient">Excellence</span>
              </h1>
              
              <p className="subtitle mt-4 mb-4" style={{ margin: '1.5rem 0', fontSize: '1.25rem', lineHeight: '1.7', textAlign: 'left' }}>
                Providing professional diploma courses for translation, language proficiency, and corporate administration. Build a strong competitive edge with hands-on bilingual training.
              </p>
              
              <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                <button onClick={() => scrollToSection('programs')} className="btn btn-primary">
                  Explore Programs <ArrowRight size={18} />
                </button>
                <button onClick={() => scrollToSection('enquiry')} className="btn btn-outline">
                  Contact Admissions
                </button>
              </div>
            </div>
            
            <div className="hero-img-container">
              <div className="hero-img-glow"></div>
              <div className="glass-card" style={{ padding: '0.8rem', borderRadius: '24px', boxShadow: '0 20px 50px rgba(201,156,51,0.15)', border: '1px solid rgba(201,156,51,0.2)' }}>
                <img 
                  src="https://rcppfmlyvackmemjousp.supabase.co/storage/v1/object/public/gallery-images/photo_2026-06-05_19-28-51.jpg" 
                  alt="Academy of Excellence Classroom" 
                  style={{ width: '100%', borderRadius: '18px', display: 'block', objectFit: 'cover' }}
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <div className="container" style={{ position: 'relative', zIndex: 20 }}>
        <div className="stats-banner grid grid-3" style={{ padding: '2.5rem 2rem', background: 'linear-gradient(135deg, #a67c22 0%, #c99c33 50%, #e6be65 100%)' }}>
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.7rem', borderRadius: '50%', marginBottom: '0.5rem', display: 'inline-flex' }}>
              <Clock size={24} />
            </div>
            <div className="stat-num">7+</div>
            <div className="stat-label">Years of Educational Impact</div>
          </div>
          
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.7rem', borderRadius: '50%', marginBottom: '0.5rem', display: 'inline-flex' }}>
              <Users size={24} />
            </div>
            <div className="stat-num">20+</div>
            <div className="stat-label">Successful Batches</div>
          </div>
          
          <div className="stat-item" style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
            <div style={{ background: 'rgba(255,255,255,0.15)', padding: '0.7rem', borderRadius: '50%', marginBottom: '0.5rem', display: 'inline-flex' }}>
              <GraduationCap size={24} />
            </div>
            <div className="stat-num">100+</div>
            <div className="stat-label">Career Placements & Alumni</div>
          </div>
        </div>
      </div>

      {/* About & Why Choose Us Section */}
      <section className="section-padding">
        <div className="container">
          <div className="text-center mb-4">
            <h2 className="heading-lg">Why We Stand <span className="text-gradient">Apart</span></h2>
            <p className="subtitle">Bridging the gap between academic education and corporate readiness since 2017</p>
          </div>
          
          <div className="grid grid-2" style={{ gap: '2.5rem', alignItems: 'stretch' }}>
            {/* About Card */}
            <div className="glass-card" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', border: '1px solid rgba(201, 156, 51, 0.15)' }}>
              <div>
                <span className="badge" style={{ marginBottom: '1rem' }}>Our Legacy</span>
                <h3 className="heading-lg" style={{ fontSize: '1.8rem', marginBottom: '1.2rem' }}>About Our Academy</h3>
                <p style={{ color: 'var(--text-muted)', lineHeight: '1.8', fontSize: '1.05rem' }}>
                  Founded in 2017 with a vision to optimize career growth and enhance learning outcomes, the Academy of Excellence has been at the forefront of language and administrative training. We provide diploma courses for language proficiency and professional development through collaborative partnerships with renowned global institutions.
                </p>
              </div>
              <div style={{ marginTop: '2.5rem', display: 'flex', alignItems: 'center', gap: '1.2rem', padding: '1rem', background: 'rgba(201, 156, 51, 0.05)', borderRadius: '16px', border: '1px solid rgba(201, 156, 51, 0.1)' }}>
                <div style={{ background: 'var(--primary)', color: 'white', padding: '0.8rem', borderRadius: '50%', display: 'flex' }}>
                  <Star size={24} />
                </div>
                <div>
                  <h4 style={{ margin: 0, fontWeight: 700 }}>Premium Standard Instruction</h4>
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)' }}>Affiliated & recognized standard curriculum</p>
                </div>
              </div>
            </div>

            {/* Why Choose Us Redesigned Grid */}
            <div className="grid grid-2" style={{ gap: '1.5rem' }}>
              <div className="glass-card why-card">
                <div className="icon-container">
                  <Briefcase size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Bilingual Training</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Practical hands-on bilingual training doing real translation and administrative tasks.</p>
              </div>

              <div className="glass-card why-card">
                <div className="icon-container">
                  <Globe size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Native Interaction</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Direct communication sessions with Arab natives via organized visits.</p>
              </div>

              <div className="glass-card why-card">
                <div className="icon-container">
                  <Users size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Expert Mentors</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Learn from gulf-experienced practitioners and native Arab professors.</p>
              </div>

              <div className="glass-card why-card">
                <div className="icon-container">
                  <CheckCircle size={24} />
                </div>
                <h4 style={{ fontSize: '1.1rem', fontWeight: 700, marginBottom: '0.5rem' }}>Strict Language Policy</h4>
                <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.6' }}>Immersive Arabic-English environment on campus to fast-track fluency.</p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Programs Preview Section */}
      <section id="programs" className="section-padding" style={{ backgroundColor: 'rgba(255,255,255,0.7)', backdropFilter: 'blur(10px)' }}>
        <div className="container text-center">
          <span className="badge">Curriculum & Courses</span>
          <h2 className="heading-lg mb-2">Our Specialized <span className="text-gradient">Programs</span></h2>
          <p className="subtitle mb-4">Equipping students with industry-validated skills for standard translation and administration.</p>
          
          <div className="grid grid-3" style={{ marginTop: '3rem' }}>
            {/* Program 1 */}
            <div className="glass-card program-card text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <span className="duration-tag">4 Months</span>
              <div>
                <div style={{ display: 'inline-block', background: 'rgba(201,156,51,0.1)', color: 'var(--primary-dark)', padding: '1.2rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
                  <BookOpen size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Translation & Office Admin</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  A comprehensive professional diploma program designed to master corporate communications, translation skills, and administration workflows.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Bilingual Typing Mastery</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Corporate Translation Methods</li>
                </ul>
              </div>
              <button onClick={() => scrollToSection('enquiry')} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Enquire Now
              </button>
            </div>
            
            {/* Program 2 */}
            <div className="glass-card program-card text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <span className="duration-tag">3 Months</span>
              <div>
                <div style={{ display: 'inline-block', background: 'rgba(201,156,51,0.1)', color: 'var(--primary-dark)', padding: '1.2rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
                  <Globe size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Gulf Spoken Arabic</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Immersive conversational training to read, write, and converse fluently with native accents. Designed specifically for Gulf opportunities.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Spoken Dialect Nuances</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Live Spoken Practice Sessions</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Professional Interview Prep</li>
                </ul>
              </div>
              <button onClick={() => scrollToSection('enquiry')} className="btn btn-outline" style={{ width: '100%', justifyContent: 'center' }}>
                Enquire Now
              </button>
            </div>

            {/* Program 3 */}
            <div className="glass-card program-card text-center" style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between', height: '100%' }}>
              <span className="duration-tag" style={{ background: 'rgba(74,222,128,0.2)', color: '#166534' }}>Ecosystem</span>
              <div>
                <div style={{ display: 'inline-block', background: 'rgba(201,156,51,0.1)', color: 'var(--primary-dark)', padding: '1.2rem', borderRadius: '20px', marginBottom: '1.5rem' }}>
                  <Star size={32} />
                </div>
                <h3 style={{ fontSize: '1.4rem', fontWeight: 700, marginBottom: '1rem' }}>Rayan Platform</h3>
                <p style={{ fontSize: '0.95rem', color: 'var(--text-muted)', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                  Our highly interactive digital platform focused on Quranic vocabulary, interactive language quizzes, and customized progress tracking.
                </p>
                <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 2rem 0', display: 'flex', flexDirection: 'column', gap: '0.6rem', alignItems: 'center', fontSize: '0.9rem', color: 'var(--text-main)', fontWeight: 500 }}>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Vocabulary Building Exercises</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> Gamified Progress Ranks</li>
                  <li style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={16} className="text-primary" /> 100% Free Virtual Access</li>
                </ul>
              </div>
              <a href="https://rayan-academy-zeta.vercel.app/" target="_blank" rel="noopener noreferrer" className="btn btn-outline" style={{ width: '100%', justifyContent: 'center', textDecoration: 'none' }}>
                Visit Rayan
              </a>
            </div>
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="section-padding" style={{ overflow: 'hidden' }}>
        <div className="container">
          <div className="text-center mb-4">
            <span className="badge">Student Success</span>
            <h2 className="heading-lg">Alumni <span className="text-gradient">Testimonials</span></h2>
            <p className="subtitle">Real feedback from students who transformed their careers with us</p>
          </div>
        </div>

        {loadingTestimonials ? (
          <div className="text-center py-4" style={{ color: 'var(--text-muted)' }}>Loading testimonials...</div>
        ) : (
          <div style={{ marginTop: '3rem' }}>
            {/* Single Row - Right to Left */}
            <div className="marquee-wrapper">
              <div className="marquee-track-left">
                {testimonials.map(item => (
                  <div key={item.id} className="glass-card testimonial-card-marquee">
                    <Quote size={40} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'rgba(201,156,51,0.15)' }} />
                    <div>
                      <div style={{ display: 'flex', color: '#fbbf24', gap: '0.2rem', marginBottom: '1rem' }}>
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                      </div>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-main)', lineHeight: '1.7', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        "{item.feedback_text}"
                      </p>
                    </div>
                    
                    <div style={{ borderTop: '1px solid rgba(201,156,51,0.1)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{item.student_name}</h4>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--primary-dark)', fontWeight: 500 }}>{item.course}</p>
                    </div>
                  </div>
                ))}
                {/* Duplicate top row for seamless infinite scrolling */}
                {testimonials.map(item => (
                  <div key={`${item.id}-dup`} className="glass-card testimonial-card-marquee">
                    <Quote size={40} style={{ position: 'absolute', top: '1.5rem', right: '1.5rem', color: 'rgba(201,156,51,0.15)' }} />
                    <div>
                      <div style={{ display: 'flex', color: '#fbbf24', gap: '0.2rem', marginBottom: '1rem' }}>
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                        <Star size={16} fill="#fbbf24" />
                      </div>
                      <p style={{ fontStyle: 'italic', color: 'var(--text-main)', lineHeight: '1.7', fontSize: '0.95rem', marginBottom: '1.5rem' }}>
                        "{item.feedback_text}"
                      </p>
                    </div>
                    
                    <div style={{ borderTop: '1px solid rgba(201,156,51,0.1)', paddingTop: '1rem' }}>
                      <h4 style={{ fontSize: '1rem', margin: 0, fontWeight: 700 }}>{item.student_name}</h4>
                      <p style={{ fontSize: '0.8rem', margin: 0, color: 'var(--primary-dark)', fontWeight: 500 }}>{item.course}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </section>

      {/* Enquiry Form Section */}
      <section id="enquiry" className="section-padding" style={{ backgroundColor: 'var(--bg-dark)', color: 'white', position: 'relative', overflow: 'hidden' }}>
        <div className="hero-blob" style={{ bottom: '-20%', right: '-10%', background: 'radial-gradient(circle, rgba(201,156,51,0.15) 0%, rgba(253,251,247,0) 70%)', width: '500px', height: '500px' }}></div>
        
        <div className="container" style={{ position: 'relative', zIndex: 10 }}>
          <div className="grid grid-2" style={{ alignItems: 'center', gap: '4rem' }}>
            <div>
              <span className="badge" style={{ background: 'rgba(255,255,255,0.1)', color: 'var(--primary-light)', borderColor: 'rgba(255,255,255,0.2)' }}>Admissions Open</span>
              <h2 className="heading-lg" style={{ color: 'white', fontSize: '2.5rem' }}>Start Your Journey <span className="text-gradient" style={{ background: 'linear-gradient(135deg, var(--primary-light) 0%, var(--primary) 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>Today</span></h2>
              <p style={{ opacity: 0.8, fontSize: '1.1rem', lineHeight: '1.8', margin: '1.5rem 0' }}>
                Fill out the quick query form. Our career guidance counselors will reach out to you within 24 hours to guide you through registration, placement scope, and scholarship opportunities.
              </p>
              
              <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', marginTop: '2.5rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem', borderRadius: '12px', color: 'var(--primary-light)', display: 'flex' }}>
                    <Phone size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Phone Support</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>+91 98765 43210</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem', borderRadius: '12px', color: 'var(--primary-light)', display: 'flex' }}>
                    <Mail size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Email Address</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>admissions@academyofexcellence.com</p>
                  </div>
                </div>

                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                  <div style={{ background: 'rgba(255,255,255,0.08)', padding: '0.8rem', borderRadius: '12px', color: 'var(--primary-light)', display: 'flex' }}>
                    <MapPin size={20} />
                  </div>
                  <div>
                    <p style={{ margin: 0, fontSize: '0.85rem', opacity: 0.6 }}>Campus Location</p>
                    <p style={{ margin: 0, fontWeight: 600 }}>2nd Floor, Excellency Plaza, Calicut, Kerala</p>
                  </div>
                </div>
              </div>
            </div>

            <div className="glass-card" style={{ background: 'rgba(255,255,255,0.04)', borderColor: 'rgba(255,255,255,0.1)', padding: '2.5rem' }}>
              <h3 style={{ color: 'white', marginBottom: '1.5rem', fontSize: '1.5rem' }}>Quick Admissions Inquiry</h3>
              
              {submitStatus === 'success' && (
                <div style={{ background: 'rgba(34,197,94,0.2)', border: '1px solid rgb(34,197,94)', color: '#4ade80', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <CheckCircle size={20} /> Thank you! Your inquiry was submitted successfully.
                </div>
              )}

              {submitStatus === 'error' && (
                <div style={{ background: 'rgba(239,68,68,0.2)', border: '1px solid rgb(239,68,68)', color: '#f87171', padding: '1rem', borderRadius: '12px', marginBottom: '1.5rem', fontWeight: 600 }}>
                  Oops! Something went wrong. Please try again.
                </div>
              )}

              <form onSubmit={handleSubmitEnquiry} style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem' }}>
                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Full Name</label>
                  <input 
                    type="text" 
                    name="name"
                    value={enquiry.name}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                    placeholder="Enter your name" 
                    required 
                  />
                </div>

                <div className="grid grid-2" style={{ gap: '1.2rem' }}>
                  <div className="form-group">
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Email Address</label>
                    <input 
                      type="email" 
                      name="email"
                      value={enquiry.email}
                      onChange={handleInputChange}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      placeholder="name@example.com" 
                      required 
                    />
                  </div>
                  <div className="form-group">
                    <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Phone Number</label>
                    <input 
                      type="tel" 
                      name="phone"
                      value={enquiry.phone}
                      onChange={handleInputChange}
                      className="form-input"
                      style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                      placeholder="+91 Phone" 
                      required 
                    />
                  </div>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Program of Interest</label>
                  <select 
                    name="course"
                    value={enquiry.course}
                    onChange={handleInputChange}
                    className="form-input"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white' }}
                  >
                    <option value="Translation & Office Admin" style={{ color: 'black' }}>Translation & Office Admin (4 Months)</option>
                    <option value="Gulf Spoken Arabic" style={{ color: 'black' }}>Gulf Spoken Arabic (3 Months)</option>
                    <option value="Rayan Platform" style={{ color: 'black' }}>Rayan Quran Learning Platform</option>
                  </select>
                </div>

                <div className="form-group">
                  <label style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.8)' }}>Message / Query (Optional)</label>
                  <textarea 
                    name="message"
                    value={enquiry.message}
                    onChange={handleInputChange}
                    rows={3} 
                    className="form-input"
                    style={{ background: 'rgba(255,255,255,0.07)', border: '1px solid rgba(255,255,255,0.1)', color: 'white', resize: 'vertical' }}
                    placeholder="Tell us about your career goals..."
                  />
                </div>

                <button 
                  type="submit" 
                  className="btn btn-primary mt-2" 
                  style={{ width: '100%', justifyContent: 'center', color: 'white', fontWeight: 700 }}
                  disabled={submitting}
                >
                  {submitting ? 'Submitting...' : 'Submit Inquiry'} <Send size={18} />
                </button>
              </form>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-dark" style={{ padding: '4rem 0 2rem 0', borderTop: '1px solid rgba(201,156,51,0.2)', position: 'relative', zIndex: 10 }}>
        <div className="container">
          <div className="grid grid-3" style={{ textAlign: 'left', marginBottom: '3rem', gap: '3rem' }}>
            <div>
              <h3 style={{ color: 'var(--primary)', fontWeight: 800, fontSize: '1.4rem', marginBottom: '1rem' }}>Academy of Excellence</h3>
              <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: '1.7' }}>
                Established in 2017 to empower students with translation expertise and standard billing tools, opening doors to careers in the Middle East and global businesses.
              </p>
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.2rem' }}>Quick Links</h4>
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '0.8rem' }}>
                <li><a onClick={() => scrollToSection('programs')} style={{ color: 'white', opacity: 0.7, textDecoration: 'none', cursor: 'pointer', transition: '0.3s' }}>Programs & Certifications</a></li>
                <li><a onClick={() => scrollToSection('enquiry')} style={{ color: 'white', opacity: 0.7, textDecoration: 'none', cursor: 'pointer', transition: '0.3s' }}>Admissions Helpline</a></li>
                <li><a href="/gallery" style={{ color: 'white', opacity: 0.7, textDecoration: 'none', transition: '0.3s' }}>Life at Academy (Gallery)</a></li>
                <li><a href="/admin" style={{ color: 'white', opacity: 0.7, textDecoration: 'none', transition: '0.3s' }}>Admin Login Portal</a></li>
              </ul>
            </div>
            <div>
              <h4 style={{ color: 'white', fontWeight: 700, marginBottom: '1.2rem' }}>Accreditations</h4>
              <p style={{ opacity: 0.7, fontSize: '0.95rem', lineHeight: '1.7', marginBottom: '1rem' }}>
                Affiliated with recognized administrative bodies. Providing standard certifications verified for professional employment clearance.
              </p>
              <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                <span style={{ fontSize: '0.75rem', background: 'rgba(201,156,51,0.15)', color: 'var(--primary-light)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 600, border: '1px solid rgba(201,156,51,0.2)' }}>Bilingual ISO</span>
                <span style={{ fontSize: '0.75rem', background: 'rgba(201,156,51,0.15)', color: 'var(--primary-light)', padding: '0.3rem 0.8rem', borderRadius: '50px', fontWeight: 600, border: '1px solid rgba(201,156,51,0.2)' }}>Govt Recognized</span>
              </div>
            </div>
          </div>
          
          <div style={{ borderTop: '1px solid rgba(255,255,255,0.07)', paddingTop: '2rem', textAlign: 'center' }}>
            <p style={{ opacity: 0.5, fontSize: '0.85rem', margin: 0 }}>
              &copy; {new Date().getFullYear()} Academy of Excellence. All rights reserved. Designed with premium aesthetics.
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
