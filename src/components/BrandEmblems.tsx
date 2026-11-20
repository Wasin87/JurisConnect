import React from 'react';

interface LogoProps {
  className?: string;
  size?: number;
}

/**
 * Custom JurisConnect Brand Emblem (Justice Scale + Bridge Arch)
 */
export const JurisConnectCrest: React.FC<LogoProps> = ({ className = '', size = 34 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect width="40" height="40" rx="10" fill="#064E3B" />
    <rect x="1.25" y="1.25" width="37.5" height="37.5" rx="8.75" stroke="#34D399" strokeOpacity="0.55" strokeWidth="1.2" />
    {/* Bridge arch */}
    <path
      d="M7 29.5C10.5 23.5 15 21 20 21C25 21 29.5 23.5 33 29.5"
      stroke="#6EE7B7"
      strokeWidth="2"
      strokeLinecap="round"
    />
    {/* Justice Pillar & Beam */}
    <path d="M20 8V29" stroke="#ECFDF5" strokeWidth="2" strokeLinecap="round" />
    <path d="M11 13H29" stroke="#F59E0B" strokeWidth="2" strokeLinecap="round" />
    {/* Left Scale Pan */}
    <path d="M11 13L8.5 19.5H13.5L11 13Z" stroke="#D1FAE5" strokeWidth="1.35" strokeLinejoin="round" />
    {/* Right Scale Pan */}
    <path d="M29 13L26.5 19.5H31.5L29 13Z" stroke="#D1FAE5" strokeWidth="1.35" strokeLinejoin="round" />
    {/* Crown Apex */}
    <circle cx="20" cy="8.5" r="2" fill="#F59E0B" />
  </svg>
);

/**
 * Official-style Bangladesh Legal Aid & Judicial Coordination Seal
 */
export const BangladeshJusticeSeal: React.FC<LogoProps> = ({ className = '', size = 40 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 48 48"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <circle cx="24" cy="24" r="22.5" fill="#064E3B" stroke="#D97706" strokeWidth="2" />
    <circle cx="24" cy="24" r="18.5" stroke="#FDE68A" strokeOpacity="0.65" strokeWidth="1" strokeDasharray="2 2" />
    {/* Crimson Sun Disc */}
    <circle cx="24" cy="24" r="12.5" fill="#B91C1C" fillOpacity="0.9" stroke="#F59E0B" strokeWidth="1" />
    {/* Balanced Scales */}
    <path d="M24 13.5V34" stroke="#FEF3C7" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M15.5 18.5H32.5" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M15.5 18.5L13 24.5H18L15.5 18.5Z" stroke="#FEF3C7" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M32.5 18.5L30 24.5H35L32.5 18.5Z" stroke="#FEF3C7" strokeWidth="1.2" strokeLinejoin="round" />
    <path d="M19.5 34H28.5" stroke="#FDE68A" strokeWidth="1.8" strokeLinecap="round" />
    {/* 4 Constitutional Stars */}
    <circle cx="24" cy="8.5" r="1.1" fill="#FDE68A" />
    <circle cx="24" cy="39.5" r="1.1" fill="#FDE68A" />
    <circle cx="8.5" cy="24" r="1.1" fill="#FDE68A" />
    <circle cx="39.5" cy="24" r="1.1" fill="#FDE68A" />
  </svg>
);

/**
 * District Legal Aid Office (DLAO) Emblem
 */
export const DlaoSeal: React.FC<LogoProps> = ({ className = '', size = 38 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="38" height="38" rx="9" fill="#065F46" stroke="#6EE7B7" strokeOpacity="0.55" strokeWidth="1.2" />
    <path d="M10 30H30" stroke="#ECFDF5" strokeWidth="1.8" strokeLinecap="round" />
    <path d="M12 16V27M17.3 16V27M22.7 16V27M28 16V27" stroke="#D1FAE5" strokeWidth="1.6" strokeLinecap="round" />
    <path d="M9 15L20 9L31 15H9Z" fill="#F59E0B" fillOpacity="0.9" stroke="#FEF3C7" strokeWidth="1.2" strokeLinejoin="round" />
  </svg>
);

/**
 * Digital Bangladesh / UDC Citizen Service Emblem
 */
export const UdcAccessSeal: React.FC<LogoProps> = ({ className = '', size = 38 }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 40 40"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
    aria-hidden="true"
  >
    <rect x="1" y="1" width="38" height="38" rx="9" fill="#064E3B" stroke="#34D399" strokeOpacity="0.5" strokeWidth="1.2" />
    <circle cx="20" cy="20" r="9.5" stroke="#6EE7B7" strokeWidth="1.5" />
    <ellipse cx="20" cy="20" rx="4.5" ry="9.5" stroke="#A7F3D0" strokeWidth="1.2" />
    <path d="M10.5 20H29.5" stroke="#A7F3D0" strokeWidth="1.2" />
    <circle cx="20" cy="20" r="2.5" fill="#F59E0B" />
  </svg>
);
