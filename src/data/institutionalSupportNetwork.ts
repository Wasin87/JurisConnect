export interface InstitutionalSupportEntry {
  id: string;
  nameEn: string;
  nameBn: string;
  domain: string;
  websiteUrl: string;
  logoPath: string;
  /** Documented upstream official source URL for maintenance verification */
  logoSourceUrl: string;
  fallbackCode: string;
}

export const INSTITUTIONAL_SUPPORT_NETWORK: InstitutionalSupportEntry[] = [
  {
    id: 'nlaso',
    nameEn: 'National Legal Aid Services Organization (NLASO)',
    nameBn: 'জাতীয় আইনগত সহায়তা প্রদান সংস্থা (এনএলএএসও)',
    domain: 'nlaso.gov.bd',
    websiteUrl: 'https://nlaso.gov.bd/',
    logoPath: '/logos/institutions/nlaso.png',
    logoSourceUrl: 'https://nlaso.teletalk.com.bd/images/nlaso_logo.png',
    fallbackCode: 'NLASO',
  },
  {
    id: 'nhrc',
    nameEn: 'National Human Rights Commission Bangladesh (NHRC)',
    nameBn: 'জাতীয় মানবাধিকার কমিশন বাংলাদেশ (এনএইচআরসি)',
    domain: 'nhrc.org.bd',
    websiteUrl: 'https://nhrc.org.bd/',
    logoPath: '/logos/institutions/nhrc.gif',
    logoSourceUrl: 'https://nhrc.teletalk.com.bd/images/nhrc_logo.png',
    fallbackCode: 'NHRC',
  },
  {
    id: 'bangladesh-police',
    nameEn: 'Bangladesh Police',
    nameBn: 'বাংলাদেশ পুলিশ',
    domain: 'police.gov.bd',
    websiteUrl: 'https://www.police.gov.bd/',
    logoPath: '/logos/institutions/bangladesh-police.svg',
    logoSourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/7/75/Bangladesh_Police_Emblem.svg',
    fallbackCode: 'BP',
  },
  {
    id: 'mowca',
    nameEn: 'Ministry of Women and Children Affairs',
    nameBn: 'মহিলা ও শিশু বিষয়ক মন্ত্রণালয়',
    domain: 'mowca.gov.bd',
    websiteUrl: 'https://mowca.gov.bd/',
    logoPath: '/logos/institutions/gov-bd-seal.svg',
    logoSourceUrl: 'https://mowca.gov.bd/site-assets/images/logo.png',
    fallbackCode: 'MoWCA',
  },
  {
    id: 'minland',
    nameEn: 'Ministry of Land',
    nameBn: 'ভূমি মন্ত্রণালয়',
    domain: 'minland.gov.bd',
    websiteUrl: 'https://minland.gov.bd/',
    logoPath: '/logos/institutions/gov-bd-seal.svg',
    logoSourceUrl: 'https://minland.gov.bd/site-assets/images/logo.png',
    fallbackCode: 'MinLand',
  },
  {
    id: 'minlaw',
    nameEn: 'Ministry of Law, Justice and Parliamentary Affairs',
    nameBn: 'আইন, বিচার ও সংসদ বিষয়ক মন্ত্রণালয়',
    domain: 'minlaw.gov.bd',
    websiteUrl: 'https://minlaw.gov.bd/',
    logoPath: '/logos/institutions/gov-bd-seal.svg',
    logoSourceUrl: 'https://minlaw.gov.bd/site-assets/images/logo.png',
    fallbackCode: 'MinLaw',
  },
  {
    id: 'dss',
    nameEn: 'Department of Social Services',
    nameBn: 'সমাজসেবা অধিদপ্তর',
    domain: 'dss.gov.bd',
    websiteUrl: 'https://dss.gov.bd/',
    logoPath: '/logos/institutions/gov-bd-seal.svg',
    logoSourceUrl: 'https://dss.gov.bd/site-assets/images/logo.png',
    fallbackCode: 'DSS',
  },
  {
    id: 'bar-council',
    nameEn: 'Bangladesh Bar Council',
    nameBn: 'বাংলাদেশ বার কাউন্সিল',
    domain: 'barcouncil.gov.bd',
    websiteUrl: 'https://barcouncil.gov.bd/',
    logoPath: '/logos/institutions/bangladesh-bar-council.png',
    logoSourceUrl: 'https://upload.wikimedia.org/wikipedia/en/3/3f/Bangladesh_Bar_Council_logo.png',
    fallbackCode: 'BBC',
  },
  {
    id: 'prisons',
    nameEn: 'Department of Prisons',
    nameBn: 'কারা অধিদপ্তর',
    domain: 'prison.gov.bd',
    websiteUrl: 'https://prison.gov.bd/',
    logoPath: '/logos/institutions/department-of-prisons.png',
    logoSourceUrl: 'https://upload.wikimedia.org/wikipedia/commons/c/c6/Bangladesh_Prisons.png',
    fallbackCode: 'PRISON',
  },
  {
    id: 'supreme-court',
    nameEn: 'Supreme Court of Bangladesh',
    nameBn: 'বাংলাদেশ সুপ্রীম কোর্ট',
    domain: 'supremecourt.gov.bd',
    websiteUrl: 'https://www.supremecourt.gov.bd/',
    logoPath: '/logos/institutions/supreme-court-bd.png',
    logoSourceUrl: 'https://supremecourt.gov.bd/cms/img/scicon.png',
    fallbackCode: 'SCBD',
  },
];
