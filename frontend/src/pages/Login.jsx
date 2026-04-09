import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import logo from '../assets/logo.svg';

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
          <div className="inline-block mb-4 transition-transform hover:scale-110 duration-500">
            <img src={logo} alt="Syria E-Gov Logo" className="w-24 h-24 drop-shadow-2xl" />
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
                className="gov-input text-lg english-nums"
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
                className="gov-input text-lg english-nums"
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
