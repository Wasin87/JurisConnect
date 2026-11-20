import type {
  CasePriority,
  CaseStatus,
  IntakeChannel,
  LanguageCode,
  LegalCategory,
  MediationOutcome,
  UserRole,
} from './types';

export const BANGLADESH_DISTRICTS = [
  'Dhaka',
  'Chattogram',
  'Rajshahi',
  'Sylhet',
  'Khulna',
  'Barishal',
  'Rangpur',
  'Mymensingh',
  'Gazipur',
  'Narayanganj',
  'Cumilla',
  'Bogura',
  'Coxs Bazar',
  'Jessore',
  'Dinajpur',
  'Tangail',
  'Noakhali',
  'Faridpur',
];

export const DISTRICT_UPAZILAS: Record<string, string[]> = {
  Dhaka: ['Dhanmondi', 'Mirpur', 'Savar', 'Keraniganj', 'Dhamrai', 'Uttara'],
  Chattogram: ['Kotwali', 'Pahartali', 'Sitakunda', 'Hathazari', 'Patiya'],
  Rajshahi: ['Boalia', 'Paba', 'Godagari', 'Bagha', 'Charghat'],
  Sylhet: ['Sylhet Sadar', 'Beanibazar', 'Golapganj', 'Companiganj'],
  Khulna: ['Khulna Sadar', 'Dumuria', 'Batiaghata', 'Paikgachha'],
  Barishal: ['Barishal Sadar', 'Bakerganj', 'Banaripara', 'Mehendiganj'],
  Rangpur: ['Rangpur Sadar', 'Mithapukur', 'Pirganj', 'Badarganj'],
  Mymensingh: ['Mymensingh Sadar', 'Trishal', 'Bhaluka', 'Muktagachha'],
  Gazipur: ['Gazipur Sadar', 'Tongi', 'Kaliakair', 'Sreepur'],
  Narayanganj: ['Narayanganj Sadar', 'Fatullah', 'Rupganj', 'Sonargaon'],
  Cumilla: ['Cumilla Sadar', 'Laksam', 'Daudkandi', 'Chandina'],
  Bogura: ['Bogura Sadar', 'Sherpur', 'Shibganj', 'Shajahanpur'],
  'Coxs Bazar': ['Coxs Bazar Sadar', 'Teknaf', 'Ukhiya', 'Chakaria'],
  Jessore: ['Jessore Sadar', 'Benapole', 'Jhikargachha', 'Abhaynagar'],
  Dinajpur: ['Dinajpur Sadar', 'Birganj', 'Parbatipur', 'Phulbari'],
  Tangail: ['Tangail Sadar', 'Mirzapur', 'Madhupur', 'Gopalpur'],
  Noakhali: ['Noakhali Sadar', 'Begumganj', 'Companiganj', 'Hatiya'],
  Faridpur: ['Faridpur Sadar', 'Bhanga', 'Boalmari', 'Madhukhali'],
};

export interface PanelLawyerOption {
  uid: string;
  name: string;
  district: string;
  barId: string;
  specialty: string;
}

export const PANEL_LAWYERS: PanelLawyerOption[] = [
  { uid: 'lawyer_farhana_dhaka', name: 'Adv. Farhana Yasmin', district: 'Dhaka', barId: 'DBA-4821', specialty: 'Family & Women Rights' },
  { uid: 'lawyer_mahmud_dhaka', name: 'Adv. Mahmudul Hasan', district: 'Dhaka', barId: 'DBA-3910', specialty: 'Land & Civil Litigation' },
  { uid: 'lawyer_tasnim_ctg', name: 'Adv. Tasnim Chowdhury', district: 'Chattogram', barId: 'CBA-2194', specialty: 'Labor & Wages' },
  { uid: 'lawyer_kamrul_raj', name: 'Adv. Kamrul Islam', district: 'Rajshahi', barId: 'RBA-1845', specialty: 'Criminal Defense & Bail' },
  { uid: 'lawyer_nusrat_syl', name: 'Adv. Nusrat Jahan', district: 'Sylhet', barId: 'SBA-3302', specialty: 'Domestic Violence & Protection' },
];

export const MEDIATORS_ROSTER = [
  { uid: 'med_shafiq_dhaka', name: 'Justice (Retd.) Shafiqur Rahman', district: 'Dhaka' },
  { uid: 'med_rubina_ctg', name: 'Adv. Rubina Sultana (ADR)', district: 'Chattogram' },
  { uid: 'med_anwar_syl', name: 'DLAO Panel Mediator Anwarul Haque', district: 'Sylhet' },
  { uid: 'med_sabina_khl', name: 'ADR Specialist Sabina Akter', district: 'Khulna' },
];

