import { GoogleGenAI, Type } from "@google/genai";
import { BusinessData, LanguageMode } from "../types";

// Initialize Gemini
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      // Remove the Data-URI prefix to get just the base64 string
      const base64 = result.split(',')[1];
      resolve(base64);
    };
    reader.onerror = (error) => reject(error);
  });
};

export const extractBusinessData = async (imageFile: File, language: LanguageMode): Promise<BusinessData> => {
  try {
    const base64Data = await fileToBase64(imageFile);

    let languageInstruction = "";
    
    if (language === 'KOREAN') {
      languageInstruction = `
        Tài liệu này là danh bạ doanh nghiệp song ngữ (Tiếng Hàn và Latin).
        CHẾ ĐỘ HIỆN TẠI: TIẾNG HÀN (KOREAN).

        Quy tắc trích xuất BẮT BUỘC:
        1. **Tên người phụ trách (Representative Name)** và **Chức vụ (Position)**:
           - CHỈ trích xuất phần văn bản tiếng Hàn (Hangul).
           - TUYỆT ĐỐI BỎ QUA phần chữ Latin đi kèm.
           - Ví dụ: Nếu thấy "Hong Gil Dong (홍길동)", chỉ lấy "홍길동".
           - Ví dụ: Nếu thấy "Giám đốc / 사장", chỉ lấy "사장".
        
        2. **Tên công ty**: 
           - QUAN TRỌNG: LUÔN LẤY TÊN TIẾNG LATIN (Tiếng Việt hoặc Tiếng Anh).
           - KHÔNG lấy tên tiếng Hàn (Hangul) cho trường Tên công ty, trừ khi hoàn toàn không có chữ Latin.
        
        Từ khóa nhận diện tiếng Hàn (để xác định vị trí thông tin):
        - Tên công ty: '상호', '회사명'.
        - Người đại diện: '대표', 'CEO'.
        - Chức vụ: '직위'.
        - Số điện thoại: '전화', 'Tel'.
        - Số lượng công nhân: '종업원 수'.
      `;
    } else {
      languageInstruction = `
        Tài liệu này là danh bạ doanh nghiệp song ngữ (Tiếng Hàn và Latin).
        CHẾ ĐỘ HIỆN TẠI: LATIN (TIẾNG VIỆT/TIẾNG ANH).

        Quy tắc trích xuất BẮT BUỘC:
        1. **Tên người phụ trách (Representative Name)** và **Chức vụ (Position)**:
           - CHỈ trích xuất phần văn bản ký tự Latin.
           - TUYỆT ĐỐI BỎ QUA phần chữ tiếng Hàn (Hangul) đi kèm.
           - Ví dụ: Nếu thấy "Hong Gil Dong (홍길동)", chỉ lấy "Hong Gil Dong".
           - Ví dụ: Nếu thấy "Giám đốc / 사장", chỉ lấy "Giám đốc".

        2. **Tên công ty**: Ưu tiên lấy tên tiếng Việt hoặc tiếng Anh.
      `;
    }

    const prompt = `
      Hãy phân tích hình ảnh trang danh bạ doanh nghiệp này. 
      ${languageInstruction}

      Trích xuất thông tin chính xác vào các trường sau:
      1. Tên công ty (Company Name) -> key: companyName
      2. Tên người phụ trách/đại diện (Representative Name) -> key: representativeName
      3. Chức vụ (Position) -> key: position
      4. Email -> key: email
      5. Số điện thoại (Phone Number) -> key: phoneNumber
      6. Số lượng công nhân (Worker Count/Employee Count) - Nếu là khoảng số thì giữ nguyên -> key: workerCount
      
      Nếu thông tin nào không tìm thấy, hãy để chuỗi rỗng "".
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: {
        parts: [
          {
            inlineData: {
              mimeType: imageFile.type,
              data: base64Data
            }
          },
          { text: prompt }
        ]
      },
      config: {
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            companyName: { type: Type.STRING },
            representativeName: { type: Type.STRING },
            position: { type: Type.STRING },
            email: { type: Type.STRING },
            phoneNumber: { type: Type.STRING },
            workerCount: { type: Type.STRING },
          },
          required: ["companyName", "representativeName", "email", "phoneNumber"],
        }
      }
    });

    const jsonText = response.text || "{}";
    return JSON.parse(jsonText) as BusinessData;

  } catch (error) {
    console.error("Gemini Extraction Error:", error);
    throw new Error("Không thể trích xuất dữ liệu từ ảnh. Vui lòng thử lại.");
  }
};