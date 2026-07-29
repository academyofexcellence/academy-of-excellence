import { useState, useEffect } from 'react';
import { supabase } from '../../lib/supabase';
import { Course, StudentProfile, StudentFeeProfile, FeePaymentTransaction, AcademyExpense } from '../../lib/types';
import { DollarSign, CreditCard, Wallet, TrendingUp, TrendingDown, RefreshCw, PlusCircle, Search, Printer, Send, Edit3, CheckCircle2, AlertCircle, FileText, X, ArrowUpRight, ArrowDownRight, Calendar, ShieldCheck, Tag } from 'lucide-react';

interface AccountingHubProps {
  coursesList: Course[];
  studentList: StudentProfile[];
}

export default function AccountingHub({ coursesList, studentList }: AccountingHubProps) {
  const [selectedCourseId, setSelectedCourseId] = useState<string>(coursesList[0]?.id || '');
  const [selectedBatchNumber, setSelectedBatchNumber] = useState<number | string>(26);
  const [activeTab, setActiveTab] = useState<'overview' | 'student_fees' | 'expenses' | 'ledger'>('overview');

  // Data states
  const [feeProfiles, setFeeProfiles] = useState<StudentFeeProfile[]>([]);
  const [transactions, setTransactions] = useState<FeePaymentTransaction[]>([]);
  const [expenses, setExpenses] = useState<AcademyExpense[]>([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [searchTerm, setSearchTerm] = useState('');

  // Collect Fee Modal
  const [collectingStudent, setCollectingStudent] = useState<StudentProfile | null>(null);
  const [paymentAmount, setPaymentAmount] = useState<number>(5000);
  const [paymentMode, setPaymentMode] = useState<'gpay_bank' | 'office_cash'>('gpay_bank');
  const [installmentLabel, setInstallmentLabel] = useState<string>('Admission Fee (1st Payment)');
  const [paymentNotes, setPaymentNotes] = useState<string>('');

  // Discount Modal
  const [discountingStudent, setDiscountingStudent] = useState<StudentProfile | null>(null);
  const [standardFee, setStandardFee] = useState<number>(25000);
  const [discountAmount, setDiscountAmount] = useState<number>(0);
  const [discountReason, setDiscountReason] = useState<string>('');

  // Add Expense Modal
  const [showAddExpense, setShowAddExpense] = useState<boolean>(false);
  const [expenseTitle, setExpenseTitle] = useState<string>('');
  const [expenseCategory, setExpenseCategory] = useState<'rent' | 'utilities' | 'salaries' | 'supplies' | 'marketing' | 'maintenance' | 'other'>('supplies');
  const [expenseAmount, setExpenseAmount] = useState<number>(1000);
  const [expenseMode, setExpenseMode] = useState<'office_cash' | 'gpay_bank'>('office_cash');
  const [expenseNotes, setExpenseNotes] = useState<string>('');

  // Printable Receipt Modal
  const [activeReceipt, setActiveReceipt] = useState<{ tx: FeePaymentTransaction; student: StudentProfile | null } | null>(null);

  const selectedCourse = coursesList.find(c => c.id === selectedCourseId);
  const activeStudents = studentList.filter(
    s => s.course_id === selectedCourseId && Number(s.batch_number) === Number(selectedBatchNumber)
  );

  useEffect(() => {
    fetchAllFinancialData();
  }, [selectedCourseId, selectedBatchNumber]);

  const fetchAllFinancialData = async () => {
    setLoading(true);
    try {
      // Fetch fee profiles
      const { data: profileData } = await supabase.from('student_fee_profiles').select('*');
      setFeeProfiles(profileData as StudentFeeProfile[] || []);

      // Fetch payment transactions
      const { data: txData } = await supabase.from('fee_payment_transactions').select('*').order('payment_date', { ascending: false });
      setTransactions(txData as FeePaymentTransaction[] || []);

      // Fetch expenses
      const { data: expData } = await supabase.from('academy_expenses').select('*').order('expense_date', { ascending: false });
      setExpenses(expData as AcademyExpense[] || []);

    } catch (err: any) {
      console.error('Error fetching financial data:', err);
    } finally {
      setLoading(false);
    }
  };

  // --- FINANCIAL BALANCE CALCULATIONS ---
  const totalGpayIncome = transactions.filter(t => t.payment_mode === 'gpay_bank').reduce((sum, t) => sum + Number(t.amount_paid), 0);
  const totalCashIncome = transactions.filter(t => t.payment_mode === 'office_cash').reduce((sum, t) => sum + Number(t.amount_paid), 0);
  const totalIncome = totalGpayIncome + totalCashIncome;

  const totalGpayExpense = expenses.filter(e => e.payment_mode === 'gpay_bank').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalCashExpense = expenses.filter(e => e.payment_mode === 'office_cash').reduce((sum, e) => sum + Number(e.amount), 0);
  const totalExpenses = totalGpayExpense + totalCashExpense;

  const officeCashBalance = totalCashIncome - totalCashExpense;
  const gpayBankBalance = totalGpayIncome - totalGpayExpense;
  const netLiquidity = officeCashBalance + gpayBankBalance;

  // --- SAVE DISCOUNT / AGREED FEE ---
  const handleSaveDiscount = async () => {
    if (!discountingStudent) return;
    try {
      const netAgreed = Math.max(0, standardFee - discountAmount);
      const existingProfile = feeProfiles.find(p => p.student_id === discountingStudent.id);
      const paidSoFar = existingProfile?.total_paid || 0;
      const newBalance = Math.max(0, netAgreed - paidSoFar);

      let newStatus: 'unpaid' | 'partially_paid' | 'fully_paid' = 'unpaid';
      if (paidSoFar >= netAgreed && netAgreed > 0) newStatus = 'fully_paid';
      else if (paidSoFar > 0) newStatus = 'partially_paid';

      const payload = {
        student_id: discountingStudent.id,
        standard_fee: standardFee,
        discount_amount: discountAmount,
        discount_reason: discountReason || null,
        total_agreed_fee: netAgreed,
        total_paid: paidSoFar,
        balance_due: newBalance,
        status: newStatus
      };

      const { error } = await supabase.from('student_fee_profiles').upsert(payload, { onConflict: 'student_id' });
      if (error) throw error;

      setMessage(`✅ Updated fee structure for ${discountingStudent.name}! Net Fee: ₹${netAgreed.toLocaleString()}`);
      setDiscountingStudent(null);
      await fetchAllFinancialData();
    } catch (err: any) {
      console.error('Error saving discount:', err);
      alert(`Failed to save discount: ${err.message}`);
    } finally {
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // --- COLLECT FEE PAYMENT ---
  const handleCollectPayment = async () => {
    if (!collectingStudent) return;
    if (paymentAmount <= 0) {
      alert('Please enter a valid payment amount.');
      return;
    }

    try {
      // 1. Generate Receipt Number (e.g. REC-2026-0042)
      const receiptNo = `REC-${new Date().getFullYear()}-${String(transactions.length + 1).padStart(4, '0')}`;

      // 2. Insert Transaction Record
      const txPayload = {
        receipt_no: receiptNo,
        student_id: collectingStudent.id,
        student_name: collectingStudent.name,
        course_id: collectingStudent.course_id,
        batch_number: collectingStudent.batch_number,
        amount_paid: paymentAmount,
        payment_mode: paymentMode,
        installment_label: installmentLabel,
        notes: paymentNotes || null,
        logged_by: 'Staff Office'
      };

      const { data: newTx, error: txError } = await supabase.from('fee_payment_transactions').insert(txPayload).select().single();
      if (txError) throw txError;

      // 3. Update Student Fee Profile
      const existingProfile = feeProfiles.find(p => p.student_id === collectingStudent.id);
      const agreedFee = existingProfile?.total_agreed_fee || 25000;
      const currentPaid = existingProfile?.total_paid || 0;
      const newTotalPaid = currentPaid + paymentAmount;
      const newBalance = Math.max(0, agreedFee - newTotalPaid);

      let newStatus: 'unpaid' | 'partially_paid' | 'fully_paid' = 'partially_paid';
      if (newTotalPaid >= agreedFee) newStatus = 'fully_paid';

      const profilePayload = {
        student_id: collectingStudent.id,
        standard_fee: existingProfile?.standard_fee || 25000,
        discount_amount: existingProfile?.discount_amount || 0,
        total_agreed_fee: agreedFee,
        total_paid: newTotalPaid,
        balance_due: newBalance,
        status: newStatus
      };

      const { error: profError } = await supabase.from('student_fee_profiles').upsert(profilePayload, { onConflict: 'student_id' });
      if (profError) throw profError;

      setMessage(`✅ Recorded ₹${paymentAmount.toLocaleString()} payment via ${paymentMode === 'gpay_bank' ? 'GPay/Bank' : 'Liquid Office Cash'}!`);
      
      // Auto open printable receipt
      if (newTx) {
        setActiveReceipt({ tx: newTx as FeePaymentTransaction, student: collectingStudent });
      }

      setCollectingStudent(null);
      await fetchAllFinancialData();
    } catch (err: any) {
      console.error('Error collecting payment:', err);
      alert(`Failed to record payment: ${err.message}`);
    } finally {
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // --- LOG ACADEMY EXPENSE ---
  const handleSaveExpense = async () => {
    if (!expenseTitle.trim() || expenseAmount <= 0) {
      alert('Please enter a valid expense title and amount.');
      return;
    }

    try {
      const payload = {
        title: expenseTitle,
        category: expenseCategory,
        amount: expenseAmount,
        payment_mode: expenseMode,
        notes: expenseNotes || null,
        logged_by: 'Staff Office'
      };

      const { error } = await supabase.from('academy_expenses').insert(payload);
      if (error) throw error;

      setMessage(`✅ Recorded expense: "${expenseTitle}" (₹${expenseAmount.toLocaleString()}) paid via ${expenseMode === 'office_cash' ? 'Office Cash' : 'GPay/Bank'}`);
      setShowAddExpense(false);
      setExpenseTitle('');
      await fetchAllFinancialData();
    } catch (err: any) {
      console.error('Error saving expense:', err);
      alert(`Failed to record expense: ${err.message}`);
    } finally {
      setTimeout(() => setMessage(''), 4000);
    }
  };

  // Format Payment Reminder message
  const handleSendReminder = (student: StudentProfile) => {
    const prof = feeProfiles.find(p => p.student_id === student.id);
    const balance = prof ? prof.balance_due : 25000;

    const reminderMsg = `Dear ${student.name}, greetings from Academy of Excellence!\nThis is a friendly payment reminder for your course ${selectedCourse?.name || ''} (Batch ${student.batch_number}).\nTotal Agreed Fee: ₹${(prof?.total_agreed_fee || 25000).toLocaleString()}\nTotal Paid: ₹${(prof?.total_paid || 0).toLocaleString()}\nRemaining Balance: ₹${balance.toLocaleString()}\nKindly clear your upcoming installment. Thank you!`;
    
    // Copy to clipboard or open WhatsApp link if phone is present
    const phone = student.whatsapp_number || student.mobile_number;
    if (phone) {
      const cleanPhone = phone.replace(/[^0-9]/g, '');
      window.open(`https://wa.me/${cleanPhone}?text=${encodeURIComponent(reminderMsg)}`, '_blank');
    } else {
      navigator.clipboard.writeText(reminderMsg);
      alert(`Reminder text copied to clipboard for ${student.name}!`);
    }
  };

  return (
    <div style={{ padding: '1rem 0' }}>
      
      {/* Header Banner */}
      <div style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e293b 100%)', color: 'white', padding: '1.75rem 2rem', borderRadius: '16px', marginBottom: '2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '1rem', boxShadow: '0 10px 25px -5px rgba(15, 23, 42, 0.2)' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ background: 'rgba(34, 197, 94, 0.2)', padding: '0.75rem', borderRadius: '12px', color: '#4ade80', border: '1px solid rgba(74, 222, 128, 0.3)' }}>
            <Wallet size={32} />
          </div>
          <div>
            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, margin: '0 0 0.2rem 0', color: '#4ade80' }}>
              Academy Accounting & Cash Hub
            </h2>
            <p style={{ color: '#94a3b8', fontSize: '0.85rem', margin: 0 }}>
              Track Fee Collections, Liquid Office Cash vs GPay Bank, Expenses, and Receipts.
            </p>
          </div>
        </div>

        <button
          onClick={fetchAllFinancialData}
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

      {/* --- REAL-TIME ACCOUNT BALANCE SUMMARY CARDS --- */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '1.25rem', marginBottom: '2rem' }}>
        
        {/* Office Liquid Cash */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'linear-gradient(135deg, #15803d 0%, #166534 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bbf7d0' }}>
              In-Hand Office Cash
            </span>
            <Wallet size={20} color="#bbf7d0" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>
            ₹{officeCashBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dcfce7', marginTop: '0.3rem' }}>
            Office Drawer / Safe Cash
          </div>
        </div>

        {/* GPay / Bank Account */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: 'linear-gradient(135deg, #1d4ed8 0%, #1e40af 100%)', color: 'white' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#bfdbfe' }}>
              Academy GPay / Bank
            </span>
            <CreditCard size={20} color="#bfdbfe" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: 'white' }}>
            ₹{gpayBankBalance.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#dbeafe', marginTop: '0.3rem' }}>
            Digital UPI & Bank Account
          </div>
        </div>

        {/* Total Income */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Total Fees Collected
            </span>
            <TrendingUp size={20} color="#16a34a" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#16a34a' }}>
            ₹{totalIncome.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
            {transactions.length} Payment Receipts
          </div>
        </div>

        {/* Total Expenses */}
        <div className="glass-card" style={{ padding: '1.25rem', borderRadius: '16px', background: '#ffffff', border: '1px solid #e2e8f0' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#64748b' }}>
              Total Expenses Outflow
            </span>
            <TrendingDown size={20} color="#dc2626" />
          </div>
          <div style={{ fontSize: '1.8rem', fontWeight: 900, color: '#dc2626' }}>
            ₹{totalExpenses.toLocaleString()}
          </div>
          <div style={{ fontSize: '0.75rem', color: '#64748b', marginTop: '0.3rem' }}>
            {expenses.length} Expense Logs
          </div>
        </div>

      </div>

      {/* Main Navigation Tabs */}
      <div style={{ display: 'flex', gap: '0.75rem', marginBottom: '1.75rem', flexWrap: 'wrap', borderBottom: '2px solid #e2e8f0', paddingBottom: '0.75rem' }}>
        <button
          onClick={() => setActiveTab('overview')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'overview' ? '#0f172a' : '#f1f5f9',
            color: activeTab === 'overview' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          📊 Financial Overview
        </button>

        <button
          onClick={() => setActiveTab('student_fees')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'student_fees' ? '#16a34a' : '#f1f5f9',
            color: activeTab === 'student_fees' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          🎓 Student Fee Roster & Collection
        </button>

        <button
          onClick={() => setActiveTab('expenses')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'expenses' ? '#dc2626' : '#f1f5f9',
            color: activeTab === 'expenses' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer'
          }}
        >
          💸 Expense Tracker
        </button>

        <button
          onClick={() => setActiveTab('ledger')}
          style={{
            padding: '0.6rem 1.25rem',
            borderRadius: '10px',
            border: 'none',
            background: activeTab === 'ledger' ? '#b45309' : '#f1f5f9',
            color: activeTab === 'ledger' ? 'white' : '#475569',
            fontWeight: 800,
            fontSize: '0.9rem',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '0.4rem'
          }}
        >
          <Printer size={16} /> Audit Ledger & Reports
        </button>
      </div>

      {/* --- TAB 1: FINANCIAL OVERVIEW --- */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '1.5rem' }}>
          
          {/* Liquidity Breakdown Card */}
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <Wallet className="text-primary" size={20} /> Account Liquidity Breakdown
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#f0fdf4', borderRadius: '10px', border: '1px solid #bbf7d0' }}>
                <span style={{ fontWeight: 700, color: '#166534' }}>💵 Office Hand Cash Balance</span>
                <strong style={{ fontSize: '1.1rem', color: '#15803d' }}>₹{officeCashBalance.toLocaleString()}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '0.85rem 1rem', background: '#eff6ff', borderRadius: '10px', border: '1px solid #bfdbfe' }}>
                <span style={{ fontWeight: 700, color: '#1e40af' }}>💳 Academy GPay / Bank Balance</span>
                <strong style={{ fontSize: '1.1rem', color: '#1d4ed8' }}>₹{gpayBankBalance.toLocaleString()}</strong>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', padding: '1rem', background: '#0f172a', color: 'white', borderRadius: '12px', marginTop: '0.5rem' }}>
                <span style={{ fontWeight: 800 }}>⚡ Total Net Liquidity</span>
                <strong style={{ fontSize: '1.2rem', color: '#4ade80' }}>₹{netLiquidity.toLocaleString()}</strong>
              </div>
            </div>
          </div>

          {/* Quick Actions Card */}
          <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
            <h3 style={{ fontSize: '1.1rem', fontWeight: 800, margin: '0 0 1.25rem 0', color: '#0f172a' }}>
              Quick Accounting Actions
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button
                onClick={() => setActiveTab('student_fees')}
                style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#15803d', fontWeight: 800, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🎓 Collect Student Fee</span>
                <ArrowUpRight size={18} />
              </button>

              <button
                onClick={() => { setActiveTab('expenses'); setShowAddExpense(true); }}
                style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', background: '#fef2f2', border: '1px solid #fecaca', color: '#b91c1c', fontWeight: 800, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>💸 Record Academy Expense</span>
                <ArrowDownRight size={18} />
              </button>

              <button
                onClick={() => setActiveTab('ledger')}
                style={{ padding: '0.85rem 1.25rem', borderRadius: '10px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', fontWeight: 800, textAlign: 'left', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              >
                <span>🖨️ Print Financial Audit Statement</span>
                <Printer size={18} />
              </button>
            </div>
          </div>

        </div>
      )}

      {/* --- TAB 2: STUDENT FEE ROSTER & COLLECTION --- */}
      {activeTab === 'student_fees' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Student Fee Roster & Installments
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                {selectedCourse?.name || 'Academic Course'} • Batch {selectedBatchNumber}
              </p>
            </div>

            {/* Selectors */}
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center', flexWrap: 'wrap' }}>
              <select
                value={selectedCourseId}
                onChange={(e) => setSelectedCourseId(e.target.value)}
                style={{ padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
              >
                {coursesList.map(c => (
                  <option key={c.id} value={c.id}>{c.name}</option>
                ))}
              </select>

              <input
                type="text"
                inputMode="numeric"
                value={selectedBatchNumber}
                onChange={(e) => setSelectedBatchNumber(e.target.value.replace(/[^0-9]/g, ''))}
                placeholder="Batch #"
                style={{ width: '80px', padding: '0.5rem 0.75rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 700 }}
              />
            </div>
          </div>

          {activeStudents.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              No students found in this course and batch. Select another course or batch above.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Student Name</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Standard Fee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Discount / Concession</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Net Agreed Fee</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Total Paid</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Balance Due</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Status</th>
                    <th style={{ padding: '0.75rem 1rem', textAlign: 'right' }}>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {activeStudents.map(student => {
                    const prof = feeProfiles.find(p => p.student_id === student.id);
                    const stdFee = prof?.standard_fee || 25000;
                    const discount = prof?.discount_amount || 0;
                    const agreedFee = prof?.total_agreed_fee || stdFee;
                    const paid = prof?.total_paid || 0;
                    const balance = Math.max(0, agreedFee - paid);
                    const status = prof?.status || (paid >= agreedFee ? 'fully_paid' : (paid > 0 ? 'partially_paid' : 'unpaid'));

                    return (
                      <tr key={student.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                        
                        <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                          {student.name}
                          {student.roll_number && <span style={{ color: '#64748b', fontSize: '0.75rem', marginLeft: '0.4rem', fontWeight: 500 }}>(Roll #{student.roll_number})</span>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: '#475569' }}>
                          ₹{stdFee.toLocaleString()}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', color: discount > 0 ? '#b45309' : '#94a3b8', fontWeight: discount > 0 ? 700 : 400 }}>
                          {discount > 0 ? `-₹${discount.toLocaleString()}` : 'None'}
                          {prof?.discount_reason && <div style={{ fontSize: '0.7rem', color: '#64748b' }}>({prof.discount_reason})</div>}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#0f172a' }}>
                          ₹{agreedFee.toLocaleString()}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: '#16a34a' }}>
                          ₹{paid.toLocaleString()}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', fontWeight: 800, color: balance > 0 ? '#dc2626' : '#16a34a' }}>
                          ₹{balance.toLocaleString()}
                        </td>

                        <td style={{ padding: '0.85rem 1rem' }}>
                          {status === 'fully_paid' ? (
                            <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#16a34a', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Fully Paid</span>
                          ) : status === 'partially_paid' ? (
                            <span style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Partially Paid</span>
                          ) : (
                            <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#dc2626', padding: '0.2rem 0.55rem', borderRadius: '8px', fontSize: '0.75rem', fontWeight: 800 }}>Unpaid</span>
                          )}
                        </td>

                        <td style={{ padding: '0.85rem 1rem', textAlign: 'right' }}>
                          <div style={{ display: 'flex', gap: '0.4rem', justifyContent: 'flex-end' }}>
                            
                            {/* Collect Fee Button */}
                            <button
                              onClick={() => {
                                setCollectingStudent(student);
                                setPaymentAmount(balance > 0 ? Math.min(5000, balance) : 5000);
                              }}
                              title="Collect Fee Installment"
                              style={{ padding: '0.4rem 0.75rem', borderRadius: '6px', background: '#16a34a', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.3rem' }}
                            >
                              <DollarSign size={14} /> Collect Fee
                            </button>

                            {/* Discount Editor */}
                            <button
                              onClick={() => {
                                setDiscountingStudent(student);
                                setStandardFee(stdFee);
                                setDiscountAmount(discount);
                                setDiscountReason(prof?.discount_reason || '');
                              }}
                              title="Set Custom Discount / Concession"
                              style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#fffbeb', border: '1px solid #fde68a', color: '#b45309', cursor: 'pointer' }}
                            >
                              <Tag size={14} />
                            </button>

                            {/* Send Reminder */}
                            {balance > 0 && (
                              <button
                                onClick={() => handleSendReminder(student)}
                                title="Send WhatsApp / SMS Payment Reminder"
                                style={{ padding: '0.4rem 0.5rem', borderRadius: '6px', background: '#eff6ff', border: '1px solid #bfdbfe', color: '#1d4ed8', cursor: 'pointer' }}
                              >
                                <Send size={14} />
                              </button>
                            )}

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
      )}

      {/* --- TAB 3: EXPENSE TRACKER --- */}
      {activeTab === 'expenses' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Academy Expense Tracker
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Record office rent, utilities, salaries, and operational costs.
              </p>
            </div>

            <button
              onClick={() => setShowAddExpense(true)}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: '#dc2626', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <PlusCircle size={16} /> Record Expense
            </button>
          </div>

          {expenses.length === 0 ? (
            <div style={{ padding: '3rem 1.5rem', textAlign: 'center', background: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1', color: '#64748b' }}>
              No expenses recorded yet. Click "Record Expense" above to add one.
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
                <thead>
                  <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                    <th style={{ padding: '0.75rem 1rem' }}>Expense Title</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Category</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Paid From Account</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Date</th>
                    <th style={{ padding: '0.75rem 1rem' }}>Logged By</th>
                  </tr>
                </thead>
                <tbody>
                  {expenses.map(exp => (
                    <tr key={exp.id} style={{ borderBottom: '1px solid #f1f5f9' }}>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 700, color: '#0f172a' }}>
                        {exp.title}
                        {exp.notes && <div style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 400 }}>{exp.notes}</div>}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', textTransform: 'capitalize', color: '#475569' }}>
                        {exp.category}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#dc2626' }}>
                        ₹{Number(exp.amount).toLocaleString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem' }}>
                        {exp.payment_mode === 'office_cash' ? (
                          <span style={{ background: 'rgba(217, 119, 6, 0.1)', color: '#b45309', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>💵 Office Cash</span>
                        ) : (
                          <span style={{ background: 'rgba(37, 99, 235, 0.1)', color: '#2563eb', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>💳 GPay / Bank</span>
                        )}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {new Date(exp.expense_date).toLocaleDateString()}
                      </td>
                      <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>
                        {exp.logged_by}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

        </div>
      )}

      {/* --- TAB 4: COMPLETE FINANCIAL LEDGER & PRINT REPORT --- */}
      {activeTab === 'ledger' && (
        <div className="glass-card" style={{ padding: '1.75rem', borderRadius: '16px' }}>
          
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <div>
              <h3 style={{ fontSize: '1.15rem', fontWeight: 800, margin: 0, color: '#0f172a' }}>
                Complete Financial Audit Ledger
              </h3>
              <p style={{ fontSize: '0.8rem', color: '#64748b', margin: '0.2rem 0 0 0' }}>
                Chronological list of all fee receipts and expense outflows.
              </p>
            </div>

            <button
              onClick={() => window.print()}
              className="btn btn-primary"
              style={{ padding: '0.55rem 1.25rem', borderRadius: '8px', background: '#b45309', color: 'white', fontWeight: 800, border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '0.4rem' }}
            >
              <Printer size={16} /> Print Financial Statement
            </button>
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.85rem', textAlign: 'left' }}>
              <thead>
                <tr style={{ background: '#f8fafc', borderBottom: '2px solid #e2e8f0', color: '#475569' }}>
                  <th style={{ padding: '0.75rem 1rem' }}>Type</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Receipt / Ref No</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Description</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Account Used</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Amount</th>
                  <th style={{ padding: '0.75rem 1rem' }}>Date & Time</th>
                </tr>
              </thead>
              <tbody>
                {/* Income Rows */}
                {transactions.map(tx => (
                  <tr key={`tx-${tx.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: 'rgba(34, 197, 94, 0.1)', color: '#15803d', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>+ Fee Income</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>{tx.receipt_no}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{tx.student_name} ({tx.installment_label})</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{tx.payment_mode === 'gpay_bank' ? '💳 GPay/Bank' : '💵 Office Cash'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#16a34a' }}>+₹{Number(tx.amount_paid).toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{new Date(tx.payment_date).toLocaleString()}</td>
                  </tr>
                ))}

                {/* Expense Rows */}
                {expenses.map(exp => (
                  <tr key={`exp-${exp.id}`} style={{ borderBottom: '1px solid #f1f5f9' }}>
                    <td style={{ padding: '0.85rem 1rem' }}>
                      <span style={{ background: 'rgba(239, 68, 68, 0.1)', color: '#b91c1c', padding: '0.2rem 0.55rem', borderRadius: '6px', fontWeight: 800, fontSize: '0.75rem' }}>- Expense</span>
                    </td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 700 }}>EXP-{exp.id.slice(0, 6)}</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{exp.title} ({exp.category})</td>
                    <td style={{ padding: '0.85rem 1rem' }}>{exp.payment_mode === 'gpay_bank' ? '💳 GPay/Bank' : '💵 Office Cash'}</td>
                    <td style={{ padding: '0.85rem 1rem', fontWeight: 900, color: '#dc2626' }}>-₹{Number(exp.amount).toLocaleString()}</td>
                    <td style={{ padding: '0.85rem 1rem', color: '#64748b' }}>{new Date(exp.expense_date).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

        </div>
      )}

      {/* --- COLLECT FEE MODAL --- */}
      {collectingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                Collect Fee Payment
              </h4>
              <button onClick={() => setCollectingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Student Name</label>
              <input type="text" disabled value={collectingStudent.name} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800 }} />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Payment Amount (₹) *</label>
              <input
                type="number"
                value={paymentAmount}
                onChange={(e) => setPaymentAmount(Number(e.target.value))}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '1.1rem', fontWeight: 900, color: '#16a34a' }}
              />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Payment Account / Mode *</label>
              <select
                value={paymentMode}
                onChange={(e) => setPaymentMode(e.target.value as any)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
              >
                <option value="gpay_bank">💳 GPay / Bank Account (Digital)</option>
                <option value="office_cash">💵 Office Hand Cash (Physical Drawer)</option>
              </select>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Installment Label</label>
              <select
                value={installmentLabel}
                onChange={(e) => setInstallmentLabel(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              >
                <option value="Admission Fee (1st Payment)">Admission Fee (1st Payment)</option>
                <option value="Month 1 Installment (2nd Payment)">Month 1 Installment (2nd Payment)</option>
                <option value="Month 3 Installment (3rd Payment)">Month 3 Installment (3rd Payment)</option>
                <option value="Custom Installment Payment">Custom Installment Payment</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
              <button onClick={() => setCollectingStudent(null)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleCollectPayment} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#16a34a', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                Confirm & Issue Receipt
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- ADD EXPENSE MODAL --- */}
      {showAddExpense && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                Record Academy Expense
              </h4>
              <button onClick={() => setShowAddExpense(false)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Expense Title *</label>
              <input
                type="text"
                placeholder="e.g. Office Electricity Bill / Stationery"
                value={expenseTitle}
                onChange={(e) => setExpenseTitle(e.target.value)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem' }}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Category</label>
                <select
                  value={expenseCategory}
                  onChange={(e) => setExpenseCategory(e.target.value as any)}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }}
                >
                  <option value="supplies">Office Supplies</option>
                  <option value="rent">Rent</option>
                  <option value="utilities">Utilities / Electricity</option>
                  <option value="salaries">Staff Salaries</option>
                  <option value="marketing">Marketing / Ads</option>
                  <option value="maintenance">Maintenance</option>
                  <option value="other">Other</option>
                </select>
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Amount (₹) *</label>
                <input
                  type="number"
                  value={expenseAmount}
                  onChange={(e) => setExpenseAmount(Number(e.target.value))}
                  style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, color: '#dc2626' }}
                />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Paid From Account *</label>
              <select
                value={expenseMode}
                onChange={(e) => setExpenseMode(e.target.value as any)}
                style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }}
              >
                <option value="office_cash">💵 Office Hand Cash</option>
                <option value="gpay_bank">💳 GPay / Bank Account</option>
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setShowAddExpense(false)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveExpense} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#dc2626', color: 'white', fontWeight: 800, cursor: 'pointer' }}>
                Record Outflow
              </button>
            </div>

          </div>
        </div>
      )}

      {/* --- DISCOUNT EDITOR MODAL --- */}
      {discountingStudent && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.6)', backdropFilter: 'blur(4px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: 'white', padding: '2rem', borderRadius: '16px', width: '100%', maxWidth: '450px', boxShadow: '0 20px 25px -5px rgba(0,0,0,0.3)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a', fontSize: '1.1rem' }}>
                Assign Student Concession / Discount
              </h4>
              <button onClick={() => setDiscountingStudent(null)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#64748b' }}>
                <X size={20} />
              </button>
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Student Name</label>
              <input type="text" disabled value={discountingStudent.name} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', background: '#f1f5f9', border: '1px solid #cbd5e1', fontSize: '0.85rem', fontWeight: 800 }} />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Standard Batch Fee</label>
                <input type="number" value={standardFee} onChange={(e) => setStandardFee(Number(e.target.value))} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 700 }} />
              </div>

              <div>
                <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Discount Concession (₹)</label>
                <input type="number" value={discountAmount} onChange={(e) => setDiscountAmount(Number(e.target.value))} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.9rem', fontWeight: 800, color: '#b45309' }} />
              </div>
            </div>

            <div style={{ marginBottom: '1.25rem' }}>
              <label style={{ display: 'block', fontSize: '0.75rem', fontWeight: 700, color: 'var(--text-muted)', marginBottom: '0.3rem' }}>Concession Reason / Notes</label>
              <input type="text" placeholder="e.g. Merit Scholarship / Special Concession" value={discountReason} onChange={(e) => setDiscountReason(e.target.value)} style={{ width: '100%', padding: '0.6rem 0.8rem', borderRadius: '8px', border: '1px solid #cbd5e1', fontSize: '0.85rem' }} />
            </div>

            <div style={{ background: '#f8fafc', padding: '0.75rem 1rem', borderRadius: '8px', marginBottom: '1.25rem', fontSize: '0.85rem' }}>
              Net Agreed Tuition Fee: <strong style={{ color: '#0f172a', fontSize: '1rem' }}>₹{Math.max(0, standardFee - discountAmount).toLocaleString()}</strong>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem', justifyContent: 'flex-end' }}>
              <button onClick={() => setDiscountingStudent(null)} style={{ padding: '0.5rem 1rem', borderRadius: '8px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Cancel</button>
              <button onClick={handleSaveDiscount} style={{ padding: '0.5rem 1.25rem', borderRadius: '8px', border: 'none', background: '#b45309', color: 'white', fontWeight: 800, cursor: 'pointer' }}>Save Fee Structure</button>
            </div>

          </div>
        </div>
      )}

      {/* --- PRINTABLE FEE RECEIPT MODAL --- */}
      {activeReceipt && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(6px)', zIndex: 9999, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: '1rem' }}>
          <div style={{ background: '#ffffff', width: '100%', maxWidth: '600px', borderRadius: '16px', padding: '2rem', boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)' }}>
            
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', borderBottom: '1px solid #e2e8f0', paddingBottom: '0.75rem' }}>
              <h4 style={{ margin: 0, fontWeight: 800, color: '#0f172a' }}>Official Fee Payment Receipt</h4>
              <div style={{ display: 'flex', gap: '0.5rem' }}>
                <button onClick={() => window.print()} className="btn btn-primary" style={{ padding: '0.4rem 1rem', borderRadius: '6px', background: '#16a34a', color: 'white', fontWeight: 700, border: 'none', cursor: 'pointer' }}>
                  Print Receipt
                </button>
                <button onClick={() => setActiveReceipt(null)} style={{ padding: '0.4rem 0.8rem', borderRadius: '6px', border: '1px solid #cbd5e1', background: 'white', cursor: 'pointer' }}>Close</button>
              </div>
            </div>

            {/* Receipt Printable Document */}
            <div style={{ border: '2px solid #0f172a', padding: '1.5rem', borderRadius: '12px', background: '#fffdfa', color: '#0f172a', fontFamily: 'serif' }}>
              <div style={{ textAlign: 'center', borderBottom: '2px solid #0f172a', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: 900 }}>ACADEMY OF EXCELLENCE</h2>
                <p style={{ margin: '0.2rem 0 0 0', fontSize: '0.8rem', fontFamily: 'sans-serif', color: '#b45309', fontWeight: 800 }}>OFFICIAL ACKNOWLEDGEMENT RECEIPT</p>
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.85rem', fontFamily: 'sans-serif', marginBottom: '1rem' }}>
                <div>
                  <strong>Receipt No:</strong> <code style={{ fontWeight: 800 }}>{activeReceipt.tx.receipt_no}</code><br />
                  <strong>Date:</strong> {new Date(activeReceipt.tx.payment_date).toLocaleDateString()}
                </div>
                <div style={{ textAlign: 'right' }}>
                  <strong>Payment Mode:</strong> {activeReceipt.tx.payment_mode === 'gpay_bank' ? 'GPay / Bank Account' : 'Office Cash'}
                </div>
              </div>

              <div style={{ fontFamily: 'sans-serif', fontSize: '0.9rem', borderTop: '1px solid #cbd5e1', borderBottom: '1px solid #cbd5e1', padding: '0.75rem 0', marginBottom: '1rem' }}>
                <div><strong>Student Name:</strong> {activeReceipt.tx.student_name}</div>
                <div><strong>Course & Batch:</strong> {selectedCourse?.name} (Batch {activeReceipt.tx.batch_number})</div>
                <div><strong>Installment:</strong> {activeReceipt.tx.installment_label}</div>
              </div>

              <div style={{ textAlign: 'right', fontSize: '1.4rem', fontWeight: 900, color: '#16a34a', fontFamily: 'sans-serif', marginBottom: '1.5rem' }}>
                Amount Paid: ₹{Number(activeReceipt.tx.amount_paid).toLocaleString()}
              </div>

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', fontSize: '0.8rem', fontFamily: 'sans-serif', color: '#64748b' }}>
                <div>Thank you for your payment!</div>
                <div style={{ textAlign: 'center' }}>
                  <div style={{ height: '30px', borderBottom: '1px solid #0f172a', width: '120px', marginBottom: '0.2rem' }} />
                  Authorized Signature
                </div>
              </div>

            </div>

          </div>
        </div>
      )}

    </div>
  );
}