export const STANDARD_DOCUMENTS = [
  'National ID (NID) / Birth Certificate',
  'Union Parishad / Ward Income Certificate',
  'DLAO Eligibility Declaration Form',
  'Plaint / General Diary (GD) / FIR Copy',
  'Witness or Marriage / Kabinnama Copy',
  'Land Khatian / Deed / Rent Agreement',
];

export const CATEGORY_LABELS: Record<LegalCategory, { en: string; bn: string }> = {
  family_maintenance: { en: 'Family & Maintenance', bn: 'পারিবারিক ও ভরণপোষণ' },
  land_property: { en: 'Land & Property Dispute', bn: 'জমি ও সম্পত্তি বিরোধ' },
  domestic_violence: { en: 'Domestic Violence & Protection', bn: 'পারিবারিক সহিংসতা ও সুরক্ষা' },
  labor_wages: { en: 'Labor & Unpaid Wages', bn: 'শ্রম ও বকেয়া মজুরি' },
  civil_dispute: { en: 'Civil & Tenancy Dispute', bn: 'দেওয়ানি ও ভাড়াটিয়া বিরোধ' },
  criminal_defense: { en: 'Criminal Defense & Bail', bn: 'ফৌজদারি প্রতিরক্ষা ও জামিন' },
};

export const STATUS_LABELS: Record<CaseStatus, { en: string; bn: string }> = {
  submitted: { en: 'Submitted', bn: 'দাখিলকৃত' },
  dlao_review: { en: 'DLAO Review', bn: 'ডিএলএও যাচাই' },
  approved: { en: 'Approved for Aid', bn: 'অনুমোদিত' },
  lawyer_assigned: { en: 'Lawyer Assigned', bn: 'আইনজীবী নিয়োগকৃত' },
  in_mediation: { en: 'In Digital Mediation', bn: 'মধ্যস্থতা চলমান' },
  court_proceeding: { en: 'Court Proceeding', bn: 'আদালতে বিচারাধীন' },
  settled: { en: 'Settled Amicably', bn: 'আপস-মীমাংসিত' },
  closed: { en: 'Closed', bn: 'নিষ্পত্তিকৃত' },
  rejected: { en: 'Ineligible / Returned', bn: 'প্রত্যাখ্যাত / ফেরত' },
};

export const PRIORITY_LABELS: Record<CasePriority, { en: string; bn: string }> = {
  critical: { en: 'Critical Emergency', bn: 'জরুরি সংকট' },
  high: { en: 'High Priority', bn: 'উচ্চ অগ্রাধিকার' },
  medium: { en: 'Medium Priority', bn: 'মাঝারি অগ্রাধিকার' },
  standard: { en: 'Standard Queue', bn: 'সাধারণ ক্রম' },
};

export const CHANNEL_LABELS: Record<IntakeChannel, { en: string; bn: string }> = {
  web: { en: 'Online Web Portal', bn: 'অনলাইন ওয়েব পোর্টাল' },
  helpline_16699: { en: 'National Helpline 16699', bn: 'জাতীয় হেল্পলাইন ১৬৬৯৯' },
  ussd_16699: { en: 'USSD *16699#', bn: 'ইউএসএসডি *১৬৬৯৯#' },
  udc_assisted: { en: 'UDC Assisted Intake', bn: 'ইউডিসি সহায়ক আবেদন' },
  dlao_referral: { en: 'DLAO Office Referral', bn: 'ডিএলএও রেফারেল' },
};

export const MEDIATION_OUTCOME_LABELS: Record<MediationOutcome, { en: string; bn: string }> = {
  scheduled: { en: 'Scheduled', bn: 'নির্ধারিত' },
  settled_amicably: { en: 'Settled Amicably', bn: 'সফল মীমাংসা' },
  partial_settlement: { en: 'Partial Settlement', bn: 'আংশিক মীমাংসা' },
  adjourned: { en: 'Adjourned', bn: 'মুলতবি' },
  referred_to_court: { en: 'Referred to Court', bn: 'আদালতে প্রেরিত' },
};

export const ROLE_LABELS: Record<UserRole, { en: string; bn: string }> = {
  citizen: { en: 'Citizen Applicant', bn: 'নাগরিক আবেদনকারী' },
  dlao_officer: { en: 'District Legal Aid Officer', bn: 'জেলা লিগ্যাল এইড অফিসার' },
  panel_lawyer: { en: 'Panel Advocate', bn: 'প্যানেল আইনজীবী' },
  mediator: { en: 'ADR Mediator', bn: 'মধ্যস্থতাকারী' },
  supervisor: { en: 'District Chairman / NLASO', bn: 'জেলা চেয়ারম্যান / এনএলএএসও' },
  admin: { en: 'System Administrator', bn: 'সিস্টেম অ্যাডমিনিস্ট্রেটর' },
};

export function t(lang: LanguageCode, en: string, bn: string): string {
  return lang === 'bn' ? bn : en;
}
