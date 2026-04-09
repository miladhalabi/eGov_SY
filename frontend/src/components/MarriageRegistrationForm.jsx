import { useState } from 'react';
import axios from 'axios';
import { useAuthStore } from '../store/authStore';

function MarriageRegistrationForm() {
  const [partnerId, setPartnerId] = useState('');
  const [contractNum, setContractNum] = useState('');
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);
  const token = useAuthStore((state) => state.token);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    const formData = new FormData();
    formData.append('partnerNationalId', partnerId);
    formData.append('contractNumber', contractNum);
    formData.append('document', file);

    try {
      const response = await axios.post('http://localhost:5000/api/civil/register-marriage', formData, {
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'multipart/form-data'
        }
      });
      setMessage({ type: 'success', text: response.data.message });
      setPartnerId('');
      setContractNum('');
    } catch (error) {
      setMessage({ type: 'error', text: error.response?.data?.error || 'حدث خطأ أثناء الإرسال' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="gov-card p-8">
      <h3 className="text-xl font-bold text-gov-secondary mb-6 border-r-4 border-gov-primary pr-4">تسجيل واقعة زواج</h3>
      
      {message && (
        <div className={`p-4 rounded-xl mb-6 text-sm ${message.type === 'success' ? 'bg-green-50 text-green-700 border border-green-100' : 'bg-red-50 text-red-700 border border-red-100'}`}>
          {message.text}
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">الرقم الوطني للطرف الآخر</label>
            <input 
              type="text" 
              className="gov-input english-nums" 
              value={partnerId} 
              onChange={(e) => setPartnerId(e.target.value)} 
              placeholder="مثال: 2222222222"
              required 
            />
          </div>
          <div>
            <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">رقم عقد الزواج</label>
            <input 
              type="text" 
              className="gov-input english-nums" 
              value={contractNum} 
              onChange={(e) => setContractNum(e.target.value)} 
              required 
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-bold text-gray-400 mb-2 mr-1">صورة عن عقد الزواج</label>
          <input 
            type="file" 
            className="w-full p-3 border-2 border-dashed border-gray-200 rounded-xl hover:border-gov-primary transition-colors cursor-pointer" 
            onChange={(e) => setFile(e.target.files[0])}
            required
          />
        </div>

        <button type="submit" disabled={loading} className="gov-button-primary w-full">
          {loading ? 'جاري الإرسال...' : 'تقديم طلب تثبيت الزواج'}
        </button>
      </form>
    </div>
  );
}

export default MarriageRegistrationForm;
