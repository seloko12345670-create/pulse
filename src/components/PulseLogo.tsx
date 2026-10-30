import React from 'react';

interface PulseLogoProps {
  size?: 'sm' | 'md' | 'lg';
  showText?: boolean;
}

export const PulseLogo: React.FC<PulseLogoProps> = ({ size = 'md', showText = true }) => {
  const dimensions = size === 'sm' ? 28 : size === 'lg' ? 48 : 34;
  const textClass =
    size === 'sm'
      ? 'text-lg'
      : size === 'lg'
      ? 'text-3xl'
      : 'text-xl';

  return (
    <div className="inline-flex items-center gap-2.5 select-none shrink-0">
      <svg
        width={dimensions}
        height={dimensions}
        viewBox="0 0 256 256"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        className="shrink-0"
      >
        <rect width="256" height="256" rx="56" fill="#121212" />
        <rect
          x="10"
          y="10"
          width="236"
          height="236"
          rx="48"
          stroke="#FF2D8D"
          strokeOpacity="0.45"
          strokeWidth="6"
        />
        <path
          d="M36 132H76L98 70L134 188L162 106L182 132H220"
          stroke="#FF2D8D"
          strokeWidth="20"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        <circle cx="220" cy="132" r="12" fill="#FF65AD" />
      </svg>
      {showText && (
        <span
          className={`font-display font-bold tracking-tight text-white whitespace-nowrap ${textClass}`}
        >
          PULSE
        </span>
      )}
    </div>
  );
};
