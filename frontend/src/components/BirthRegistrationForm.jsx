import { useState, useEffect } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function BirthRegistrationForm() {
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState('MALE');
  const [spouses, setSpouses] = useState([]);
  const [selectedSpouse, setSelectedSpouse] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [fetchingSpouses, setFetchingSpouses] = useState(true);
  const [message, setMessage] = useState(null);
  const token = useAuthStore((state) => state.token);

  useEffect(() => {
    const fetchSpouses = async () => {
      try {
        const response = await axios.get('http://localhost:5000/api/civil/spouses', {
          headers: { Authorization: `Bearer ${token}` }
        });
        setSpouses(response.data);
        if (response.data.length > 0) setSelectedSpouse(response.data[0].nationalId);
      } catch (error) {
        console.error(error);
      } finally {
        setFetchingSpouses(false);
      }
    };
    fetchSpouses();
  }, [token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!selectedSpouse) {
      alert('يجب اختيار الطرف الآخر (الزوج/الزوجة)');
      return;
    }
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('childName', childName);
    formData.append('childGender', childGender);
    formData.append('spouseNationalId', selectedSpouse);
    formData.append('hospitalDoc', file);

    try {
      const response = await axios.post('http://localhost:5000/api/civil/register-birth', formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage({ type: 'success', text: response.data.message });
      setChildName('');
      setFile(null);
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'حدث خطأ أثناء الإرسال' });
    } finally {
      setLoading(false);
    }
  };

  if (fetchingSpouses) return <div className="text-center py-10">جاري التحقق من سجلات الزواج...</div>;

  if (spouses.length === 0) {
    return (
      <div className="gov-card p-10 bg-red-50 border-r-8 border-red-500 animate-fade-in">
        <h3 className="text-xl font-bold text-red-700 mb-2">خدمة تسجيل الولادة مغلقة</h3>
        <p className="text-red-600 text-sm">عذراً، لا يمكنك تسجيل مولود جديد لعدم وجود عقد زواج مسجل باسمك في السجلات المدنية. يرجى تثبيت الزواج أولاً.</p>
      </div>
    );
  }

  return (
    <div className="gov-card p-8 shadow-2xl border-t-4 border-gov-primary animate-fade-in">
      <h3 className="text-2xl font-bold text-gov-secondary mb-6 border-r-4 border-gov-primary pr-4">تسجيل واقعة ولادة جديدة</h3>
      
      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase tracking-widest">اسم المولود المقترح</label>
            <input type="text" className="gov-input" value={childName} onChange={(e) => setChildName(e.target.value)} required />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase tracking-widest">الجنس</label>
            <select className="gov-input" value={childGender} onChange={(e) => setChildGender(e.target.value)}>
              <option value="MALE">ذكر</option>
              <option value="FEMALE">أنثى</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase tracking-widest">اختيار الطرف الآخر (الأم/الأب)</label>
          <select className="gov-input english-nums" value={selectedSpouse} onChange={(e) => setSelectedSpouse(e.target.value)} required>
            {spouses.map(s => (
              <option key={s.nationalId} value={s.nationalId}>{s.fullName} ({s.nationalId})</option>
            ))}
          </select>
          <p className="text-[10px] text-gray-400 mt-2">تظهر في هذه القائمة فقط الحالات الاجتماعية النشطة والمسجلة قانونياً.</p>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1 uppercase tracking-widest">وثيقة المشفى الرسمية</label>
          <input type="file" className="w-full p-4 border-2 border-dashed border-gray-200 rounded-2xl hover:border-gov-primary transition-colors cursor-pointer" onChange={(e) => setFile(e.target.files[0])} required />
        </div>

        <button type="submit" disabled={loading} className="gov-button-primary w-full shadow-gov-secondary/20">
          {loading ? 'جاري معالجة الطلب...' : 'إرسال طلب التسجيل للمديرية'}
        </button>
      </form>
    </div>
  );
}

export default BirthRegistrationForm;
