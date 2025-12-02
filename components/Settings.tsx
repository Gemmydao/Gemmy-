import React, { useState, useEffect } from 'react';
import { SheetConfig, GoogleFormMapping, BusinessData } from '../types';
import { Settings as SettingsIcon, Save, X, Link, ArrowRight, HelpCircle, CheckCircle, AlertCircle, Code, Copy, Check, ExternalLink } from 'lucide-react';

interface SettingsProps {
  config: SheetConfig;
  onSave: (config: SheetConfig) => void;
  isOpen: boolean;
  onClose: () => void;
}

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

const APPS_SCRIPT_CODE = `function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  
  // Parse dữ liệu JSON gửi từ App
  // Lưu ý: App gửi dạng text/plain để tránh lỗi CORS
  var data = JSON.parse(e.postData.contents);
  
  // Lấy thời gian hiện tại
  var timestamp = new Date();
  
  // Ghi vào dòng cuối cùng
  // Đảm bảo thứ tự cột trong Sheet khớp với thứ tự này
  sheet.appendRow([
    timestamp,
    data.companyName,
    data.representativeName,
    data.position,
    data.email,
    data.phoneNumber,
    data.workerCount
  ]);
  
  return ContentService.createTextOutput("Success")
    .setMimeType(ContentService.MimeType.TEXT);
}`;

