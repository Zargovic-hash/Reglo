const CloudIcon = ({ className = "h-6 w-6", fill = "none", stroke = "currentColor" }) => (
  <svg
    className={className}
    fill={fill}
    stroke={stroke}
    strokeWidth={2}
    viewBox="0 0 24 24"
    xmlns="http://www.w3.org/2000/svg"
  >
    <path
      strokeLinecap="round"
      strokeLinejoin="round"
      d="M3 15a4 4 0 0 1 4-4h1.26a4 4 0 1 1 7.48 0H17a4 4 0 0 1 0 8H7a4 4 0 0 1-4-4z"
    />
  </svg>
);

export default CloudIcon;