import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function MyRequests({ onBack }) {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchRequests = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/citizen/requests', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setRequests(response.data);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };
    fetchRequests();
  }, [token]);

  const getStatusBadge = (status) => {
    switch (status) {
      case 'PENDING':
        return <span className="bg-yellow-100 text-yellow-700 px-3 py-1 rounded-full text-xs font-bold">قيد المراجعة</span>;
      case 'APPROVED':
        return <span className="bg-green-100 text-green-700 px-3 py-1 rounded-full text-xs font-bold">مكتمل</span>;
      case 'REJECTED':
        return <span className="bg-red-100 text-red-700 px-3 py-1 rounded-full text-xs font-bold">مرفوض</span>;
      default:
        return <span className="bg-gray-100 text-gray-700 px-3 py-1 rounded-full text-xs font-bold">{status}</span>;
    }
  };

  return (
    <div className="animate-fade-in space-y-8">
      <button 
        onClick={onBack}
        className="flex items-center gap-2 text-gov-secondary font-bold hover:text-gov-primary transition-colors"
      >
        <svg className="w-5 h-5 rotate-180" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M17 8l4 4m0 0l-4 4m4-4H3" />
        </svg>
        العودة للرئيسية
      </button>

      <header>
        <h2 className="text-3xl font-bold text-gov-secondary mb-2">سجل طلباتي</h2>
        <p className="text-gray-500">تتبع حالة جميع المعاملات التي قمت بتقديمها عبر المنصة.</p>
      </header>

      {loading ? (
        <div className="text-center py-20">جاري تحميل البيانات...</div>
      ) : requests.length === 0 ? (
        <div className="gov-card p-20 text-center text-gray-400">
           <p>ليس لديك أي طلبات سابقة حالياً.</p>
        </div>
      ) : (
        <div className="gov-card overflow-hidden">
          <table className="w-full text-right border-collapse">
            <thead>
              <tr className="bg-gov-secondary text-gov-primary text-sm uppercase tracking-widest">
                <th className="p-6">رقم الطلب</th>
                <th className="p-6">الخدمة</th>
                <th className="p-6">التفاصيل</th>
                <th className="p-6">تاريخ التقديم</th>
                <th className="p-6">الحالة</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {requests.map((req) => (
                <tr key={req.id} className="hover:bg-gray-50 transition-colors">
                  <td className="p-6 text-xs font-mono text-gray-400">{req.id.substring(0, 8)}...</td>
                  <td className="p-6 font-bold text-gov-secondary">{req.service}</td>
                  <td className="p-6 text-sm text-gray-600">{req.details}</td>
                  <td className="p-6 text-sm text-gray-500">{new Date(req.date).toLocaleDateString('ar-SY')}</td>
                  <td className="p-6">{getStatusBadge(req.status)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export default MyRequests;
