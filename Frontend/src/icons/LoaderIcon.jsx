import React from 'react';

const LoaderIcon = ({ className = "h-4 w-4", variant = "default", ...props }) => {
  const variants = {
    default: "border-gray-300 border-t-gray-600",
    primary: "border-blue-200 border-t-blue-600",
    success: "border-green-200 border-t-green-600",
    warning: "border-yellow-200 border-t-yellow-600",
    danger: "border-red-200 border-t-red-600",
    white: "border-white/30 border-t-white"
  };

  return (
    <div
      className={`
        border-2 rounded-full animate-spin
        ${variants[variant] || variants.default}
        ${className}
      `}
      role="status"
      aria-label="Chargement en cours"
      {...props}
    >
      <span className="sr-only">Chargement...</span>
    </div>
  );
};

// Version alternative avec SVG pour plus de contrôle
export const LoaderIconSVG = ({ className = "h-4 w-4", color = "currentColor", ...props }) => {
  return (
    <svg
      className={`animate-spin ${className}`}
      fill="none"
      viewBox="0 0 24 24"
      role="status"
      aria-label="Chargement en cours"
      {...props}
    >
      <circle
        cx="12"
        cy="12"
        r="10"
        stroke={color}
        strokeOpacity="0.25"
        strokeWidth="4"
      />
      <path
        fill={color}
        d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
      />
      <span className="sr-only">Chargement...</span>
    </svg>
  );
};

// Version avec points animés
export const LoaderDots = ({ className = "h-4 w-4", variant = "primary" }) => {
  const colors = {
    default: "bg-gray-600",
    primary: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    danger: "bg-red-600",
    white: "bg-white"
  };

  return (
    <div className={`flex items-center space-x-1 ${className}`} role="status" aria-label="Chargement en cours">
      <div className={`w-2 h-2 ${colors[variant]} rounded-full animate-bounce`} style={{ animationDelay: '0ms' }}></div>
      <div className={`w-2 h-2 ${colors[variant]} rounded-full animate-bounce`} style={{ animationDelay: '150ms' }}></div>
      <div className={`w-2 h-2 ${colors[variant]} rounded-full animate-bounce`} style={{ animationDelay: '300ms' }}></div>
      <span className="sr-only">Chargement...</span>
    </div>
  );
};

// Version avec barres
export const LoaderBars = ({ className = "h-4 w-4", variant = "primary" }) => {
  const colors = {
    default: "bg-gray-600",
    primary: "bg-blue-600",
    success: "bg-green-600",
    warning: "bg-yellow-600",
    danger: "bg-red-600",
    white: "bg-white"
  };

  return (
    <div className={`flex items-end space-x-1 ${className}`} role="status" aria-label="Chargement en cours">
      <div className={`w-1 h-4 ${colors[variant]} animate-pulse`} style={{ animationDelay: '0ms' }}></div>
      <div className={`w-1 h-3 ${colors[variant]} animate-pulse`} style={{ animationDelay: '150ms' }}></div>
      <div className={`w-1 h-5 ${colors[variant]} animate-pulse`} style={{ animationDelay: '300ms' }}></div>
      <div className={`w-1 h-2 ${colors[variant]} animate-pulse`} style={{ animationDelay: '450ms' }}></div>
      <span className="sr-only">Chargement...</span>
    </div>
  );
};

export default LoaderIcon;