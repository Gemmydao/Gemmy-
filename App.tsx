import React, { useState, useRef } from 'react';
import { BusinessData, AppStatus, SheetConfig, LanguageMode, GoogleFormMapping } from './types';
import { extractBusinessData } from './services/geminiService';
import { Settings } from './components/Settings';
import { DataReview } from './components/DataReview';
import { Camera, Upload, Settings as SettingsIcon, FileSpreadsheet, Loader2, CheckCircle, RefreshCcw, Copy, Languages } from 'lucide-react';

const INITIAL_DATA: BusinessData = {
  companyName: '',
  representativeName: '',
  position: '',
  email: '',
  phoneNumber: '',
  workerCount: '',
};

const DEFAULT_FORM_MAPPING: GoogleFormMapping = {
  companyName: '',
  representativeName: '',
  position: '',
  email: '',
  phoneNumber: '',
  workerCount: '',
};

const DEFAULT_WEBHOOK_MAPPING: BusinessData = {
  companyName: 'companyName',
  representativeName: 'representativeName',
  position: 'position',
  email: 'email',
  phoneNumber: 'phoneNumber',
  workerCount: 'workerCount',
};

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [language, setLanguage] = useState<LanguageMode>('LATIN');
  const [extractedData, setExtractedData] = useState<BusinessData>(INITIAL_DATA);
  const [errorMsg, setErrorMsg] = useState<string>('');
  
  // Initialize config
  const [config, setConfig] = useState<SheetConfig>({ 
    method: 'GOOGLE_FORM',
    
    // New Configs
    formUrl: '',
    googleFormMapping: DEFAULT_FORM_MAPPING,
    webhookUrl: '',
    webhookMapping: DEFAULT_WEBHOOK_MAPPING
  });
  
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setStatus(AppStatus.PROCESSING);
    setErrorMsg('');

    try {
      const data = await extractBusinessData(file, language);
      setExtractedData(data);
      setStatus(AppStatus.REVIEW);
    } catch (err) {
      console.error(err);
      setErrorMsg("Không thể đọc được ảnh. Vui lòng thử lại với ảnh rõ nét hơn.");
      setStatus(AppStatus.ERROR);
    } finally {
      // Reset input so same file can be selected again if needed
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleSendData = async () => {
    const isGoogleForm = config.method === 'GOOGLE_FORM';
    const destinationUrl = isGoogleForm ? config.formUrl : config.webhookUrl;

    if (!destinationUrl) {
        alert("Vui lòng cấu hình nơi lưu dữ liệu trong phần Cài đặt.");
        setIsSettingsOpen(true);
        return;
    }

    try {
        setStatus(AppStatus.PROCESSING);
        
        if (isGoogleForm) {
          // --- GOOGLE FORM SUBMISSION ---
          const formData = new FormData();
          const mapping = config.googleFormMapping || DEFAULT_FORM_MAPPING;
          
          // Map data to entry.xxxxx IDs
          if (mapping.companyName) formData.append(mapping.companyName, extractedData.companyName);
          if (mapping.representativeName) formData.append(mapping.representativeName, extractedData.representativeName);
          if (mapping.position) formData.append(mapping.position, extractedData.position);
          if (mapping.email) formData.append(mapping.email, extractedData.email);
          if (mapping.phoneNumber) formData.append(mapping.phoneNumber, extractedData.phoneNumber);
          if (mapping.workerCount) formData.append(mapping.workerCount, extractedData.workerCount);

          // Google Forms requires no-cors for direct submission from browser
          await fetch(destinationUrl, {
            method: 'POST',
            mode: 'no-cors',
            body: formData
          });

        } else {
          // --- WEBHOOK JSON SUBMISSION ---
          const payload: Record<string, string> = {};
          const mapping = config.webhookMapping || DEFAULT_WEBHOOK_MAPPING;

          (Object.keys(extractedData) as Array<keyof BusinessData>).forEach((key) => {
            const destinationKey = mapping[key] || key;
            payload[destinationKey] = extractedData[key];
          });

          // Send as Text/Plain to ensure no-cors transmits the body correctly to Apps Script
          // Apps Script ignores content-type headers from no-cors requests anyway, 
          // but browser might block application/json
          await fetch(destinationUrl, { 
            method: 'POST', 
            mode: 'no-cors',
            headers: { 'Content-Type': 'text/plain;charset=utf-8' },
            body: JSON.stringify(payload) 
          });
        }

        console.log("Data sent to:", destinationUrl);
        setStatus(AppStatus.SUCCESS);
    } catch (e) {
        console.error("Sending Error:", e);
        setErrorMsg("Gửi dữ liệu thất bại. Vui lòng kiểm tra lại đường dẫn kết nối.");
        setStatus(AppStatus.ERROR);
    }
  };

  const resetApp = () => {
    setStatus(AppStatus.IDLE);
    setExtractedData(INITIAL_DATA);
    setErrorMsg('');
  };

  // Check if configured
  const isConfigured = config.method === 'GOOGLE_FORM' ? !!config.formUrl : !!config.webhookUrl;

  return (
    <div className="min-h-screen flex flex-col font-sans text-gray-800">
      {/* Header */}
      <header className="bg-white shadow-sm sticky top-0 z-10">
        <div className="max-w-3xl mx-auto px-4 py-3 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <div className="bg-blue-600 p-2 rounded-lg text-white">
               <FileSpreadsheet size={24} />
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">ScanBizData</h1>
          </div>
          <button 
            onClick={() => setIsSettingsOpen(true)}
            className="p-2 text-gray-500 hover:bg-gray-100 rounded-full transition-colors relative"
            title="Cài đặt kết nối"
          >
            <SettingsIcon size={24} />
            {!isConfigured && (
              <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>
            )}
          </button>
        </div>
      </header>

      {/* Main Content */}
      <main className="flex-1 max-w-3xl w-full mx-auto p-4 flex flex-col items-center">
        
        {/* State: IDLE */}
        {status === AppStatus.IDLE && (
          <div className="flex-1 flex flex-col justify-center items-center w-full space-y-8 py-6">
            <div className="text-center space-y-2">
              <h2 className="text-2xl font-bold text-gray-900">Chụp ảnh danh bạ</h2>
              <p className="text-gray-500 max-w-sm mx-auto">
                Trích xuất thông tin doanh nghiệp và tự động gửi vào Google Form/Sheets.
              </p>
            </div>

            {/* Language Toggle */}
            <div className="bg-gray-100 p-1.5 rounded-xl flex items-center w-full max-w-xs relative">
              <button
                onClick={() => setLanguage('LATIN')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  language === 'LATIN' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>ABC</span> Chữ Latin
              </button>
              <button
                onClick={() => setLanguage('KOREAN')}
                className={`flex-1 flex items-center justify-center gap-2 py-2 rounded-lg text-sm font-medium transition-all duration-200 ${
                  language === 'KOREAN' 
                    ? 'bg-white text-blue-600 shadow-sm' 
                    : 'text-gray-500 hover:text-gray-700'
                }`}
              >
                <span>가나다</span> Chữ Hàn
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 w-full max-w-md">
              {/* Camera Button */}
              <label className="cursor-pointer group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-blue-300 bg-blue-50 rounded-2xl hover:bg-blue-100 hover:border-blue-400 transition-all duration-200">
                <div className="bg-blue-600 text-white p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform mb-4">
                  <Camera size={32} />
                </div>
                <span className="font-semibold text-blue-900">Chụp ảnh mới</span>
                <span className="text-xs text-blue-600 mt-1">Sử dụng Camera</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  capture="environment"
                  className="hidden" 
                  onChange={handleFileChange}
                  ref={fileInputRef}
                />
              </label>

              {/* Upload Button */}
              <label className="cursor-pointer group relative flex flex-col items-center justify-center p-8 border-2 border-dashed border-gray-300 bg-white rounded-2xl hover:bg-gray-50 hover:border-gray-400 transition-all duration-200">
                 <div className="bg-gray-700 text-white p-4 rounded-full shadow-lg group-hover:scale-110 transition-transform mb-4">
                  <Upload size={32} />
                </div>
                <span className="font-semibold text-gray-900">Tải ảnh lên</span>
                <span className="text-xs text-gray-500 mt-1">Từ thư viện ảnh</span>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="hidden" 
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            {!isConfigured && (
              <div 
                onClick={() => setIsSettingsOpen(true)}
                className="cursor-pointer hover:bg-orange-100 transition-colors text-sm text-orange-600 bg-orange-50 px-4 py-3 rounded-lg border border-orange-200 flex items-center gap-2 max-w-md w-full"
              >
                 <SettingsIcon size={16} />
                 <span>Chưa kết nối dữ liệu. Nhấn để cài đặt Google Form.</span>
              </div>
            )}
          </div>
        )}

        {/* State: PROCESSING */}
        {status === AppStatus.PROCESSING && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 animate-fade-in">
            <div className="relative">
              <div className="absolute inset-0 bg-blue-100 rounded-full animate-ping opacity-75"></div>
              <div className="relative bg-white p-6 rounded-full shadow-xl">
                 <Loader2 size={48} className="text-blue-600 animate-spin" />
              </div>
            </div>
            <div>
              <h3 className="text-xl font-semibold text-gray-900">Đang xử lý...</h3>
              <p className="text-gray-500 mt-2">
                Đang trích xuất thông tin và chuẩn bị gửi đi.
              </p>
            </div>
          </div>
        )}

        {/* State: REVIEW */}
        {status === AppStatus.REVIEW && (
          <DataReview 
            data={extractedData} 
            onChange={setExtractedData}
            onConfirm={handleSendData}
            onCancel={resetApp}
            isSending={false}
          />
        )}

        {/* State: SUCCESS */}
        {status === AppStatus.SUCCESS && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6 w-full max-w-md py-10">
            <div className="bg-green-100 p-6 rounded-full text-green-600 mb-2">
              <CheckCircle size={64} />
            </div>
            <h2 className="text-2xl font-bold text-gray-900">Thành công!</h2>
            <p className="text-gray-600">
              Dữ liệu đã được gửi vào {config.method === 'GOOGLE_FORM' ? 'Google Form' : 'hệ thống'}.
            </p>
            
            <div className="w-full bg-gray-50 rounded-lg p-4 text-left text-sm font-mono border border-gray-200 overflow-x-auto relative">
               <div className="absolute top-2 right-2 text-xs text-gray-400">JSON Payload</div>
               <pre>{JSON.stringify(extractedData, null, 2)}</pre>
            </div>

            <div className="flex flex-col w-full gap-3">
              <button 
                onClick={resetApp}
                className="w-full py-3 px-4 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 transition-colors shadow-lg shadow-blue-200 flex items-center justify-center gap-2"
              >
                <RefreshCcw size={18} /> Quét trang tiếp theo
              </button>
            </div>
          </div>
        )}

        {/* State: ERROR */}
        {status === AppStatus.ERROR && (
          <div className="flex-1 flex flex-col justify-center items-center text-center space-y-6">
             <div className="bg-red-100 p-6 rounded-full text-red-600">
              <SettingsIcon size={48} className="rotate-45" /> 
            </div>
            <h3 className="text-xl font-semibold text-gray-900">Đã xảy ra lỗi</h3>
            <p className="text-red-600 max-w-xs">{errorMsg}</p>
            <button 
              onClick={resetApp}
              className="py-2 px-6 bg-gray-900 text-white rounded-lg font-medium hover:bg-gray-800 transition-colors"
            >
              Thử lại
            </button>
          </div>
        )}
      </main>

      <Settings 
        isOpen={isSettingsOpen} 
        onClose={() => setIsSettingsOpen(false)} 
        config={config} 
        onSave={setConfig} 
      />

      <footer className="p-4 text-center text-xs text-gray-400">
        Powered by Google Gemini 2.5 Flash
      </footer>
    </div>
  );
};

export default App;