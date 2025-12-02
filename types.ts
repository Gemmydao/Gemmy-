export interface BusinessData {
  companyName: string;
  representativeName: string;
  position: string;
  email: string;
  phoneNumber: string;
  workerCount: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  PROCESSING = 'PROCESSING',
  REVIEW = 'REVIEW',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}

export interface GoogleFormMapping {
  companyName: string; // entry.xxxxxx
  representativeName: string;
  position: string;
  email: string;
  phoneNumber: string;
  workerCount: string;
}

export interface SheetConfig {
  method: 'GOOGLE_FORM' | 'WEBHOOK';
  formUrl: string; // The formResponse URL
  googleFormMapping: GoogleFormMapping;
  webhookUrl: string; // Legacy support or advanced users
  webhookMapping: BusinessData; // Using BusinessData keys as mapping values
}

export type LanguageMode = 'LATIN' | 'KOREAN';