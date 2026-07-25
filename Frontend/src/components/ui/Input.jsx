import React, { forwardRef } from 'react';
import { motion } from 'framer-motion';

const Input = forwardRef(({ 
  className = "", 
  type = "text", 
  label,
  error,
  helperText,
  icon,
  iconPosition = "left",
  size = "md",
  variant = "default",
  ...props 
}, ref) => {
  const sizeClasses = {
    sm: "h-8 px-3 text-sm",
    md: "h-10 px-3 text-sm",
    lg: "h-12 px-4 text-base"
  };

  const variants = {
    default: "input",
    filled: "bg-gray-50 border-gray-200 focus:bg-white",
    error: "border-error-300 focus:border-error-500 focus:ring-error-500"
  };

  const inputClasses = [
    variants[variant],
    sizeClasses[size],
    icon && iconPosition === "left" && "pl-10",
    icon && iconPosition === "right" && "pr-10",
    error && "border-error-300 focus:border-error-500 focus:ring-error-500",
    className
  ].filter(Boolean).join(" ");

  const iconClasses = {
    sm: "h-4 w-4",
    md: "h-4 w-4", 
    lg: "h-5 w-5"
  };

  const iconPositionClasses = {
    left: "left-3",
    right: "right-3"
  };

  return (
    <motion.div 
      className="space-y-1"
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2 }}
    >
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label}
        </label>
      )}
      
      <div className="relative">
        {icon && iconPosition === "left" && (
          <div className={`absolute inset-y-0 left-0 flex items-center ${iconPositionClasses.left}`}>
            <span className={`text-gray-400 ${iconClasses[size]}`}>
              {icon}
            </span>
          </div>
        )}
        
        <motion.input
          ref={ref}
          type={type}
          className={inputClasses}
          whileFocus={{ scale: 1.01 }}
          transition={{ duration: 0.1 }}
          {...props}
        />
        
        {icon && iconPosition === "right" && (
          <div className={`absolute inset-y-0 right-0 flex items-center ${iconPositionClasses.right}`}>
            <span className={`text-gray-400 ${iconClasses[size]}`}>
              {icon}
            </span>
          </div>
        )}
      </div>
      
      {error && (
        <motion.p 
          className="text-sm text-error-600 flex items-center gap-1"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
          </svg>
          {error}
        </motion.p>
      )}
      
      {helperText && !error && (
        <motion.p 
          className="text-sm text-gray-500"
          initial={{ opacity: 0, y: -5 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.2 }}
        >
          {helperText}
        </motion.p>
      )}
    </motion.div>
  );
});

Input.displayName = "Input";

export default Input;