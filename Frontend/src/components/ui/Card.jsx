import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ 
  children, 
  className = "", 
  hover = false,
  interactive = false,
  glass = false,
  gradient = false,
  ...props 
}) => {
  const cardClasses = [
    "card",
    hover && "card-hover",
    interactive && "card-interactive",
    glass && "glass",
    gradient && "bg-gradient-to-br from-white to-gray-50",
    className
  ].filter(Boolean).join(" ");

  return (
    <motion.div
      className={cardClasses}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardHeader = ({ 
  children, 
  className = "",
  withDivider = false,
  ...props 
}) => (
  <motion.div 
    className={`flex flex-col space-y-1.5 p-6 ${withDivider ? "border-b border-gray-100" : ""} ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.1 }}
    {...props}
  >
    {children}
  </motion.div>
);

export const CardTitle = ({ 
  children, 
  className = "",
  gradient = false,
  ...props 
}) => (
  <motion.h3 
    className={`text-2xl font-semibold leading-none tracking-tight ${
      gradient ? "gradient-text" : "text-gray-900"
    } ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.2 }}
    {...props}
  >
    {children}
  </motion.h3>
);

export const CardDescription = ({ 
  children, 
  className = "",
  ...props 
}) => (
  <motion.p 
    className={`text-sm text-gray-600 leading-relaxed ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.3 }}
    {...props}
  >
    {children}
  </motion.p>
);

export const CardContent = ({ 
  children, 
  className = "",
  padding = "default",
  ...props 
}) => {
  const paddingClasses = {
    none: "p-0",
    sm: "p-4",
    default: "p-6",
    lg: "p-8"
  };

  return (
    <motion.div 
      className={`${paddingClasses[padding]} ${className}`}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: 0.4 }}
      {...props}
    >
      {children}
    </motion.div>
  );
};

export const CardFooter = ({ 
  children, 
  className = "",
  ...props 
}) => (
  <motion.div 
    className={`flex items-center p-6 pt-0 ${className}`}
    initial={{ opacity: 0, y: 10 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.2, delay: 0.5 }}
    {...props}
  >
    {children}
  </motion.div>
);

export default Card;