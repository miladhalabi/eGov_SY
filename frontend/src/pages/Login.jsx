import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function Login({ onRegister }) {
  const [nationalId, setNationalId] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  
  const setAuth = useAuthStore((state) => state.setAuth);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await axios.post('http://localhost:5000/api/auth/login', {
        nationalId,
        password,
      });
      setAuth(response.data.user, response.data.token);
    } catch (err) {
      setError(err.response?.data?.error || 'حدث خطأ أثناء تسجيل الدخول. يرجى التأكد من البيانات.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gov-bg flex items-center justify-center p-6" dir="rtl">
      <div className="w-full max-w-lg">
        {/* Logo / Title Area */}
        <div className="text-center mb-10">
          <div className="inline-block p-4 rounded-3xl bg-gov-secondary shadow-2xl mb-4 border-b-4 border-gov-primary">
            <svg className="w-16 h-16 text-gov-primary" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M10 2a1 1 0 00-1 1v1.258a7.979 7.979 0 00-5.165 4.583 1 1 0 101.873.708 5.978 5.978 0 018.584 0 1 1 0 001.873-.708A7.979 7.979 0 0011 4.258V3a1 1 0 00-1-1zM5 10a1 1 0 011-1h8a1 1 0 110 2H6a1 1 0 01-1-1z" clipRule="evenodd" />
              <path d="M7 13a1 1 0 011-1h4a1 1 0 110 2H8a1 1 0 01-1-1z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold text-gov-secondary tracking-tight">بوابة الخدمات الحكومية</h1>
          <p className="text-gov-primary font-medium mt-1">الجمهورية العربية السورية</p>
        </div>

        {/* Login Form Card */}
        <div className="gov-card p-10 relative overflow-hidden">
          <div className="absolute top-0 right-0 w-32 h-32 bg-gov-primary opacity-5 -mr-16 -mt-16 rounded-full"></div>
          
          <form onSubmit={handleSubmit} className="space-y-6 relative z-10">
            {error && (
              <div className="bg-red-50 text-red-700 p-4 rounded-xl text-sm border border-red-100 flex items-center">
                <span className="ml-2">⚠️</span>
                {error}
              </div>
            )}

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mr-1">الرقم الوطني</label>
              <input
                type="text"
                className="gov-input text-lg"
                placeholder="0123456789"
                value={nationalId}
                onChange={(e) => setNationalId(e.target.value)}
                required
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-400 uppercase tracking-widest mb-2 mr-1">كلمة المرور</label>
              <input
                type="password"
                className="gov-input text-lg"
                placeholder="••••••••"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="gov-button-primary w-full shadow-gov-secondary/20"
              >
                {loading ? (
                  <span className="flex items-center justify-center">
                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-gov-primary" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    جاري التحقق...
                  </span>
                ) : 'دخول للمنصة'}
              </button>
            </div>
            <div className="pt-2 text-center">
              <button 
                type="button" 
                onClick={onRegister}
                className="text-sm font-bold text-gray-400 hover:text-gov-secondary transition-colors"
              >
                لا تملك حساب؟ تفعيل حساب مواطن جديد
              </button>
            </div>
          </form>
        </div>

        <footer className="mt-12 text-center text-gray-400 text-xs">
          <p>© 2026 جميع الحقوق محفوظة لوزارة الاتصالات والتقانة</p>
          <div className="mt-2 space-x-4 space-x-reverse opacity-50">
            <a href="#" className="hover:text-gov-primary transition-colors">سياسة الخصوصية</a>
            <span>•</span>
            <a href="#" className="hover:text-gov-primary transition-colors">شروط الاستخدام</a>
          </div>
        </footer>
      </div>
    </div>
  );
}

export default Login;
