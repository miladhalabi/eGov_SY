import { useState } from 'react';
import axios from 'axios';

function Register({ onBack }) {
  const [formData, setFormData] = useState({
    nationalId: '',
    fullName: '',
    fatherName: '',
    motherName: '',
    password: ''
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      await axios.post('http://localhost:5000/api/auth/register', formData);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'فشلت عملية التحقق من الهوية');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gov-bg flex items-center justify-center p-6 text-right" dir="rtl">
        <div className="gov-card p-10 max-w-md w-full text-center">
          <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" /></svg>
          </div>
          <h2 className="text-2xl font-bold text-gov-secondary mb-2">تم تفعيل الحساب بنجاح</h2>
          <p className="text-gray-500 mb-8">يمكنك الآن تسجيل الدخول باستخدام رقمك الوطني وكلمة المرور.</p>
          <button onClick={onBack} className="gov-button-primary w-full">العودة لتسجيل الدخول</button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center p-6 text-right font-serif" dir="rtl">
      <div className="gov-card p-10 max-w-xl w-full border-t-8 border-gov-primary">
        <header className="mb-10 text-center">
          <h1 className="text-2xl font-bold text-gov-secondary">إنشاء حساب مواطن جديد</h1>
          <p className="text-gov-primary text-sm mt-2">يرجى إدخال بياناتك الشخصية كما هي في البطاقة الشخصية للتحقق</p>
        </header>

        <form onSubmit={handleSubmit} className="space-y-4">
          {error && <div className="bg-red-50 text-red-700 p-3 rounded-xl border border-red-100 text-sm">{error}</div>}
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">الرقم الوطني</label>
               <input type="text" className="gov-input" value={formData.nationalId} onChange={(e) => setFormData({...formData, nationalId: e.target.value})} required />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">الاسم الكامل (مع الكنية)</label>
               <input type="text" className="gov-input" value={formData.fullName} onChange={(e) => setFormData({...formData, fullName: e.target.value})} required />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">اسم الأب</label>
               <input type="text" className="gov-input" value={formData.fatherName} onChange={(e) => setFormData({...formData, fatherName: e.target.value})} required />
             </div>
             <div>
               <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">اسم الأم</label>
               <input type="text" className="gov-input" value={formData.motherName} onChange={(e) => setFormData({...formData, motherName: e.target.value})} required />
             </div>
          </div>

          <div className="pt-2">
            <label className="block text-[10px] font-bold text-gray-400 mb-1 mr-1">كلمة المرور المقترحة</label>
            <input type="password" className="gov-input" value={formData.password} onChange={(e) => setFormData({...formData, password: e.target.value})} required />
          </div>

          <div className="pt-6 flex flex-col gap-3">
             <button type="submit" disabled={loading} className="gov-button-primary w-full">
               {loading ? 'جاري التحقق من السجلات...' : 'تحقق وتفعيل الحساب'}
             </button>
             <button type="button" onClick={onBack} className="text-sm text-gray-400 font-bold hover:text-gov-secondary transition-colors">لدي حساب بالفعل؟ دخول</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default Register;
