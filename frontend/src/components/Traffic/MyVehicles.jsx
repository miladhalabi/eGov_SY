import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../../store/authStore';
import { useTrafficStore } from '../../store/trafficStore';

function MyVehicles() {
  const [vehicles, setVehicles] = useState([]);
  const [incoming, setIncoming] = useState([]);
  const [loading, setLoading] = useState(true);
  const [transferData, setTransferData] = useState({ vehicleId: '', buyerId: '', price: '' });
  const [msg, setMsg] = useState(null);
  const token = useAuthStore((state) => state.token);
  const { setActiveOffer } = useTrafficStore();

  const fetchData = async () => {
    try {
      const [vRes, iRes] = await Promise.all([
        axios.get('http://localhost:5000/api/traffic/my-vehicles', { headers: { Authorization: `Bearer ${token}` } }),
        axios.get('http://localhost:5000/api/traffic/incoming-transfers', { headers: { Authorization: `Bearer ${token}` } })
      ]);
      setVehicles(vRes.data);
      setIncoming(iRes.data);
    } catch (e) { console.error(e); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleTransfer = async (e) => {
    e.preventDefault();
    setMsg(null);
    try {
      const res = await axios.post('http://localhost:5000/api/traffic/initiate-transfer', {
        vehicleId: transferData.vehicleId,
        buyerNationalId: transferData.buyerId,
        price: transferData.price
      }, { headers: { Authorization: `Bearer ${token}` } });
      setMsg({ type: 'success', text: res.data.message });
      fetchData();
    } catch (error) {
      setMsg({ type: 'error', text: error.response?.data?.error || 'خطأ في العملية' });
    }
  };

  const openIncoming = (t) => {
    setActiveOffer({
      transferId: t.id,
      sellerName: t.seller.fullName,
      vehicleModel: t.vehicle.model,
      plateNumber: t.vehicle.plateNumber,
      price: t.price,
      status: t.status
    });
  };

  if (loading) return <div className="text-center py-10">جاري تحميل بيانات المركبات...</div>;

  return (
    <div className="space-y-12">
      {/* Incoming Purchases Section */}
      {incoming.length > 0 && (
        <section className="space-y-6">
          <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">عروض الشراء الواردة</h3>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {incoming.map(t => (
              <div key={t.id} className="gov-card p-6 border-r-8 border-blue-500 bg-blue-50/30">
                 <div className="flex justify-between items-start mb-4">
                    <div>
                      <h4 className="text-lg font-bold text-gov-secondary">{t.vehicle.model}</h4>
                      <p className="text-xs text-gray-400 font-mono tracking-widest">{t.vehicle.plateNumber}</p>
                    </div>
                    <span className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold uppercase">
                      {t.status === 'PENDING_BUYER' ? 'بانتظار قبولك' : 'بانتظار الدفع'}
                    </span>
                 </div>
                 <div className="flex justify-between items-center mt-6">
                    <div className="text-xs">
                       <p className="text-gray-400">البائع: <span className="text-gov-secondary font-bold">{t.seller.fullName}</span></p>
                       <p className="text-gov-primary font-bold mt-1 english-nums">{t.price.toLocaleString()} ل.س</p>
                    </div>
                    <button 
                      onClick={() => openIncoming(t)}
                      className="bg-gov-secondary text-gov-primary px-4 py-2 rounded-lg text-xs font-bold hover:brightness-125 transition-all"
                    >
                      {t.status === 'PENDING_BUYER' ? 'مراجعة العرض' : 'إكمال الدفع'}
                    </button>
                 </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* My Vehicles Section */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">مركباتي المسجلة</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {vehicles.map(v => (
            <div key={v.id} className={`gov-card p-6 border-r-8 ${(v.transfers[0]?.status === 'PENDING_BUYER' || v.transfers[0]?.status === 'PENDING_EMPLOYEE' || v.transfers[0]?.status === 'WAITING_FOR_PAYMENT') ? 'border-yellow-400 opacity-70' : 'border-gov-primary'}`}>
               <div className="flex justify-between items-start mb-4">
                  <div>
                    <h4 className="text-xl font-bold text-gov-secondary">{v.model}</h4>
                    <p className="text-xs text-gray-400 font-mono tracking-widest">{v.plateNumber}</p>
                  </div>
                  <span className="bg-gov-bg px-3 py-1 rounded-full text-[10px] font-bold">سنة {v.year}</span>
               </div>
               
               {v.transfers[0]?.status === 'PENDING_BUYER' ? (
                  <div className="bg-yellow-50 text-yellow-700 p-2 rounded text-xs text-center border border-yellow-100 font-bold">
                    بانتظار موافقة المشتري...
                  </div>
               ) : v.transfers[0]?.status === 'WAITING_FOR_PAYMENT' ? (
                  <div className="bg-blue-50 text-blue-700 p-2 rounded text-xs text-center border border-blue-100 font-bold">
                    بانتظار إثبات الدفع من المشتري...
                  </div>
               ) : v.transfers[0]?.status === 'PENDING_EMPLOYEE' ? (
                  <div className="bg-green-50 text-green-700 p-2 rounded text-xs text-center border border-green-100 font-bold">
                    قيد المراجعة الحكومية...
                  </div>
               ) : (
                  <button 
                    onClick={() => setTransferData({ ...transferData, vehicleId: v.id })}
                    className="w-full mt-4 py-2 border border-gov-secondary text-gov-secondary rounded-lg text-sm font-bold hover:bg-gov-secondary hover:text-white transition-all"
                  >
                    بدء عملية نقل ملكية
                  </button>
               )}
            </div>
          ))}
          {vehicles.length === 0 && <div className="md:col-span-2 text-center py-20 gov-card text-gray-400">لا توجد مركبات مسجلة باسمك</div>}
        </div>
      </section>

      {/* Transfer Form */}
      {transferData.vehicleId && (
        <section className="gov-card p-8 animate-fade-in bg-white shadow-2xl relative overflow-hidden">
          <button onClick={() => setTransferData({ ...transferData, vehicleId: '' })} className="absolute top-4 left-4 text-gray-400 hover:text-red-500 font-bold">إلغاء ✕</button>
          <h3 className="text-xl font-bold text-gov-secondary mb-6">تفاصيل نقل الملكية</h3>
          
          {msg && (
            <div className={`p-4 rounded-xl mb-6 text-sm ${msg.type === 'success' ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700 border border-red-100'}`}>
              {msg.text}
            </div>
          )}

          <form onSubmit={handleTransfer} className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">الرقم الوطني للمشتري</label>
              <input 
                type="text" className="gov-input english-nums" required
                value={transferData.buyerId} onChange={(e) => setTransferData({ ...transferData, buyerId: e.target.value })}
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">سعر البيع المتفق عليه</label>
              <input 
                type="number" className="gov-input english-nums" required
                value={transferData.price} onChange={(e) => setTransferData({ ...transferData, price: e.target.value })}
              />
            </div>
            <div className="md:col-span-2">
               <button type="submit" className="gov-button-primary w-full shadow-lg">إرسال العرض للمشتري</button>
               <p className="text-[10px] text-gray-400 mt-3 text-center italic">سيقوم النظام بالتحقق فوراً من عدم وجود مخالفات أو ذمم مالية قبل إرسال العرض.</p>
            </div>
          </form>
        </section>
      )}
    </div>
  );
}

export default MyVehicles;
