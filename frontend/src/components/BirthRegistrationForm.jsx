import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function BirthRegistrationForm() {
  const [childName, setChildName] = useState('');
  const [childGender, setChildGender] = useState('ذكر');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const token = useAuthStore((state) => state.token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('childName', childName);
    formData.append('childGender', childGender);
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

  return (
    <div className="gov-card p-8">
      <h3 className="text-xl font-bold text-gov-secondary mb-6 border-r-4 border-gov-primary pr-4">تسجيل واقعة ولادة جديدة</h3>
      
      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">اسم المولود</label>
            <input 
              type="text" 
              className="gov-input" 
              value={childName} 
              onChange={(e) => setChildName(e.target.value)} 
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">الجنس</label>
            <select 
              className="gov-input" 
              value={childGender} 
              onChange={(e) => setChildGender(e.target.value)}
            >
              <option value="ذكر">ذكر</option>
              <option value="أنثى">أنثى</option>
            </select>
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">وثيقة المستشفى (صورة أو PDF)</label>
          <input 
            type="file" 
            className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-gov-primary transition-colors cursor-pointer" 
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>

        <button 
          type="submit" 
          disabled={loading}
          className="gov-button-primary w-full"
        >
          {loading ? 'جاري الإرسال...' : 'إرسال الطلب للمراجعة'}
        </button>
      </form>
    </div>
  );
}

export default BirthRegistrationForm;
