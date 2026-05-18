import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function MyProperties() {
  const [properties, setProperties] = useState([]);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState(null);
  const [checkingId, setCheckingId] = useState(null);
  const token = useAuthStore((state) => state.token);

  const fetchProperties = async () => {
    try {
      const res = await axios.get('/api/realestate/my-properties', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setProperties(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProperties();
  }, []);

  const handleRequestStatement = async (property) => {
    setMsg(null);
    setCheckingId(property.id);

    try {
      // 1. Request statement clearance
      await axios.post('/api/realestate/request-statement', {
        propertyId: property.id
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // 2. Download the statement PDF
      const response = await axios.get(`/api/realestate/statement-pdf/${property.id}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `statement_${property.parcelNumber.replace('/', '_')}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);

      setMsg({ type: 'success', text: 'تم تحميل بيان القيد العقاري بنجاح' });
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'خطأ في استخراج بيان القيد';
      const errDetails = error.response?.data?.details;
      setMsg({ type: 'error', text: errMsg, details: errDetails });
    } finally {
      setCheckingId(null);
    }
  };

  if (loading) return <div className="text-center py-20">جاري تحميل السجل العقاري...</div>;

  return (
    <div className="space-y-10 animate-fade-in text-right">
      <header>
        <h2 className="text-3xl font-bold text-gov-secondary mb-2">المديرية العامة للمصالح العقارية</h2>
        <p className="text-gray-500">استعراض عقاراتك المسجلة، بيان الملكية، وإشارات الحجز أو الرهن.</p>
      </header>

      {msg && (
        <div className={`p-6 rounded-2xl border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} animate-fade-in`}>
          <p className="font-bold mb-2">{msg.text}</p>
          {msg.details && (
            <div className="mt-4 space-y-2">
              <p className="text-xs font-semibold text-red-500">التكاليف المالية المطلوبة للتسديد:</p>
              {msg.details.map((tax) => (
                <div key={tax.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center text-xs">
                  <span>{tax.description}</span>
                  <span className="font-bold font-mono english-nums text-red-600">{tax.amount.toLocaleString()} ل.س</span>
                </div>
              ))}
              <p className="text-xs text-gray-400 mt-2 italic">يرجى الذهاب إلى قسم "المالية والضرائب" لتسديد هذه الذمم الإلكترونية لتفعيل الخدمة.</p>
            </div>
          )}
        </div>
      )}

      {/* Properties Cards */}
      <section className="space-y-6">
        <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">سندات الملكية العقارية</h3>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          {properties.map((prop) => (
            <div key={prop.id} className="gov-card p-8 border-r-8 border-gov-primary flex flex-col justify-between hover:shadow-2xl transition-all">
              <div className="space-y-4">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="text-2xl font-bold text-gov-secondary">عقار في {prop.cadastralZone}</h4>
                    <p className="text-xs text-gray-400 font-mono tracking-widest mt-1">محضر رقم: {prop.parcelNumber}</p>
                  </div>
                  <div className="flex flex-col gap-2 items-end">
                    <span className="bg-gov-bg px-3 py-1 rounded-full text-[10px] font-bold">سند: {prop.titleDeedNumber}</span>
                    {prop.isMortgaged && (
                      <span className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-[9px] font-bold">
                        إشارة رهن نشطة
                      </span>
                    )}
                    {prop.isSeized && (
                      <span className="bg-red-100 text-red-800 px-3 py-1 rounded-full text-[9px] font-bold">
                        إشارة حجز احتياطي
                      </span>
                    )}
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-4 bg-gray-50 p-4 rounded-xl text-xs">
                  <div>
                    <p className="text-gray-400">المساحة</p>
                    <p className="font-bold text-gov-secondary text-sm font-mono mt-1 english-nums">{prop.sizeSqm} م٢</p>
                  </div>
                  <div>
                    <p className="text-gray-400">الحصة والسهم</p>
                    <p className="font-bold text-gov-secondary text-sm font-mono mt-1 english-nums">{prop.shares} / 2400 سهم</p>
                  </div>
                </div>
              </div>

              <button
                onClick={() => handleRequestStatement(prop)}
                disabled={checkingId === prop.id}
                className="w-full mt-6 py-3 bg-gov-secondary text-gov-primary font-bold rounded-xl hover:brightness-125 transition-all shadow-lg text-sm disabled:opacity-50"
              >
                {checkingId === prop.id ? 'جاري التحقق المالي واستخراج السند...' : 'استخراج سند تمليك عقاري رسمي'}
              </button>
            </div>
          ))}

          {properties.length === 0 && (
            <div className="md:col-span-2 text-center py-20 gov-card text-gray-400 border-dashed">
              لا توجد قيود أو عقارات مسجلة باسمك في المصالح العقارية حالياً
            </div>
          )}
        </div>
      </section>
    </div>
  );
}

export default MyProperties;
