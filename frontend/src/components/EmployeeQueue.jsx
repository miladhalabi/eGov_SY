import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

function EmployeeQueue() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const socket = useSocketStore((state) => state.socket);

  const fetchRequests = async () => {
    try {
      const response = await axios.get('http://localhost:5000/api/civil/pending-births', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(response.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  // Real-time listener
  useEffect(() => {
    if (!socket) return;

    socket.on('new_birth_request', (newRequest) => {
      setRequests(prev => [newRequest, ...prev]);
    });

    return () => {
      socket.off('new_birth_request');
    };
  }, [socket]);

  const approve = async (id) => {
    if (!window.confirm('هل أنت متأكد من الموافقة على هذا الطلب؟')) return;
    
    try {
      await axios.post('http://localhost:5000/api/civil/approve-birth', { registrationId: id }, {
        headers: { Authorization: `Bearer ${token}` }
      });
      fetchRequests();
    } catch (error) {
      alert('حدث خطأ أثناء الموافقة');
    }
  };

  if (loading) return <div className="text-center p-10">جاري تحميل الطلبات...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">طلبات تسجيل الولادة المعلقة</h3>
      
      {requests.length === 0 ? (
        <div className="gov-card p-10 text-center text-gray-500">لا توجد طلبات معلقة حالياً</div>
      ) : (
        <div className="grid grid-cols-1 gap-4">
          {requests.map((req) => (
            <div key={req.id} className="gov-card p-6 flex flex-col md:flex-row justify-between items-center gap-6">
              <div className="flex-grow">
                <p className="text-xs text-gov-primary font-bold mb-1 uppercase tracking-tighter">مقدم الطلب: {req.citizenRequest.citizen.fullName}</p>
                <h4 className="text-lg font-bold text-gov-secondary">اسم المولود: {req.childName} ({req.childGender})</h4>
                <p className="text-xs text-gray-400">تاريخ الطلب: {new Date(req.createdAt).toLocaleString('ar-SY')}</p>
              </div>
              
              <div className="flex gap-3">
                <a 
                  href={`http://localhost:5000/${req.hospitalDoc}`} 
                  target="_blank" 
                  rel="noreferrer"
                  className="px-4 py-2 border border-gov-secondary text-gov-secondary rounded-lg text-sm font-bold hover:bg-gov-secondary hover:text-white transition-all"
                >
                  عرض الوثيقة
                </a>
                <button 
                  onClick={() => approve(req.id)}
                  className="bg-gov-secondary text-gov-primary px-6 py-2 rounded-lg text-sm font-bold hover:brightness-125 transition-all"
                >
                  موافقة
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default EmployeeQueue;
