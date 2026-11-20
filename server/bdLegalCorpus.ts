export interface LegalCorpusEntry {
  id: string;
  actNameEn: string;
  actNameBn: string;
  section: string;
  category:
    | 'legal_aid'
    | 'family_maintenance'
    | 'domestic_violence'
    | 'labor_wages'
    | 'land_property'
    | 'civil_dispute'
    | 'criminal_defense'
    | 'adr_mediation';
  officialUrl: string;
  keywords: string[];
  excerpt: string;
  summaryBn: string;
}

export const BD_LEGAL_CORPUS: LegalCorpusEntry[] = [
  {
    id: 'lasa-2000-sec-2-7',
    actNameEn: 'The Legal Aid Services Act, 2000 (Act No. VI of 2000)',
    actNameBn: 'আইনগত সহায়তা প্রদান আইন, ২০০০',
    section: 'Sections 2, 7 & 10 — Definition & District Legal Aid Committee Mandate',
    category: 'legal_aid',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-838.html',
    keywords: [
      'legal aid',
      'eligibility',
      'insolvent',
      'poor',
      'nlaso',
      'dlao',
      'district committee',
      'free lawyer',
      'আইনি সহায়তা',
      'অসচ্ছল',
      'ডিএলএও',
      'বিনামূল্যে আইনজীবী',
    ],
    excerpt:
      'Under Section 2(a) and Section 10 of the Legal Aid Services Act, 2000, financially insolvent persons incapable of seeking justice due to financial hardship, along with designated vulnerable groups, are entitled to free legal representation, court fees, and legal advice administered through the National Legal Aid Services Organization (NLASO) and District Legal Aid Committees chaired by the District & Sessions Judge.',
    summaryBn:
      'আইনগত সহায়তা প্রদান আইন, ২০০০ অনুযায়ী আর্থিকভাবে অসচ্ছল ও বিচার পেতে অসমর্থ নাগরিকগণ জেলা লিগ্যাল এইড অফিস (ডিএলএও) ও এনএলএএসও-এর মাধ্যমে সম্পূর্ণ বিনামূল্যে আইনজীবী ও মামলা পরিচালনার সহায়তা পাওয়ার অধিকারী।',
  },
  {
    id: 'nlaso-policy-2014-eligibility',
    actNameEn: 'Legal Aid Services Policies (2014) — NLASO Eligibility Criteria',
    actNameBn: 'আইনগত সহায়তা প্রদান নীতিমালা, ২০১৪ (যোগ্যতা নির্ধারণ)',
    section: 'Policy 2 — Income Ceiling & Priority Vulnerable Categories',
    category: 'legal_aid',
    officialUrl: 'https://nlaso.gov.bd/',
    keywords: [
      'income limit',
      'women',
      'children',
      'worker',
      'freedom fighter',
      'senior citizen',
      'victim',
      'আয়সীমা',
      'নারী',
      'শিশু',
      'শ্রমিক',
      'প্রবীণ',
    ],
    excerpt:
      'Under the Legal Aid Services Policies, citizens whose annual average income does not exceed BDT 1,00,000 (District Courts) or BDT 1,50,000 (Supreme Court), as well as insolvent freedom fighters, workers, women/children facing abuse or trafficking, elderly persons, and disabled citizens, qualify for free legal aid without automatic rejection prior to DLAO verification.',
    summaryBn:
      'নীতিমালা অনুযায়ী নির্দিষ্ট বার্ষিক আয়সীমার নিচে থাকা নাগরিক, নির্যাতনের শিকার নারী ও শিশু, শ্রমিক, অসচ্ছল প্রবীণ ও প্রতিবন্ধী ব্যক্তিরা ডিএলএও যাচাইয়ের মাধ্যমে বিনামূল্যে আইনি সহায়তা পান।',
  },
  {
    id: 'lasa-sec-21a-adr',
    actNameEn: 'The Legal Aid Services Act, 2000 (Amended 2013) & Rules 2015',
    actNameBn: 'আইনগত সহায়তা প্রদান আইন, ২০০০ (সংশোধিত) — ধারা ২১ক (মধ্যস্থতা)',
    section: 'Section 21A — Pre-Case & Court-Annexed Mediation by Legal Aid Officer',
    category: 'adr_mediation',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-838.html',
    keywords: [
      'mediation',
      'adr',
      'settlement',
      'conciliation',
      'compromise',
      'dlao mediation',
      'মধ্যস্থতা',
      'আপস',
      'মীমাংসা',
      'বিকল্প বিরোধ নিষ্পত্তি',
    ],
    excerpt:
      'Section 21A empowers the District Legal Aid Officer (DLAO) to mediate and settle disputes amicably prior to or alongside litigation when both parties consent. A written settlement agreement signed by both parties and countersigned by the Legal Aid Officer carries binding legal value for dispute resolution.',
    summaryBn:
      'ধারা ২১ক অনুযায়ী জেলা লিগ্যাল এইড অফিসার উভয় পক্ষের সম্মতিতে মামলা দায়েরের পূর্বে বা চলমান অবস্থায় আপস-মধ্যস্থতার মাধ্যমে দ্রুত ও বিনা খরচে বিরোধ নিষ্পত্তি করতে পারেন।',
  },
  {
    id: 'family-courts-act-2023-sec-5',
    actNameEn: 'The Family Courts Act, 2023 (পারিবারিক আদালত আইন, ২০২৩)',
    actNameBn: 'পারিবারিক আদালত আইন, ২০২৩',
    section: 'Sections 5 & 10 — Exclusive Jurisdiction & Pre-Trial Reconciliation',
    category: 'family_maintenance',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/',
    keywords: [
      'maintenance',
      'dower',
      'denmohor',
      'divorce',
      'custody',
      'guardianship',
      'family court',
      'child support',
      'alimony',
      'ভরণপোষণ',
      'দেনমোহর',
      'তালাক',
      'অভিভাবকত্ব',
      'পারিবারিক আদালত',
      'খোরপোশ',
      'সন্তানের ভরণপোষণ',
    ],
    excerpt:
      'Section 5 grants Family Courts exclusive jurisdiction over suits relating to (a) dissolution of marriage, (b) restitution of conjugal rights, (c) dower (denmohor), (d) maintenance of wife and children, and (e) guardianship and custody of children. Section 10 requires the court to attempt pre-trial compromise or reconciliation between the parties.',
    summaryBn:
      'পারিবারিক আদালত আইন, ২০২৩-এর ধারা ৫ অনুযায়ী স্ত্রী ও সন্তানের ভরণপোষণ (খোরপোশ), দেনমোহর, বিবাহ বিচ্ছেদ ও সন্তানের হেফাজত সংক্রান্ত মামলা পারিবারিক আদালতে বিচার্য এবং ধারা ১০ অনুযায়ী আপস-মীমাংসার সুযোগ রয়েছে।',
  },
  {
    id: 'mflo-1961-sec-9-maintenance',
    actNameEn: 'The Muslim Family Laws Ordinance, 1961',
    actNameBn: 'মুসলিম পারিবারিক আইন অধ্যাদেশ, ১৯৬১',
    section: 'Section 9 — Maintenance (ভরণপোষণ) & Section 7 — Talaq Procedure',
    category: 'family_maintenance',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-305.html',
    keywords: [
      'muslim family',
      'maintenance',
      'husband fails',
      'kabinnama',
      'arbitration council',
      'union parishad',
      'ভরণপোষণ',
      'কাবিননামা',
      'স্বামী',
      'খোরপোশ',
      'চেয়ারম্যান',
    ],
    excerpt:
      'Under Section 9 of the Muslim Family Laws Ordinance, 1961, if a husband fails to maintain his wife adequately, the wife may apply to the Union Parishad/Pourashava Chairman to constitute an Arbitration Council, or file directly before the Family Court for past and current maintenance alongside dower claims.',
    summaryBn:
      'মুসলিম পারিবারিক আইন অধ্যাদেশ, ১৯৬১-এর ধারা ৯ অনুযায়ী স্বামী ভরণপোষণ না দিলে স্ত্রী সালিশি পরিষদ (ইউনিয়ন/পৌর চেয়ারম্যান) অথবা সরাসরি পারিবারিক আদালতে বকেয়া ও চলমান ভরণপোষণের দাবি করতে পারেন।',
  },
  {
    id: 'dvppa-2010-protection',
    actNameEn: 'The Domestic Violence (Prevention and Protection) Act, 2010',
    actNameBn: 'পারিবারিক সহিংসতা (প্রতিরোধ ও সুরক্ষা) আইন, ২০১০',
    section: 'Sections 3, 13, 14, 15 & 16 — Protection, Residence, Compensation & Maintenance Orders',
    category: 'domestic_violence',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-1051.html',
    keywords: [
      'domestic violence',
      'abuse',
      'protection order',
      'residence order',
      'safe shelter',
      'harassment',
      'dowry',
      'পারিবারিক সহিংসতা',
      'নির্যাতন',
      'সুরক্ষা আদেশ',
      'আশ্রয়',
      'যৌতুক',
      'নিরাপত্তা',
    ],
    excerpt:
      'Section 3 defines domestic violence to include physical, psychological, sexual, and economic abuse against a woman or child in a family relationship. Sections 13–16 empower the Judicial Magistrate to issue urgent interim Protection Orders (Section 14), Residence Orders prohibiting eviction from the shared household (Section 15), and Compensation/Maintenance Orders (Section 16).',
    summaryBn:
      'পারিবারিক সহিংসতা (প্রতিরোধ ও সুরক্ষা) আইন, ২০১০ অনুযায়ী শারীরিক, মানসিক ও অর্থনৈতিক নির্যাতনের ক্ষেত্রে আদালত তাৎক্ষণিক সুরক্ষা আদেশ (ধারা ১৪), বসবাসের অধিকার আদেশ (ধারা ১৫) এবং ক্ষতিপূরণ ও ভরণপোষণ আদেশ (ধারা ১৬) দিতে পারেন।',
  },
  {
    id: 'labour-act-2006-wages',
    actNameEn: 'The Bangladesh Labour Act, 2006 (Act No. XLII of 2006)',
    actNameBn: 'বাংলাদেশ শ্রম আইন, ২০০৬',
    section: 'Sections 26, 33, 120–132 — Payment of Wages, Termination Dues & Labour Court Redress',
    category: 'labor_wages',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-952.html',
    keywords: [
      'wages',
      'salary',
      'overtime',
      'factory',
      'garment',
      'worker',
      'termination',
      'severance',
      'labour court',
      'মজুরি',
      'বেতন',
      'বকেয়া',
      'শ্রমিক',
      'গার্মেন্টস',
      'চাকরিচ্যুতি',
      'শ্রম আদালত',
    ],
    excerpt:
      'Sections 121–124 mandate timely payment of wages within 7 working days after the wage period. Section 132 enables workers to recover delayed or unlawfully deducted wages through the Labour Court. Section 26 governs termination benefits, while Section 33 provides a 30-day written grievance procedure to the employer followed by Labour Court complaint.',
    summaryBn:
      'বাংলাদেশ শ্রম আইন, ২০০৬-এর ধারা ১২১–১৩২ অনুযায়ী নির্ধারিত সময়ে মজুরি ও ওভারটাইম পরিশোধ বাধ্যতামূলক; বকেয়া মজুরি ও বেআইনি চাকরিচ্যুতির প্রতিকারের জন্য শ্রম আদালতে মামলা করা যায়।',
  },
  {
    id: 'specific-relief-sat-land',
    actNameEn: 'The Specific Relief Act, 1877 & State Acquisition and Tenancy Act, 1950',
    actNameBn: 'সুনির্দিষ্ট প্রতিকার আইন, ১৮৭৭ এবং রাষ্ট্রীয় অধিগ্রহণ ও প্রজাস্বত্ব আইন, ১৯৫০',
    section: 'Sections 8, 9 & 42 (SR Act) / Section 143 (SAT Act) — Possession, Title & Khatian Mutation',
    category: 'land_property',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-40.html',
    keywords: [
      'land',
      'khatian',
      'deed',
      'possession',
      'eviction',
      'boundary',
      'homestead',
      'mutation',
      'injunction',
      'জমি',
      'খতিয়ান',
      'দলিল',
      'দখল',
      'ভিটা',
      'সীমানা',
      'নামজারি',
    ],
    excerpt:
      'Section 9 of the Specific Relief Act, 1877 allows summary recovery of possession if a person is dispossessed of immovable property without consent and otherwise than in due course of law (within 6 months). Section 42 provides declaratory decrees of title/right, supported by Khatian records and mutation under Section 143 of the SAT Act, 1950.',
    summaryBn:
      'সুনির্দিষ্ট প্রতিকার আইন, ১৮৭৭-এর ধারা ৯ অনুযায়ী বেআইনিভাবে দখলচ্যুত হলে ৬ মাসের মধ্যে দখল পুনরুদ্ধারের মামলা করা যায় এবং ধারা ৪২ অনুযায়ী স্বত্ব ঘোষণার মামলা করা যায়।',
  },
  {
    id: 'cpc-89a-crpc-145-497',
    actNameEn: 'Code of Civil Procedure, 1908 (Sec. 89A) & Code of Criminal Procedure, 1898',
    actNameBn: 'দেওয়ানি কার্যবিধি, ১৯০৮ (ধারা ৮৯ক) এবং ফৌজদারি কার্যবিধি, ১৮৯৮',
    section: 'CPC Sec. 89A (Mediation) & CrPC Sec. 145, 154, 496–498 (GD/FIR & Bail)',
    category: 'criminal_defense',
    officialUrl: 'http://bdlaws.minlaw.gov.bd/act-86.html',
    keywords: [
      'bail',
      'fir',
      'gd',
      'general diary',
      'criminal',
      'civil',
      'mediation',
      'section 145',
      'জামিন',
      'জিডি',
      'এজাহার',
      'ফৌজদারি',
      'দেওয়ানি',
      'মামলা',
    ],
    excerpt:
      'Under Section 89A of the Code of Civil Procedure, 1908, civil courts refer pending suits for mandatory mediation after written statement submission. Under the Code of Criminal Procedure, 1898, Sections 496–498 govern bail in bailable and non-bailable offences, Section 154 covers recording of FIRs, and Section 145 addresses urgent possession disputes threatening breach of peace.',
    summaryBn:
      'দেওয়ানি কার্যবিধির ধারা ৮৯ক অনুযায়ী দেওয়ানি মামলায় মধ্যস্থতার বিধান রয়েছে এবং ফৌজদারি কার্যবিধির ধারা ৪৯৬–৪৯৮ অনুযায়ী জামিন ও ধারা ১৫৪ অনুযায়ী এজাহার দায়েরের অধিকার সংরক্ষিত।',
  },
];

