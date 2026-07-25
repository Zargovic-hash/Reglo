import React from "react";

const StatusBadge = ({ status, children, ...props }) => {
  const variants = {
    success: "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100",
    danger: "bg-red-50 text-red-700 border-red-200 hover:bg-red-100",
    warning: "bg-amber-50 text-amber-700 border-amber-200 hover:bg-amber-100",
    info: "bg-blue-50 text-blue-700 border-blue-200 hover:bg-blue-100",
    neutral: "bg-gray-50 text-gray-700 border-gray-200 hover:bg-gray-100"
  };

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border transition-colors duration-150 ${variants[status] || variants.neutral}`}
      {...props}
    >
      {children}
    </span>
  );
};

export default StatusBadge;
