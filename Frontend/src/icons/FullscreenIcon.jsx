// Ajoutez ces icônes après les autres icônes existantes (vers ligne 80)
const FullscreenIcon = ({ className = "h-5 w-5" }) => (
  <svg className={className} fill="none" stroke="currentColor" viewBox="0 0 24 24">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 7V4a1 1 0 011-1h3M4 17v3a1 1 0 001 1h3m10-18h3a1 1 0 011 1v3m0 10v3a1 1 0 01-1 1h-3M9 9h6v6H9z" />
  </svg>
);

export default FullscreenIcon;