function tokenize(text: string): string[] {
  return text
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .split(/\s+/)
    .filter((w) => w.length >= 2);
}

export function scoreLexicalMatch(query: string, entry: LegalCorpusEntry): number {
  const qTokens = tokenize(query);
  if (qTokens.length === 0) return 0;

  const docText = [
    entry.actNameEn,
    entry.actNameBn,
    entry.section,
    entry.category,
    entry.keywords.join(' '),
    entry.excerpt,
    entry.summaryBn,
  ]
    .join(' ')
    .toLowerCase();

  let score = 0;
  for (const tok of qTokens) {
    if (entry.keywords.some((kw) => kw.toLowerCase().includes(tok))) {
      score += 3.5;
    } else if (docText.includes(tok)) {
      score += 1.2;
    }
  }
  return score;
}

export function cosineSimilarity(a: number[], b: number[]): number {
  if (a.length === 0 || a.length !== b.length) return 0;
  let dot = 0;
  let normA = 0;
  let normB = 0;
  for (let i = 0; i < a.length; i++) {
    dot += a[i] * b[i];
    normA += a[i] * a[i];
    normB += b[i] * b[i];
  }
  const denom = Math.sqrt(normA) * Math.sqrt(normB);
  return denom > 0 ? dot / denom : 0;
}
