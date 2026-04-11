import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

function DigitalBank() {
  const [bankData, setBankData] = useState(null);
  const [history, setHistory] = useState([]);
  const [isLocked, setIsLocked] = useState(true);
  const [pin, setPin] = useState('');
  const [transferData, setTransferData] = useState({ receiverNationalId: '', amount: '' });
  const [msg, setMsg] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showSetup, setShowSetup] = useState(false);
  const token = useAuthStore((state) => state.token);

  const fetchBankData = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/bank/data', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setBankData(res.data);
      if (!res.data.hasPin) setShowSetup(true);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  const fetchHistory = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/bank/history', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setHistory(res.data);
    } catch (e) { console.error(e); }
  };

  useEffect(() => { fetchBankData(); }, []);

  const handleUnlock = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/bank/verify-pin', { pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setIsLocked(false);
      fetchHistory();
    } catch (e) { alert('رمز الأمان غير صحيح'); }
  };

  const handleSetup = async (e) => {
    e.preventDefault();
    try {
      await axios.post('http://localhost:5000/api/bank/setup-pin', { pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setShowSetup(false);
      setIsLocked(false);
      fetchBankData();
    } catch (e) { alert('خطأ في الإعداد'); }
  };

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await axios.post('http://localhost:5000/api/bank/transfer', { ...transferData, pin }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setMsg({ type: 'success', text: `تمت الحوالة! رقم الإشعار: ${res.data.referenceNumber}` });
      setTransferData({ receiverNationalId: '', amount: '' });
      fetchBankData();
      fetchHistory();
    } catch (error) {
      setMsg({ type: 'error', text: error.response?.data?.error || 'خطأ في الحوالة' });
    }
  };

  if (loading) return <div className="p-20 text-center">جاري الاتصال بالسيرفر المصرفي...</div>;

  if (showSetup) {
    return (
      <div className="max-w-md mx-auto gov-card p-10 border-t-8 border-blue-600 animate-fade-in text-center">
        <div className="bg-blue-100 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" /></svg>
        </div>
        <h2 className="text-2xl font-bold text-gray-800 mb-2">إعداد رمز الأمان البنكي</h2>
        <p className="text-sm text-gray-500 mb-8">لحماية أصولك المالية، يرجى إعداد رمز مكون من 6 أرقام لاستخدامه في العمليات المصرفية فقط.</p>
        <form onSubmit={handleSetup} className="space-y-4">
          <input 
            type="password" maxLength="6" placeholder="******" 
            className="gov-input english-nums text-center text-3xl tracking-[1rem]"
            value={pin} onChange={(e) => setPin(e.target.value)} required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg">حفظ الرمز وتفعيل الحساب</button>
        </form>
      </div>
    );
  }

  if (isLocked) {
    return (
      <div className="max-w-md mx-auto gov-card p-10 border-t-8 border-blue-600 animate-fade-in text-center">
        <div className="mb-6"><h1 className="text-blue-700 font-black text-xl italic tracking-tighter">COMMERCIAL BANK OF SYRIA</h1></div>
        <div className="bg-blue-50 text-blue-600 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-6">
           <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-7.618 3.072 11.952 11.952 0 00-6.827 2.111 11.99 11.99 0 000 13.746 11.952 11.952 0 006.827 2.111 11.955 11.955 0 017.618 3.072 11.955 11.955 0 017.618-3.072 11.952 11.952 0 006.827-2.111 11.99 11.99 0 000-13.746 11.952 11.952 0 00-6.827-2.111z" /></svg>
        </div>
        <h2 className="text-xl font-bold text-gray-800 mb-6">أدخل رمز الأمان للوصول</h2>
        <form onSubmit={handleUnlock} className="space-y-4">
          <input 
            type="password" maxLength="6" placeholder="******" 
            className="gov-input english-nums text-center text-3xl tracking-[1rem]"
            value={pin} onChange={(e) => setPin(e.target.value)} required
          />
          <button type="submit" className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold hover:bg-blue-700 transition-all shadow-lg uppercase tracking-widest text-xs">Unlock Account</button>
        </form>
      </div>
    );
  }

  return (
    <div className="animate-fade-in space-y-10">
      <header className="flex flex-col md:flex-row justify-between items-center gap-6">
        <div>
          <h1 className="text-blue-800 font-black text-3xl italic tracking-tighter mb-1">COMMERCIAL BANK OF SYRIA</h1>
          <p className="text-gray-400 text-sm font-bold uppercase tracking-widest">Digital Banking Solutions</p>
        </div>
        <div className="gov-card bg-gradient-to-br from-blue-700 to-blue-900 text-white p-6 min-w-[300px] shadow-2xl relative overflow-hidden">
           <div className="absolute top-0 right-0 w-32 h-32 bg-white/10 rounded-full -mr-10 -mt-10"></div>
           <p className="text-[10px] uppercase font-bold text-blue-200 mb-2">Available Balance</p>
           <h2 className="text-3xl font-black english-nums">{bankData.balance.toLocaleString()} <span className="text-xs font-normal">SYP</span></h2>
           <p className="text-[10px] mt-4 text-blue-300 font-mono">USER ID: {bankData.nationalId}</p>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
        {/* Transfer Form */}
        <section className="lg:col-span-1">
          <div className="gov-card p-8 border-r-8 border-blue-600">
            <h3 className="text-xl font-bold text-gray-800 mb-6">تحويل بنكي جديد</h3>
            {msg && (
              <div className={`p-4 rounded-xl mb-6 text-xs ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                {msg.text}
                {msg.type === 'success' && (
                  <button onClick={() => navigator.clipboard.writeText(msg.text.split(': ')[1])} className="block mt-2 font-bold underline">نسخ رقم الإشعار</button>
                )}
              </div>
            )}
            <form onSubmit={handleTransfer} className="space-y-6">
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase">Recipient National ID</label>
                <input 
                  type="text" className="gov-input english-nums" required
                  value={transferData.receiverNationalId} onChange={(e) => setTransferData({ ...transferData, receiverNationalId: e.target.value })}
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-gray-400 mb-2 uppercase">Amount (SYP)</label>
                <input 
                  type="number" className="gov-input english-nums" required
                  value={transferData.amount} onChange={(e) => setTransferData({ ...transferData, amount: e.target.value })}
                />
              </div>
              <button type="submit" className="w-full bg-blue-600 text-white py-4 rounded-xl font-bold hover:brightness-110 transition-all shadow-xl">تأكيد عملية التحويل</button>
            </form>
          </div>
        </section>

        {/* History */}
        <section className="lg:col-span-2">
           <div className="gov-card overflow-hidden">
             <div className="p-6 bg-gray-50 border-b border-gray-100 flex justify-between items-center">
                <h3 className="font-bold text-gray-700 uppercase tracking-widest text-xs">Transaction History</h3>
                <span className="text-[10px] text-blue-600 font-bold">Live Updates</span>
             </div>
             <div className="divide-y divide-gray-50 max-h-[500px] overflow-y-auto">
               {history.length === 0 ? (
                 <div className="p-10 text-center text-gray-400 text-sm">لا توجد حوالات صادرة حالياً</div>
               ) : (
                 history.map(tx => (
                   <div key={tx.id} className="p-6 flex justify-between items-center hover:bg-gray-50 transition-colors">
                      <div>
                        <p className="text-xs font-bold text-gray-800 mb-1">حوالة إلى: {tx.receiverNationalId}</p>
                        <p className="text-[10px] text-gray-400 font-mono">REF: {tx.referenceNumber}</p>
                        <button onClick={() => {navigator.clipboard.writeText(tx.referenceNumber); alert('تم نسخ الرقم');}} className="text-[10px] text-blue-600 underline mt-1">نسخ الرقم</button>
                      </div>
                      <div className="text-right">
                        <p className="text-red-600 font-black english-nums">-{tx.amount.toLocaleString()} SYP</p>
                        <p className="text-[10px] text-gray-300">{new Date(tx.createdAt).toLocaleDateString('ar-SY')}</p>
                      </div>
                   </div>
                 ))
               )}
             </div>
           </div>
        </section>
      </div>
    </div>
  );
}

export default DigitalBank;
