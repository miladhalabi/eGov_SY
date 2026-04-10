import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';

function TaxDashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  const fetchStatus = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/tax/status', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setData(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchStatus(); }, []);

  const downloadClearance = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/tax/clearance-pdf', {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `financial_clearance.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) { alert('خطأ في استخراج الوثيقة'); }
  };

  if (loading) return <div className="text-center py-20">جاري فحص السجل المالي...</div>;

  return (
    <div className="animate-fade-in space-y-10">
      <header>
        <h2 className="text-3xl font-bold text-gov-secondary mb-2">الخدمات المالية والضرائب</h2>
        <p className="text-gray-500">الاطلاع على الذمم المالية واستخراج براءات الذمة.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Status Summary Card */}
        <div className={`gov-card p-8 border-r-8 ${data?.totalDebt === 0 ? 'border-green-500' : 'border-red-500'}`}>
           <h4 className="text-gray-400 font-bold text-xs uppercase mb-2">إجمالي الذمم المستحقة</h4>
           <p className={`text-4xl font-black ${data?.totalDebt === 0 ? 'text-green-600' : 'text-red-600'} english-nums`}>
             {data?.totalDebt} <span className="text-sm font-normal font-sans">ل.س</span>
           </p>
           <p className="text-xs text-gray-400 mt-4 italic">محدث بتاريخ اليوم</p>
        </div>

        {/* Action Card */}
        <div className="lg:col-span-2 gov-card p-8 bg-gov-secondary text-white relative overflow-hidden flex items-center">
          <div className="absolute top-0 right-0 w-64 h-64 bg-gov-primary opacity-10 -mr-20 -mt-20 rounded-full"></div>
          <div className="relative z-10 flex flex-col md:flex-row justify-between items-center w-full gap-6">
             <div>
                <h4 className="text-gov-primary text-xl font-bold mb-2">طلب براءة ذمة مالية</h4>
                <p className="text-gray-300 text-sm max-w-md">يمكنك استخراج وثيقة رسمية تثبت خلو صحيفتك المالية من أي ديون تجاه الدولة.</p>
             </div>
             <button 
               onClick={downloadClearance}
               className="bg-gov-primary text-gov-secondary px-8 py-3 rounded-xl font-bold hover:brightness-110 transition-all shadow-xl whitespace-nowrap"
             >
               استخراج الوثيقة
             </button>
          </div>
        </div>
      </div>

      {/* Detailed Records Table */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">تفاصيل السجل المالي</h3>
        <div className="gov-card overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gray-50 text-gray-400 text-[10px] uppercase tracking-widest border-b border-gray-100">
                <th className="p-6">نوع التكليف</th>
                <th className="p-6">البيان</th>
                <th className="p-6">المبلغ</th>
                <th className="p-6">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {data?.records.map(r => (
                <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-6 font-bold text-gov-secondary text-sm">{r.type}</td>
                  <td className="p-6 text-sm text-gray-500">{r.description}</td>
                  <td className="p-6 font-mono text-gov-secondary english-nums">{r.amount} ل.س</td>
                  <td className="p-6">
                    {r.isPaid ? (
                      <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-[10px] font-bold">مسدد</span>
                    ) : (
                      <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-[10px] font-bold">غير مسدد</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

export default TaxDashboard;
