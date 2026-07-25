import React from "react";
import { motion } from "framer-motion";

const LoadingSpinner = ({ 
  size = "md", 
  variant = "default",
  className = "",
  text = "",
  ...props 
}) => {
  const sizeClasses = {
    xs: "h-3 w-3",
    sm: "h-4 w-4",
    md: "h-8 w-8",
    lg: "h-12 w-12",
    xl: "h-16 w-16"
  };

  const variants = {
    default: "border-gray-300 border-t-primary-600",
    primary: "border-primary-200 border-t-primary-600",
    secondary: "border-secondary-200 border-t-secondary-600",
    success: "border-success-200 border-t-success-600",
    warning: "border-warning-200 border-t-warning-600",
    error: "border-error-200 border-t-error-600"
  };

  const textSizeClasses = {
    xs: "text-xs",
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
    xl: "text-xl"
  };

  return (
    <motion.div 
      className={`flex flex-col items-center justify-center space-y-2 ${className}`}
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      <motion.div
        className={`spinner ${sizeClasses[size]} ${variants[variant]}`}
        animate={{ rotate: 360 }}
        transition={{ 
          duration: 1, 
          repeat: Infinity, 
          ease: "linear" 
        }}
      />
      {text && (
        <motion.p 
          className={`text-gray-600 font-medium ${textSizeClasses[size]}`}
          initial={{ opacity: 0, y: 5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          {text}
        </motion.p>
      )}
    </motion.div>
  );
};

export default LoadingSpinner;
