import React from 'react';
import { motion } from 'framer-motion';

const Button = ({ 
  children, 
  variant = "primary", 
  size = "md", 
  className = "", 
  disabled = false, 
  loading = false,
  icon,
  iconPosition = "left",
  onClick, 
  type = "button",
  fullWidth = false,
  ...props 
}) => {
  const baseStyles = "btn relative overflow-hidden group";
  
  const variants = {
    primary: "btn-primary shadow-sm hover:shadow-md",
    secondary: "btn-secondary",
    outline: "btn-outline",
    ghost: "btn-ghost",
    destructive: "bg-error-600 text-white shadow-sm hover:bg-error-700 hover:shadow-md active:bg-error-800",
    success: "bg-success-600 text-white shadow-sm hover:bg-success-700 hover:shadow-md active:bg-success-800",
    warning: "bg-warning-600 text-white shadow-sm hover:bg-warning-700 hover:shadow-md active:bg-warning-800",
    link: "text-primary-600 underline-offset-4 hover:underline hover:text-primary-700 p-0 h-auto"
  };
  
  const sizes = {
    sm: "btn-sm",
    md: "btn-md", 
    lg: "btn-lg",
    xl: "btn-xl",
    icon: "h-10 w-10 p-0"
  };

  const iconSizes = {
    sm: "h-4 w-4",
    md: "h-4 w-4",
    lg: "h-5 w-5", 
    xl: "h-6 w-6",
    icon: "h-4 w-4"
  };

  const iconClasses = `${iconSizes[size]} ${iconPosition === "right" ? "ml-2" : "mr-2"}`;

  const buttonContent = (
    <>
      {loading && (
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          className="absolute inset-0 flex items-center justify-center bg-inherit"
        >
          <div className={`spinner ${iconSizes[size]}`} />
        </motion.div>
      )}
      
      <motion.div
        className={`flex items-center justify-center ${loading ? "opacity-0" : "opacity-100"} transition-opacity duration-200`}
        animate={{ opacity: loading ? 0 : 1 }}
      >
        {icon && iconPosition === "left" && (
          <span className={iconClasses}>
            {icon}
          </span>
        )}
        
        {children}
        
        {icon && iconPosition === "right" && (
          <span className={iconClasses}>
            {icon}
          </span>
        )}
      </motion.div>

      {/* Ripple effect */}
      <motion.div
        className="absolute inset-0 bg-white/20 rounded-inherit"
        initial={{ scale: 0, opacity: 0 }}
        whileTap={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.1 }}
      />
    </>
  );

  return (
    <motion.button
      className={`${baseStyles} ${variants[variant]} ${sizes[size]} ${fullWidth ? "w-full" : ""} ${className}`}
      disabled={disabled || loading}
      onClick={onClick}
      type={type}
      whileHover={{ scale: disabled ? 1 : 1.02 }}
      whileTap={{ scale: disabled ? 1 : 0.98 }}
      transition={{ duration: 0.1 }}
      {...props}
    >
      {buttonContent}
    </motion.button>
  );
};

export default Button;