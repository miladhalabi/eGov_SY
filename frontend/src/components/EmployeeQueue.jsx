import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';
import { useSocketStore } from '../store/socketStore';

function EmployeeQueue() {
  const [births, setBirths] = useState([]);
  const [marriages, setMarriages] = useState([]);
  const [loading, setLoading] = useState(true);
  const token = useAuthStore((state) => state.token);
  const socket = useSocketStore((state) => state.socket);

  const fetchData = async () => {
    try {
      const [birthRes, marriageRes] = await Promise.all([
        axios.get('http://localhost:5000/api/civil/pending-births', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/civil/pending-marriages', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setBirths(birthRes.data);
      setMarriages(marriageRes.data);
    } catch (error) {
      console.error(error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  useEffect(() => {
    if (!socket) return;
    socket.on('new_birth_request', (req) => setBirths(prev => [req, ...prev]));
    socket.on('new_marriage_request', (req) => setMarriages(prev => [req, ...prev]));
    return () => {
      socket.off('new_birth_request');
      socket.off('new_marriage_request');
    };
  }, [socket]);

  const approveBirth = async (id) => {
    if (!window.confirm('موافقة على الولادة؟')) return;
    try {
      await axios.post('http://localhost:5000/api/civil/approve-birth', { registrationId: id }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (e) { alert('خطأ'); }
  };

  const approveMarriage = async (id) => {
    if (!window.confirm('موافقة على تثبيت الزواج؟')) return;
    try {
      await axios.post('http://localhost:5000/api/civil/approve-marriage', { requestId: id }, { headers: { Authorization: `Bearer ${token}` } });
      fetchData();
    } catch (e) { alert('خطأ'); }
  };

  if (loading) return <div className="text-center p-10">جاري التحميل...</div>;

  return (
    <div className="space-y-12">
      {/* Marriages Queue */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">طلبات تسجيل الزواج ({marriages.length})</h3>
        <div className="grid grid-cols-1 gap-4">
          {marriages.map((m) => (
            <div key={m.id} className="gov-card p-6 flex justify-between items-center bg-blue-50/30">
              <div>
                <p className="text-xs text-gov-primary font-bold">المقدم: {m.initiator.fullName}</p>
                <h4 className="font-bold text-gov-secondary text-lg">الطرف الآخر: {m.partnerNationalId}</h4>
                <p className="text-xs text-gray-400">رقم العقد: {m.contractNumber}</p>
              </div>
              <div className="flex gap-3">
                 <a href={`http://localhost:5000/${m.documentPath}`} target="_blank" className="px-4 py-2 border border-gov-secondary rounded-lg text-sm font-bold">وثيقة العقد</a>
                 <button onClick={() => approveMarriage(m.id)} className="bg-gov-secondary text-gov-primary px-6 py-2 rounded-lg font-bold">تثبيت الزواج</button>
              </div>
            </div>
          ))}
          {marriages.length === 0 && <p className="text-center text-gray-400 py-10 gov-card">لا يوجد طلبات زواج</p>}
        </div>
      </section>

      {/* Births Queue */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">طلبات تسجيل الولادة ({births.length})</h3>
        <div className="grid grid-cols-1 gap-4">
          {births.map((b) => (
            <div key={b.id} className="gov-card p-6 flex justify-between items-center">
              <div>
                <p className="text-xs text-gov-primary font-bold">المقدم: {b.citizenRequest.citizen.fullName}</p>
                <h4 className="font-bold text-gov-secondary text-lg">المولود: {b.childName} ({b.childGender})</h4>
              </div>
              <div className="flex gap-3">
                 <a href={`http://localhost:5000/${b.hospitalDoc}`} target="_blank" className="px-4 py-2 border border-gov-secondary rounded-lg text-sm font-bold">عرض الشهادة</a>
                 <button onClick={() => approveBirth(b.id)} className="bg-gov-secondary text-gov-primary px-6 py-2 rounded-lg font-bold">موافقة</button>
              </div>
            </div>
          ))}
          {births.length === 0 && <p className="text-center text-gray-400 py-10 gov-card">لا يوجد طلبات ولادة</p>}
        </div>
      </section>
    </div>
  );
}

export default EmployeeQueue;