export const Settings: React.FC<SettingsProps> = ({ config, onSave, isOpen, onClose }) => {
  const [method, setMethod] = useState<'GOOGLE_FORM' | 'WEBHOOK'>(config.method || 'GOOGLE_FORM');
  const [prefilledLink, setPrefilledLink] = useState('');
  const [formMapping, setFormMapping] = useState<GoogleFormMapping>(config.googleFormMapping || DEFAULT_FORM_MAPPING);
  const [formUrl, setFormUrl] = useState(config.formUrl || '');
  
  // Webhook states (Legacy/Advanced)
  const [webhookUrl, setWebhookUrl] = useState(config.webhookUrl || '');
  const [webhookMapping, setWebhookMapping] = useState<BusinessData>(config.webhookMapping || DEFAULT_WEBHOOK_MAPPING);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setMethod(config.method || 'GOOGLE_FORM');
      setFormMapping(config.googleFormMapping || DEFAULT_FORM_MAPPING);
      setFormUrl(config.formUrl || '');
      setWebhookUrl(config.webhookUrl || '');
      setWebhookMapping(config.webhookMapping || DEFAULT_WEBHOOK_MAPPING);
    }
  }, [isOpen, config]);

  const handleCopyCode = () => {
    navigator.clipboard.writeText(APPS_SCRIPT_CODE);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (!isOpen) return null;

  const handleParseLink = () => {
    if (!prefilledLink) return;

    if (prefilledLink.includes('spreadsheets')) {
        alert("Lỗi: Bạn đang nhập Link file Google Sheet.\n\nVui lòng nhập 'Đường liên kết được điền trước' từ Google Form.");
        return;
    }

    try {
      // Convert viewform to formResponse if needed, but mainly we want params
      const urlObj = new URL(prefilledLink);
      const params = new URLSearchParams(urlObj.search);
      
      const newMapping = { ...DEFAULT_FORM_MAPPING };
      const entries: { id: string, value: string }[] = [];

      params.forEach((value, key) => {
        if (key.startsWith('entry.')) {
          entries.push({ id: key, value });
        }
      });

      // Simple heuristic matching based on the dummy data user typed
      entries.forEach(entry => {
        const val = entry.value.toLowerCase();
        if (val.includes('ty') || val.includes('company')) newMapping.companyName = entry.id;
        else if (val.includes('tên') || val.includes('name') || val.includes('đại diện')) newMapping.representativeName = entry.id;
        else if (val.includes('vụ') || val.includes('position') || val.includes('pos')) newMapping.position = entry.id;
        else if (val.includes('@') || val.includes('mail')) newMapping.email = entry.id;
        else if (val.includes('số') || val.includes('phone') || val.includes('tel')) newMapping.phoneNumber = entry.id;
        else if (val.includes('lượng') || val.includes('công nhân') || val.includes('worker')) newMapping.workerCount = entry.id;
      });

      setFormMapping(newMapping);
      
      // Construct action URL
      let actionUrl = prefilledLink.split('?')[0];
      if (actionUrl.endsWith('viewform')) {
        actionUrl = actionUrl.replace('viewform', 'formResponse');
      } else if (actionUrl.endsWith('prefill')) {
          actionUrl = actionUrl.replace('prefill', 'formResponse');
      }
      setFormUrl(actionUrl);

      alert("Đã phân tích link thành công! Vui lòng kiểm tra bảng khớp nối bên dưới.");

    } catch (e) {
      alert("Link không hợp lệ. Vui lòng copy đúng link 'Lấy đường liên kết điền trước'.");
    }
  };

  const handleSave = () => {
    // Validation Logic
    if (method === 'WEBHOOK') {
        if (!webhookUrl) {
            alert("Vui lòng nhập Webhook URL");
            return;
        }
        if (webhookUrl.includes('docs.google.com/spreadsheets')) {
            alert("SAI ĐƯỜNG DẪN!\n\nBạn đang nhập đường dẫn File Google Sheet.\nBạn cần nhập 'URL Ứng dụng Web' từ Apps Script (có dạng https://script.google.com/macros/s/...). \n\nVui lòng xem lại Bước 5 trong hướng dẫn.");
            return;
        }
        if (!webhookUrl.includes('script.google.com')) {
             // Soft warning
             if(!confirm("Đường dẫn này có vẻ không phải là Google Apps Script Web App. Bạn có chắc chắn muốn lưu không?")) {
                 return;
             }
        }
    } else {
        if (!formUrl) {
             alert("Vui lòng nhập và phân tích Link Google Form");
             return;
        }
    }

    onSave({
      method,
      formUrl,
      googleFormMapping: formMapping,
      webhookUrl,
      webhookMapping
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-blue-600 p-4 flex justify-between items-center text-white shrink-0">
          <h2 className="text-lg font-semibold flex items-center gap-2">
            <SettingsIcon size={20} /> Cấu hình nơi lưu dữ liệu
          </h2>
          <button onClick={onClose} className="hover:bg-blue-700 p-1 rounded transition-colors">
            <X size={20} />
          </button>
        </div>

        {/* Method Toggle */}
        <div className="flex border-b border-gray-200 shrink-0 bg-gray-50">
          <button
            onClick={() => setMethod('GOOGLE_FORM')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              method === 'GOOGLE_FORM'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <img src="https://www.gstatic.com/images/branding/product/1x/forms_48dp.png" className="w-5 h-5" alt="Forms" />
            Google Forms
          </button>
          <button
            onClick={() => setMethod('WEBHOOK')}
            className={`flex-1 py-3 px-4 text-sm font-medium border-b-2 transition-colors flex items-center justify-center gap-2 ${
              method === 'WEBHOOK'
                ? 'border-blue-600 text-blue-600 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-700'
            }`}
          >
            <Link size={16} /> Webhook / Nâng cao
          </button>
        </div>
        
        {/* Content */}
        <div className="p-6 overflow-y-auto">
          {method === 'GOOGLE_FORM' ? (
            <div className="space-y-6">
              
              {/* Instructions */}
              <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 text-sm text-blue-800 space-y-2">
                <h3 className="font-bold flex items-center gap-2"><HelpCircle size={16}/> Cách lấy Link kết nối:</h3>
                <ol className="list-decimal pl-5 space-y-1">
                  <li>Tạo Google Form với các câu hỏi: Tên công ty, Người đại diện, Email, v.v.</li>
                  <li>Bấm vào dấu <strong>3 chấm</strong> (góc phải trên) &rarr; Chọn <strong>"Lấy đường liên kết được điền trước" (Get pre-filled link)</strong>.</li>
                  <li>Điền tên trường vào câu trả lời (VD: Câu hỏi Tên công ty thì điền "congty", Email điền "email").</li>
                  <li>Bấm nút <strong>"Lấy đường liên kết" (Get Link)</strong> &rarr; <strong>"Sao chép đường liên kết"</strong>.</li>
                  <li>Dán link đó vào ô bên dưới và bấm <strong>"Phân tích"</strong>.</li>
                </ol>
              </div>

              {/* Parser Input */}
              <div className="flex gap-2">
                <input 
                  type="text" 
                  value={prefilledLink}
                  onChange={(e) => setPrefilledLink(e.target.value)}
                  placeholder="Dán link điền trước vào đây (https://docs.google.com/forms/...)"
                  className="flex-1 border border-gray-300 rounded-lg p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                />
                <button 
                  onClick={handleParseLink}
                  className="bg-blue-600 text-white px-4 py-2 rounded-lg text-sm font-medium hover:bg-blue-700 whitespace-nowrap"
                >
                  Phân tích
                </button>
              </div>

              {/* Mapping Table */}
              {formUrl && (
                <div className="border border-gray-200 rounded-lg overflow-hidden animate-fade-in">
                  <div className="bg-gray-100 px-4 py-2 border-b border-gray-200 font-medium text-sm flex justify-between items-center">
                    <span>Khớp nối dữ liệu</span>
                    <span className="text-green-600 flex items-center gap-1 text-xs"><CheckCircle size={14}/> Đã tìm thấy Link gửi</span>
                  </div>
                  <div className="p-4 space-y-3 bg-white">
                    <FormMappingRow 
                      label="Tên Công Ty" 
                      fieldKey="companyName" 
                      entryId={formMapping.companyName} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                    <FormMappingRow 
                      label="Người Đại Diện" 
                      fieldKey="representativeName" 
                      entryId={formMapping.representativeName} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                    <FormMappingRow 
                      label="Chức Vụ" 
                      fieldKey="position" 
                      entryId={formMapping.position} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                    <FormMappingRow 
                      label="Email" 
                      fieldKey="email" 
                      entryId={formMapping.email} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                    <FormMappingRow 
                      label="SĐT" 
                      fieldKey="phoneNumber" 
                      entryId={formMapping.phoneNumber} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                    <FormMappingRow 
                      label="Số công nhân" 
                      fieldKey="workerCount" 
                      entryId={formMapping.workerCount} 
                      onChange={(k, v) => setFormMapping({...formMapping, [k]: v})}
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            // WEBHOOK MODE
            <div className="space-y-6">
              
              {/* Tutorial */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-200 text-sm space-y-3">
                <h3 className="font-bold flex items-center gap-2 text-gray-800">
                  <Code size={16}/> Hướng dẫn tạo Webhook Google Apps Script (Miễn phí):
                </h3>
                <ol className="list-decimal pl-5 space-y-2 text-gray-700 leading-relaxed">
                  <li>Mở Google Sheet muốn lưu dữ liệu -> <strong>Tiện ích mở rộng</strong> -> <strong>Apps Script</strong>.</li>
                  <li>Xóa hết mã cũ, sao chép đoạn mã bên dưới và dán vào.</li>
                  <li>
                    Bấm <strong>Triển khai</strong> (Deploy) -> <strong>Tùy chọn triển khai mới</strong> (New deployment).
                  </li>
                  <li>
                    Chọn loại: <strong>Ứng dụng Web</strong> (Web app).
                    <ul className="list-disc pl-5 mt-1 text-xs text-gray-600 bg-yellow-50 p-2 rounded border border-yellow-200">
                      <li>Mô tả: <em>Webhook Data</em></li>
                      <li>Người thực thi (Execute as): <strong>Tôi (Me)</strong></li>
                      <li>Ai có quyền truy cập (Who has access): <strong>Bất kỳ ai (Anyone)</strong> <span className="text-red-500 font-bold">← RẤT QUAN TRỌNG</span></li>
                    </ul>
                  </li>
                  <li>Bấm <strong>Triển khai</strong> -> Cấp quyền -> Copy <strong>URL Ứng dụng Web</strong>.</li>
                </ol>

                <div className="relative group">
                  <div className="bg-gray-900 rounded-lg p-3 font-mono text-xs text-green-400 overflow-x-auto border border-gray-700 shadow-inner">
                    <pre>{APPS_SCRIPT_CODE}</pre>
                  </div>
                  <button 
                    onClick={handleCopyCode}
                    className="absolute top-2 right-2 bg-white/10 hover:bg-white/20 text-white p-1.5 rounded transition-colors backdrop-blur-sm"
                    title="Sao chép mã"
                  >
                    {copied ? <Check size={14} className="text-green-400"/> : <Copy size={14}/>}
                  </button>
                </div>
              </div>

               <div>
                <label className="block text-sm font-medium text-gray-700 mb-1 flex items-center gap-2">
                    Webhook URL (URL Ứng dụng Web)
                    <ExternalLink size={14} className="text-gray-400"/>
                </label>
                <div className="relative">
                    <input
                    type="url"
                    className={`w-full border rounded-lg p-3 text-sm font-mono focus:ring-2 focus:outline-none ${webhookUrl && webhookUrl.includes('spreadsheets') ? 'border-red-500 focus:ring-red-500 bg-red-50' : 'border-gray-300 focus:ring-blue-500'}`}
                    placeholder="https://script.google.com/macros/s/..."
                    value={webhookUrl}
                    onChange={(e) => setWebhookUrl(e.target.value)}
                    />
                    {webhookUrl && webhookUrl.includes('spreadsheets') && (
                        <div className="absolute right-3 top-3 text-red-500 animate-pulse" title="Sai đường dẫn">
                            <AlertCircle size={20} />
                        </div>
                    )}
                </div>
                {webhookUrl && webhookUrl.includes('spreadsheets') && (
                    <p className="text-xs text-red-600 mt-1 font-medium">
                        Bạn đang nhập Link File Sheet. Vui lòng nhập Link Web App (bắt đầu bằng script.google.com).
                    </p>
                )}
              </div>

               <div className="border-t border-gray-100 pt-4">
                <h4 className="text-sm font-medium mb-3">Tên biến (Key Mapping)</h4>
                <p className="text-xs text-gray-500 mb-2">Tên key trong JSON gửi đi (để khớp với code ở trên):</p>
                {(Object.keys(webhookMapping) as Array<keyof BusinessData>).map((key) => (
                  <div key={key} className="flex items-center gap-2 mb-2">
                     <span className="text-xs text-gray-500 w-1/3 font-mono">{key}</span>
                     <ArrowRight size={14} className="text-gray-300"/>
                     <input 
                      type="text" 
                      value={webhookMapping[key]} 
                      onChange={(e) => setWebhookMapping({...webhookMapping, [key]: e.target.value})}
                      className="flex-1 border border-gray-300 rounded px-2 py-1 text-sm font-mono"
                    />
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 bg-gray-50 shrink-0">
          <button
            onClick={handleSave}
            disabled={method === 'GOOGLE_FORM' ? !formUrl : !webhookUrl}
            className="w-full bg-blue-600 text-white py-3 rounded-lg font-medium hover:bg-blue-700 flex items-center justify-center gap-2 shadow-sm disabled:bg-gray-400 disabled:cursor-not-allowed transition-colors"
          >
            <Save size={18} /> Lưu Cấu Hình
          </button>
        </div>
      </div>
    </div>
  );
};

const FormMappingRow = ({ 
  label, 
  fieldKey, 
  entryId, 
  onChange 
}: { 
  label: string; 
  fieldKey: keyof GoogleFormMapping; 
  entryId: string; 
  onChange: (k: keyof GoogleFormMapping, v: string) => void;
}) => {
  return (
    <div className="flex items-center gap-2">
      <div className="w-1/3 text-sm text-gray-700 font-medium">{label}</div>
      <div className="text-gray-400">
        <ArrowRight size={16} />
      </div>
      <div className="flex-1">
        <input
          type="text"
          value={entryId}
          onChange={(e) => onChange(fieldKey, e.target.value)}
          className={`w-full border rounded px-3 py-2 text-sm font-mono ${entryId ? 'border-green-300 bg-green-50 text-green-800' : 'border-gray-300 text-gray-400'}`}
          placeholder="entry.xxxxxx"
        />
      </div>
    </div>
  );
};