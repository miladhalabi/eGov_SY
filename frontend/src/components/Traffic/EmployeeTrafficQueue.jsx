import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useSocketStore } from '../../store/socketStore';

function EmployeeTrafficQueue() {
  const [transfers, setTransfers] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const socket = useSocketStore((state) => state.socket);

  const fetchTransfers = async () => {
    try {
      const res = await axios.get('http://localhost:5000/api/traffic/pending-transfers', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setTransfers(res.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchTransfers(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_vehicle_transfer_task', fetchTransfers);
    return () => socket.off('new_vehicle_transfer_task');
  }, [socket]);

  const handleFinalize = async (id, status) => {
    let reason = "";
    if (status === 'REJECTED') {
      reason = window.prompt("سبب الرفض:");
      if (!reason) return;
    }

    try {
      await axios.post('http://localhost:5000/api/traffic/finalize-transfer', {
        transferId: id, status, reason
      }, { headers: { Authorization: `Bearer ${token}` } });
      fetchTransfers();
    } catch (e) { alert('خطأ'); }
  };

  if (loading) return <div>جاري التحميل...</div>;

  return (
    <div className="space-y-6">
      <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">طلبات نقل الملكية ({transfers.length})</h3>
      <div className="grid grid-cols-1 gap-4">
        {transfers.map(t => (
          <div key={t.id} className="gov-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 bg-yellow-50/20">
             <div className="flex-grow">
                <p className="text-xs font-bold text-gov-primary mb-1 uppercase">معاملة نقل ملكية</p>
                <h4 className="text-lg font-bold text-gov-secondary">{t.vehicle.model} ({t.vehicle.plateNumber})</h4>
                <div className="flex gap-4 mt-2 text-sm text-gray-500">
                   <span>البائع: {t.seller.fullName}</span>
                   <span>المشتري: {t.buyer.fullName}</span>
                </div>
                <p className="text-xs text-gov-primary font-bold mt-2 tracking-widest">السعر: {t.price} ل.س</p>
             </div>
             <div className="flex gap-3">
                <button onClick={() => handleFinalize(t.id, 'COMPLETED')} className="bg-gov-secondary text-gov-primary px-6 py-2 rounded-lg font-bold">تدقيق وتثبيت</button>
                <button onClick={() => handleFinalize(t.id, 'REJECTED')} className="bg-red-50 text-red-600 px-6 py-2 rounded-lg font-bold border border-red-100">رفض</button>
             </div>
          </div>
        ))}
        {transfers.length === 0 && <div className="text-center py-10 gov-card text-gray-400">لا توجد طلبات معلقة</div>}
      </div>
    </div>
  );
}

export default EmployeeTrafficQueue;
