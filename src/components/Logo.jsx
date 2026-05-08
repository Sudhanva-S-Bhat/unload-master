import React from 'react';
import { Fuel } from 'lucide-react';

export default function Logo({ size = 32 }) {
  return (
    <div style={{ position: 'relative', width: size, height: size, display: 'inline-block' }}>
      <svg viewBox="0 0 24 24" width={size} height={size} style={{ position: 'absolute', top: 0, left: 0 }}>
        <linearGradient id="pin-gradient" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop stopColor="#6366f1" offset="0%" />
          <stop stopColor="#4338ca" offset="100%" />
        </linearGradient>
        <path 
          d="M12 2C8.13 2 5 5.13 5 9c0 5.25 7 13 7 13s7-7.75 7-13c0-3.87-3.13-7-7-7z" 
          fill="url(#pin-gradient)" 
          style={{ filter: 'drop-shadow(0px 4px 6px rgba(79, 70, 229, 0.3))' }}
        />
      </svg>
      <Fuel 
        size={size * 0.45} 
        color="#e2e8f0" 
        strokeWidth={2.5}
        style={{ 
          position: 'absolute', 
          top: `${size * 0.2}px`, 
          left: '50%',
          transform: 'translateX(-50%)'
        }} 
      />
    </div>
  );
}
