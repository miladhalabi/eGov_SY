import { useSocketStore } from '../../store/socketStore';
import { useAuthStore } from '../../store/authStore';
import { useState, useEffect } from 'react';
import axios from 'axios';

function TransferPopup() {
  const socket = useSocketStore((state) => state.socket);
  const token = useAuthStore((state) => state.token);
  const [offer, setOffer] = useState(null);

  useEffect(() => {
    // 1. Check for existing pending offers on mount (prevents loss on refresh)
    const checkExistingOffers = async () => {
      try {
        const res = await axios.get('http://localhost:5000/api/traffic/incoming-transfers', {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.data && res.data.length > 0) {
          const t = res.data[0];
          setOffer({
            transferId: t.id,
            sellerName: t.seller.fullName,
            vehicleModel: t.vehicle.model,
            plateNumber: t.vehicle.plateNumber,
            price: t.price
          });
        }
      } catch (e) { console.error("Error fetching offers:", e); }
    };

    if (token) checkExistingOffers();

    // 2. Listen for real-time offers
    if (!socket) return;
    socket.on('vehicle_transfer_offer', (data) => {
      setOffer(data);
    });

    return () => socket.off('vehicle_transfer_offer');
  }, [socket, token]);

  const respond = async (decision) => {
    try {
      await axios.post('http://localhost:5000/api/traffic/respond-transfer', {
        transferId: offer.transferId,
        decision
      }, { headers: { Authorization: `Bearer ${token}` } });
      setOffer(null);
      alert(decision === 'ACCEPT' ? 'تم قبول العرض بنجاح' : 'تم رفض العرض');
    } catch (e) { alert('خطأ في معالجة الرد'); }
  };

  if (!offer) return null;

  return (
    <div className="fixed inset-0 bg-gov-secondary/80 backdrop-blur-md flex items-center justify-center z-[200] p-6 text-right" dir="rtl">
      <div className="gov-card p-10 max-w-lg w-full border-t-8 border-gov-primary animate-fade-in shadow-2xl">
        <div className="flex justify-between items-start mb-6">
           <h3 className="text-2xl font-bold text-gov-secondary">طلب نقل ملكية مركبة</h3>
           <span className="bg-gov-primary text-gov-secondary px-3 py-1 rounded-full text-[10px] font-bold">تنبيه فوري</span>
        </div>
        
        <p className="text-gray-600 mb-8 leading-relaxed">
          يرغب المواطن <span className="font-bold text-gov-secondary">{offer.sellerName}</span> بنقل ملكية سيارة <span className="font-bold">{offer.vehicleModel}</span> (لوحة: <span className="font-mono">{offer.plateNumber}</span>) إليك، بسعر متفق عليه قدره <span className="font-bold text-gov-primary">{offer.price} ل.س</span>.
        </p>

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
        
        <p className="mt-6 text-[10px] text-gray-400 text-center">بقبولك هذا العرض، تنتقل المعاملة للتدقيق الحكومي النهائي.</p>
      </div>
    </div>
  );
}

export default TransferPopup;
