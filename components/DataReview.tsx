import React from 'react';
import { BusinessData } from '../types';
import { Check, Edit2, AlertCircle } from 'lucide-react';

interface DataReviewProps {
  data: BusinessData;
  onChange: (data: BusinessData) => void;
  onConfirm: () => void;
  onCancel: () => void;
  isSending: boolean;
}

export const DataReview: React.FC<DataReviewProps> = ({ data, onChange, onConfirm, onCancel, isSending }) => {
  
  const handleChange = (field: keyof BusinessData, value: string) => {
    onChange({ ...data, [field]: value });
  };

  const InputField = ({ label, field, placeholder, type = "text" }: { label: string, field: keyof BusinessData, placeholder?: string, type?: string }) => (
    <div className="mb-4">
      <label className="block text-sm font-medium text-gray-700 mb-1">{label}</label>
      <div className="relative">
        <input
          type={type}
          value={data[field]}
          onChange={(e) => handleChange(field, e.target.value)}
          placeholder={placeholder}
          className="w-full border border-gray-300 rounded-lg p-3 pl-3 focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
        />
        <div className="absolute right-3 top-3 text-gray-400 pointer-events-none">
          <Edit2 size={16} />
        </div>
      </div>
    </div>
  );

  return (
    <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-lg overflow-hidden my-4">
      <div className="bg-indigo-600 p-4 text-white">
        <h2 className="text-xl font-bold flex items-center gap-2">
          <Check size={24} /> Xác nhận thông tin
        </h2>
        <p className="text-indigo-100 text-sm mt-1">Vui lòng kiểm tra và sửa lại nếu thông tin chưa chính xác.</p>
      </div>

      <div className="p-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-x-6">
          <div className="col-span-1 md:col-span-2">
             <InputField label="Tên công ty" field="companyName" placeholder="VD: Công ty TNHH ABC" />
          </div>
          
          <InputField label="Người phụ trách" field="representativeName" placeholder="Nguyễn Văn A" />
          <InputField label="Chức vụ" field="position" placeholder="Giám đốc" />
          
          <InputField label="Email" field="email" type="email" placeholder="contact@example.com" />
          <InputField label="Số điện thoại" field="phoneNumber" type="tel" placeholder="0901234567" />
          
          <InputField label="Số lượng công nhân" field="workerCount" placeholder="VD: 50-100" />
        </div>

        {!data.companyName && (
          <div className="mb-4 p-3 bg-yellow-50 border border-yellow-200 rounded-lg flex items-start gap-2 text-yellow-800 text-sm">
            <AlertCircle size={16} className="mt-0.5" />
            <span>Cảnh báo: Tên công ty đang trống. Vui lòng bổ sung.</span>
          </div>
        )}

        <div className="flex gap-3 mt-6 pt-4 border-t border-gray-100">
          <button
            onClick={onCancel}
            disabled={isSending}
            className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 font-medium hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            Hủy bỏ
          </button>
          <button
            onClick={onConfirm}
            disabled={isSending}
            className="flex-1 py-3 px-4 bg-indigo-600 text-white rounded-lg font-medium hover:bg-indigo-700 transition-colors shadow-sm disabled:opacity-70 flex items-center justify-center gap-2"
          >
            {isSending ? (
              <>
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full" />
                Đang gửi...
              </>
            ) : (
              <>Gửi dữ liệu</>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};