import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import { useTrafficStore } from '../../store/trafficStore';
import { useState, useEffect } from 'react';
import axios from 'axios';

function TransferPopup() {
  const socket = useSocketStore((state) => state.socket);
  const token = useAuthStore((state) => state.token);
  const { activeOffer, setActiveOffer, clearActiveOffer } = useTrafficStore();
  
  const [view, setView] = useState('OFFER'); // OFFER, PAYMENT
  const [refNum, setRefNum] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!activeOffer) return;
    if (activeOffer.status === 'WAITING_FOR_PAYMENT') {
      setView('PAYMENT');
    } else {
      setView('OFFER');
    }
  }, [activeOffer]);

  useEffect(() => {
    // 1. Check for existing pending offers on mount (prevents loss on refresh)
    const checkExistingOffers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/traffic/incoming-transfers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.length > 0 && !activeOffer) {
          const t = res.data[0];
          setActiveOffer({
            transferId: t.id,
            sellerName: t.seller.fullName,
            vehicleModel: t.vehicle.model,
            plateNumber: t.vehicle.plateNumber,
            price: t.price,
            status: t.status
          });
          if (t.status === 'WAITING_FOR_PAYMENT') setView('PAYMENT');
        }
      } catch (e) { console.error("Error fetching offers:", e); }
    };

    if (token) checkExistingOffers();

    // 2. Listen for real-time offers
    if (!socket) return;
    socket.on('vehicle_transfer_offer', (data) => {
      setActiveOffer({ ...data, status: 'PENDING_BUYER' });
      setView('OFFER');
    });

    return () => socket.off('vehicle_transfer_offer');
  }, [socket, token, setActiveOffer]);

  const respond = async (decision) => {
    try {
      await axios.post('http://localhost:5000/api/traffic/respond-transfer', {
        transferId: activeOffer.transferId,
        decision
      }, { headers: { Authorization: `Bearer ${token}` } });
      
      if (decision === 'ACCEPT') {
        setView('PAYMENT');
      } else {
        clearActiveOffer();
        alert('تم رفض العرض');
      }
    } catch (e) { alert('خطأ في معالجة الرد'); }
  };

  const submitPayment = async () => {
    setLoading(true);
    try {
      await axios.post('http://localhost:5000/api/traffic/submit-bank-proof', {
        transferId: activeOffer.transferId,
        referenceNumber: refNum
      }, { headers: { Authorization: `Bearer ${token}` } });
      alert('تم التحقق بنجاح، المعاملة الآن قيد التدقيق الحكومي');
      clearActiveOffer();
      setView('OFFER');
    } catch (e) {
      alert(e.response?.data?.error || 'رقم الحوالة غير صحيح');
    } finally {
      setLoading(false);
    }
  };

  if (!activeOffer) return null;

  return (
    <div className="fixed inset-0 bg-gov-secondary/80 backdrop-blur-md flex items-center justify-center z-[200] p-6 text-right" dir="rtl">
      <div className="gov-card p-10 max-w-lg w-full border-t-8 border-gov-primary animate-fade-in shadow-2xl relative">
        <button 
          onClick={() => clearActiveOffer()} 
          className="absolute top-4 left-4 text-gray-400 hover:text-red-500 font-bold transition-colors"
        >
          إغلاق ✕
        </button>

        <div className="flex justify-between items-start mb-6">
           <h3 className="text-2xl font-bold text-gov-secondary">طلب نقل ملكية مركبة</h3>
           <span className="bg-gov-primary text-gov-secondary px-3 py-1 rounded-full text-[10px] font-bold">تنبيه فوري</span>
        </div>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          يرغب المواطن <span className="font-bold text-gov-secondary">{activeOffer.sellerName}</span> بنقل ملكية سيارة <span className="font-bold">{activeOffer.vehicleModel}</span> (لوحة: <span className="font-mono">{activeOffer.plateNumber}</span>) إليك، بسعر متفق عليه قدره <span className="font-bold text-gov-primary english-nums">{activeOffer.price.toLocaleString()} ل.س</span>.
        </p>

        {view === 'OFFER' ? (
          <div className="flex flex-col sm:flex-row gap-4">
            <button 
              onClick={() => respond('ACCEPT')}
              className="flex-grow bg-gov-secondary text-gov-primary font-bold py-3 rounded-xl hover:brightness-125 transition-all shadow-xl"
            >
              قبول وتثبيت الشراء
            </button>
            <button 
              onClick={() => respond('DECLINE')}
              className="px-8 py-3 border border-red-200 text-red-600 rounded-xl font-bold hover:bg-red-50 transition-all"
            >
              رفض العرض
            </button>
          </div>
        ) : (
          <div className="space-y-6 animate-fade-in">
            <div className="bg-blue-50 p-4 rounded-xl border border-blue-100">
               <p className="text-xs text-blue-700 font-bold mb-2">الخطوة الأخيرة: التحقق المالي</p>
               <p className="text-[10px] text-blue-600">يرجى إدخال رقم الإشعار البنكي الخاص بالحوالة التي قمت بإرسالها للمشتري عبر المصرف التجاري أو العقاري. يمكنك إجراء الحوالة عبر قسم "المصرف المركزي" في البوابة.</p>
            </div>
            
            <div>
               <label className="block text-xs font-bold text-gray-400 mb-2 uppercase tracking-tighter">رقم الحوالة البنكية (Reference Number)</label>
               <input 
                 type="text" placeholder="مثال: BANK-SYR-XXXXXX"
                 className="gov-input english-nums text-center text-lg font-mono tracking-widest"
                 value={refNum} onChange={(e) => setRefNum(e.target.value)}
               />
            </div>

            <div className="flex flex-col gap-3">
              <button 
                onClick={submitPayment}
                disabled={loading || !refNum}
                className="w-full bg-gov-secondary text-gov-primary font-bold py-4 rounded-xl hover:brightness-125 transition-all shadow-xl disabled:opacity-50"
              >
                {loading ? 'جاري التحقق مع البنك المركزي...' : 'تحقق وتثبيت المعاملة'}
              </button>
              <button 
                onClick={() => respond('DECLINE')}
                disabled={loading}
                className="w-full py-2 text-xs font-bold text-red-500 hover:text-red-700 transition-colors"
              >
                إلغاء المعاملة ورفض الشراء
              </button>
            </div>
          </div>
        )}
        
        <p className="mt-6 text-[10px] text-gray-400 text-center">بإغلاق هذه النافذة لن يتم إلغاء الطلب، يمكنك العودة إليه لاحقاً من صفحة المرور.</p>
      </div>
    </div>
  );
}

export default TransferPopup;
