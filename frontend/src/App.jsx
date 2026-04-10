import { useState, useEffect } from 'react'
import { useAuthStore } from './store/authStore'
import { useSocketStore } from './store/socketStore'
import Login from './pages/Login'
import Register from './pages/Register'
import axios from 'axios'
import BirthRegistrationForm from './components/BirthRegistrationForm'
import MarriageRegistrationForm from './components/MarriageRegistrationForm'
import EmployeeQueue from './components/EmployeeQueue'
import MyRequests from './pages/MyRequests'
import NotificationBell from './components/NotificationBell'
import logo from './assets/logo.svg'

// Traffic Components
import MyVehicles from './components/Traffic/MyVehicles'
import TransferPopup from './components/Traffic/TransferPopup'
import EmployeeTrafficQueue from './components/Traffic/EmployeeTrafficQueue'

// Tax Components
import TaxDashboard from './components/Tax/TaxDashboard'

function App() {
  const { user, token, logout } = useAuthStore()
  const { connect, disconnect } = useSocketStore()
  const [activeCategory, setActiveCategory] = useState(null)
  const [view, setView] = useState('DASHBOARD'); // DASHBOARD, REQUESTS, REGISTER
  const [searchId, setSearchId] = useState('');

  useEffect(() => {
    if (token) {
      connect(token);
    } else {
      disconnect();
    }
  }, [token, connect, disconnect]);

  const downloadRecord = async (targetId = null, type = 'individual') => {
    try {
      const endpoint = type === 'family' ? 'family-record' : 'individual-record';
      const urlParams = targetId ? `?nationalId=${targetId}` : '';
      const response = await axios.get(`http://localhost:5000/api/civil/${endpoint}${urlParams}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      
      const fileNameId = targetId || user.nationalId;
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${type}_${fileNameId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (error) {
      console.error('Error downloading PDF:', error);
      alert('لم يتم العثور على بيانات لهذه العملية أو هذا الرقم الوطني');
    }
  };

  if (!user) {
    if (view === 'REGISTER') {
       return <Register onBack={() => setView('DASHBOARD')} />
    }
    return <Login onRegister={() => setView('REGISTER')} />
  }

  const categories = [
    { 
      id: 'CIVIL', 
      name: 'الشؤون المدنية', 
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      ),
      description: 'إخراجات القيد، تسجيل الولادات، وتصحيح البيانات.'
    },
    { 
      id: 'TRAFFIC', 
      name: 'المرور والنقل', 
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
        </svg>
      ),
      description: 'فراغ السيارات، كشف المخالفات، وتجديد الرخص.'
    },
    { 
      id: 'TAX', 
      name: 'المالية والضرائب', 
      icon: (
        <svg className="w-12 h-12" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8c-1.657 0-3 .895-3 2s1.343 2 3 2 3 .895 3 2-1.343 2-3 2m0-8c1.11 0 2.08.402 2.599 1M12 8V7m0 1v8m0 0v1m0-1c-1.11 0-2.08-.402-2.599-1M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      description: 'براءات الذمة، الضرائب العقارية، والتكاليف المالية.'
    }
  ];

  return (
    <div className="min-h-screen bg-gov-bg flex flex-col font-sans text-right" dir="rtl">
      {/* Global Real-time Popups */}
      <TransferPopup />

      {/* Top Navbar */}
      <nav className="bg-gov-secondary text-white shadow-2xl border-b-4 border-gov-primary sticky top-0 z-50">
        <div className="max-w-7xl mx-auto px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-4">
            <div className="cursor-pointer transition-transform hover:scale-110" onClick={() => {setView('DASHBOARD'); setActiveCategory(null);}}>
               <img src={logo} alt="Logo" className="w-12 h-12 drop-shadow-md" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-gov-primary leading-tight">بوابة الحكومة الإلكترونية</h1>
              <p className="text-[10px] text-gray-300 uppercase tracking-widest">الجمهورية العربية السورية</p>
            </div>
          </div>

          <div className="flex items-center gap-4 sm:gap-8">
            {user.role === 'CITIZEN' && (
              <div className="flex items-center gap-3 border-l border-white/10 pl-6 ml-2">
                <button 
                  onClick={() => setView('REQUESTS')}
                  className={`text-sm font-bold transition-all ${view === 'REQUESTS' ? 'text-gov-primary' : 'text-gray-300 hover:text-white'}`}
                >
                  طلباتي
                </button>
                <NotificationBell />
              </div>
            )}

            <div className="hidden md:block">
              <p className="text-sm font-bold text-gov-primary">{user.fullName}</p>
              <p className="text-[10px] text-gray-400">الرقم الوطني: {user.nationalId}</p>
            </div>
            <button 
              onClick={logout}
              className="bg-gov-primary text-gov-secondary px-4 py-2 rounded-xl text-xs font-bold hover:brightness-110 transition-all"
            >
              خروج
            </button>
          </div>
        </div>
      </nav>

      {/* Main Content Area */}
      <main className="flex-grow max-w-7xl mx-auto w-full px-6 py-12">
        
        {user.role === 'EMPLOYEE' ? (
          <div className="space-y-20">
            <header className="mb-12 flex flex-col md:flex-row justify-between items-start md:items-end gap-6">
              <div>
                <h2 className="text-4xl font-bold text-gov-secondary mb-2">منصة العمليات الحكومية</h2>
                <p className="text-gray-500">سجل الدخول كـ: {user.fullName} | موظف مختص</p>
              </div>
              
              <div className="flex gap-2 w-full md:w-auto">
                 <input 
                   type="text" placeholder="بحث برقم وطني..." 
                   className="gov-input english-nums py-2" 
                   value={searchId} onChange={(e) => setSearchId(e.target.value)}
                 />
                 <div className="flex gap-1">
                   <button onClick={() => downloadRecord(searchId, 'individual')} className="bg-gov-secondary text-gov-primary px-4 py-2 rounded-xl font-bold text-xs">قيد فردي</button>
                   <button onClick={() => downloadRecord(searchId, 'family')} className="bg-gov-secondary text-gov-primary px-4 py-2 rounded-xl font-bold text-xs">بيان عائلي</button>
                 </div>
              </div>
            </header>
            
            <div className="grid grid-cols-1 gap-20">
              <EmployeeQueue />
              <EmployeeTrafficQueue />
            </div>
          </div>
        ) : view === 'REQUESTS' ? (
          <MyRequests onBack={() => setView('DASHBOARD')} />
        ) : (
          <div className="space-y-12">
            {!activeCategory ? (
              <>
                <header className="mb-12 text-center">
                  <h2 className="text-4xl font-bold text-gov-secondary mb-4">أهلاً بك في البوابة الوطنية</h2>
                  <p className="text-gray-500 text-lg">اختر القسم المطلوب للبدء بمعاملتك الإلكترونية</p>
                </header>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
                  {categories.map((cat) => (
                    <div key={cat.id} onClick={() => setActiveCategory(cat.id)} className="gov-card p-10 flex flex-col items-center text-center cursor-pointer hover:scale-[1.03] transition-all group border-b-8 border-transparent hover:border-gov-primary">
                      <div className="bg-gov-secondary text-gov-primary p-6 rounded-3xl mb-6 shadow-lg">{cat.icon}</div>
                      <h3 className="text-2xl font-bold text-gov-secondary mb-3">{cat.name}</h3>
                      <p className="text-sm text-gray-500 leading-relaxed">{cat.description}</p>
                    </div>
                  ))}
                </div>
              </>
            ) : (
              <div className="animate-fade-in space-y-10">
                <button onClick={() => setActiveCategory(null)} className="flex items-center gap-2 text-gov-secondary font-bold hover:text-gov-primary transition-colors">
                  <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" /></svg>
                  العودة للأقسام الرئيسية
                </button>

                {activeCategory === 'CIVIL' && (
                  <div className="space-y-12">
                    <header>
                      <h2 className="text-4xl font-bold text-gov-secondary mb-2">قسم الشؤون المدنية</h2>
                      <p className="text-gray-500">بيانات القيد الفردي والعائلي والولادات.</p>
                    </header>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
                       <div className="gov-card p-8 border-r-8 border-gov-primary flex flex-col justify-between hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => downloadRecord(null, 'individual')}>
                          <div><div className="bg-gov-bg p-3 rounded-xl w-fit text-gov-secondary mb-4 shadow-inner"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" /></svg></div><h4 className="text-xl font-bold text-gov-secondary mb-2">إخراج قيد فردي</h4><p className="text-gray-500 text-xs leading-relaxed">تحميل وثيقة القيد المدني الفردي بصيغة PDF.</p></div>
                       </div>
                       <div className="gov-card p-8 border-r-8 border-gov-primary flex flex-col justify-between hover:shadow-2xl transition-shadow cursor-pointer" onClick={() => downloadRecord(null, 'family')}>
                          <div><div className="bg-gov-bg p-3 rounded-xl w-fit text-gov-secondary mb-4 shadow-inner"><svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" /></svg></div><h4 className="text-xl font-bold text-gov-secondary mb-2">بيان قيد عائلي</h4><p className="text-gray-500 text-xs leading-relaxed">تحميل خلاصة السجل المدني للعائلة والأولاد.</p></div>
                       </div>
                       <div className="gov-card p-8 bg-gov-secondary text-white relative overflow-hidden flex items-center shadow-2xl"><div className="absolute top-0 right-0 w-64 h-64 bg-gov-primary opacity-10 -mr-20 -mt-20 rounded-full"></div><div className="relative z-10"><h4 className="text-gov-primary text-xl font-bold mb-2">دليل الخدمات</h4><p className="text-gray-300 text-[10px] leading-relaxed">الوثائق الرقمية المستخرجة من هذه المنصة قانونية ومعتمدة رسمياً.</p></div></div>
                    </div>
                    <div className="grid grid-cols-1 xl:grid-cols-2 gap-12"><MarriageRegistrationForm /><BirthRegistrationForm /></div>
                  </div>
                )}

                {activeCategory === 'TRAFFIC' && (
                   <div className="space-y-12">
                      <header>
                        <h2 className="text-4xl font-bold text-gov-secondary mb-2">قسم المرور والنقل</h2>
                        <p className="text-gray-500">إدارة المركبات، نقل الملكية، وكشف المخالفات.</p>
                      </header>
                      <MyVehicles />
                   </div>
                )}
                
                {activeCategory === 'TAX' && (
                   <div className="gov-card p-20 text-center">
                      <h2 className="text-3xl font-bold text-gov-secondary mb-4">الخدمات المالية والضرائب</h2>
                      <p className="text-gray-500">سيتم توفير براءات الذمة وخدمات التحصيل المالي قريباً.</p>
                   </div>
                )}
              </div>
            )}
          </div>
        )}
      </main>

      <footer className="bg-white/50 border-t border-gray-200 py-10 px-6 text-center mt-auto">
        <p className="text-gray-400 text-xs font-bold uppercase tracking-widest">نظام الحكومة الإلكترونية الموحد © 2026</p>
      </footer>
    </div>
  )
}

export default App
