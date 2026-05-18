import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function CriminalDashboard() {
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [purpose, setPurpose] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [msg, setMsg] = useState(null);
  const [downloadingId, setDownloadingId] = useState(null);
  const token = useAuthStore((state) => state.token);

  const fetchRequests = async () => {
    try {
      const res = await axios.get('/api/criminal/my-requests', {
        headers: { Authorization: `Bearer ${token}` }
      });
      setRequests(res.data);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setSubmitting(true);

    try {
      const res = await axios.post('/api/criminal/request-clearance', {
        purpose
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setMsg({ type: 'success', text: res.data.message });
      setPurpose('');
      fetchRequests();
    } catch (error) {
      console.error(error);
      const errMsg = error.response?.data?.error || 'فشلت معالجة الطلب';
      const errDetails = error.response?.data?.details;
      setMsg({ type: 'error', text: errMsg, details: errDetails });
    } finally {
      setSubmitting(false);
    }
  };

  const handleDownload = async (reqId) => {
    setDownloadingId(reqId);
    try {
      const response = await axios.get(`/api/criminal/clearance-pdf/${reqId}`, {
        headers: { Authorization: `Bearer ${token}` },
        responseType: 'blob',
      });

      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `non_conviction_${reqId}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (e) {
      alert('خطأ في تحميل وثيقة غير المحكوم');
    } finally {
      setDownloadingId(null);
    }
  };

  if (loading) return <div className="text-center py-20">جاري تحميل منصة السجل العدلي...</div>;

  return (
    <div className="space-y-10 animate-fade-in text-right">
      <header>
        <h2 className="text-3xl font-bold text-gov-secondary mb-2">وزارة العدل - السجل العدلي العام</h2>
        <p className="text-gray-500">منصة إصدار وثيقة خلاصة السجل العدلي (غير محكوم) الفورية بعد فحص صحيفة السوابق إلكترونياً.</p>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Request Form */}
        <div className="gov-card p-8 bg-white shadow-xl h-fit border-t-8 border-gov-primary lg:col-span-1">
          <h3 className="text-xl font-bold text-gov-secondary mb-6">طلب وثيقة جديدة</h3>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block text-xs font-bold text-gray-400 mb-2">الجهة الموجه إليها الوثيقة</label>
              <input
                type="text"
                placeholder="مثال: وزارة التربية، السفارة السورية، إلخ..."
                className="gov-input text-right"
                required
                value={purpose}
                onChange={(e) => setPurpose(e.target.value)}
              />
            </div>
            <button
              type="submit"
              disabled={submitting}
              className="w-full py-3 bg-gov-secondary text-gov-primary font-bold rounded-xl hover:brightness-125 transition-all shadow-lg text-sm disabled:opacity-50"
            >
              {submitting ? 'جاري الفحص العدلي...' : 'طلب وثيقة غير محكوم'}
            </button>
          </form>
        </div>

        {/* Status Message and Previous Requests */}
        <div className="lg:col-span-2 space-y-6">
          {msg && (
            <div className={`p-6 rounded-2xl border ${msg.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-700 border-red-200'} animate-fade-in`}>
              <p className="font-bold mb-2">{msg.text}</p>
              {msg.details && (
                <div className="mt-4 space-y-2">
                  <p className="text-xs font-semibold text-red-500">الذمم المالية والغرامات التي تحظر استخراج السند:</p>
                  {msg.details.map((tax) => (
                    <div key={tax.id} className="bg-white p-3 rounded-lg border border-red-100 flex justify-between items-center text-xs">
                      <span>{tax.description}</span>
                      <span className="font-bold font-mono english-nums text-red-600">{tax.amount.toLocaleString()} ل.س</span>
                    </div>
                  ))}
                  <p className="text-xs text-gray-400 mt-2 italic">يرجى تسديد هذه المستحقات عبر الحساب البنكي أو بوابة المالية لتتمكن من استخراج الوثيقة.</p>
                </div>
              )}
            </div>
          )}

          <div className="space-y-6">
            <h3 className="text-xl font-bold text-gov-secondary border-r-4 border-gov-primary pr-4">الطلبات السابقة</h3>
            <div className="space-y-4">
              {requests.map((req) => (
                <div key={req.id} className="gov-card p-6 flex flex-col md:flex-row justify-between items-center gap-6 bg-white hover:shadow-lg transition-shadow">
                  <div className="flex-grow">
                    <div className="flex items-center gap-3 mb-2">
                      <span className="bg-gov-bg px-3 py-1 rounded-full text-[10px] font-bold">موجهة إلى: {req.purpose}</span>
                      {req.status === 'APPROVED' ? (
                        <span className="bg-green-100 text-green-700 px-3 py-0.5 rounded text-[10px] font-bold">
                          جاهزة للتحميل
                        </span>
                      ) : (
                        <span className="bg-red-100 text-red-700 px-3 py-0.5 rounded text-[10px] font-bold">
                          مرفوضة
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-400">تاريخ التقديم: {new Date(req.createdAt).toLocaleDateString('ar-SY')}</p>
                    {req.rejectionReason && (
                      <p className="text-xs text-red-600 font-bold mt-2">سبب الرفض: {req.rejectionReason}</p>
                    )}
                  </div>
                  {req.status === 'APPROVED' && (
                    <button
                      onClick={() => handleDownload(req.id)}
                      disabled={downloadingId === req.id}
                      className="bg-gov-secondary text-gov-primary px-6 py-2 rounded-lg text-xs font-bold hover:brightness-125 transition-all shadow-md"
                    >
                      {downloadingId === req.id ? 'جاري التحميل...' : 'تحميل الوثيقة'}
                    </button>
                  )}
                </div>
              ))}

              {requests.length === 0 && (
                <div className="text-center py-10 gov-card bg-white text-gray-400 border-dashed">
                  لا توجد طلبات سابقة للسجل العدلي
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default CriminalDashboard;
