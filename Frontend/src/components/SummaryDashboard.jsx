import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";

const StatItem = ({ value, label, color, isHighlighted }) => {
  const [isHovered, setIsHovered] = useState(false);
  
  return (
    <motion.div 
      className="relative flex flex-col items-center justify-center px-1 cursor-default group"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      whileHover={{ scale: 1.05 }}
      transition={{ type: "spring", stiffness: 400, damping: 17 }}
    >
      {/* Badge de valeur avec effet */}
      <motion.span 
        className={`text-xs font-semibold leading-none ${color} transition-all`}
        animate={{ 
          y: isHovered ? -1 : 0,
        }}
      >
        {value}
      </motion.span>
      
      {/* Label avec animation */}
      <span className="text-[9px] text-gray-500 leading-none mt-0.5 group-hover:text-gray-700 transition-colors">
        {label}
      </span>
      
      {/* Indicateur de hover subtil */}
      <AnimatePresence>
        {isHovered && (
          <motion.div
            initial={{ scaleX: 0, opacity: 0 }}
            animate={{ scaleX: 1, opacity: 1 }}
            exit={{ scaleX: 0, opacity: 0 }}
            className={`absolute -bottom-0.5 h-0.5 ${color.replace('text-', 'bg-')} rounded-full`}
            style={{ width: '80%' }}
          />
        )}
      </AnimatePresence>
    </motion.div>
  );
};

const SummaryDashboard = ({ regulations, className = "" }) => {
  const stats = useMemo(() => {
    const today = new Date();
    const thirtyDaysFromNow = new Date(
      today.getTime() + 30 * 24 * 60 * 60 * 1000
    );

    const initialStats = {
      total: 0,
      conforme: 0,
      nonConforme: 0,
      nonApplicable: 0,
      enAttente: 0,
      deadlinesProches: 0,
      overdue: 0,
    };

    const countStats = regulations.reduce((acc, r) => {
      acc.total++;

      const normalizedConformite =
        r.conformite?.toString().trim().toLowerCase() || "";
      switch (normalizedConformite) {
        case "conforme":
          acc.conforme++;
          break;
        case "non conforme":
        case "nonconforme":
          acc.nonConforme++;
          break;
        case "non applicable":
        case "nonapplicable":
          acc.nonApplicable++;
          break;
        default:
          acc.enAttente++;
          break;
      }

      if (r.deadline) {
        const deadline = new Date(r.deadline);
        if (deadline < today) {
          acc.overdue++;
        } else if (deadline > today && deadline <= thirtyDaysFromNow) {
          acc.deadlinesProches++;
        }
      }

      return acc;
    }, initialStats);

    const elementsAudites =
      countStats.conforme + countStats.nonConforme + countStats.nonApplicable;
    const conformiteRate =
      elementsAudites > 0
        ? Math.round(
            ((countStats.conforme + countStats.nonApplicable) /
              elementsAudites) *
              100
          )
        : 0;

    return {
      ...countStats,
      conformiteRate,
    };
  }, [regulations]);

  const items = [
    { value: stats.total, label: "Total", color: "text-gray-900" },
    { value: stats.conforme, label: "Conforme", color: "text-emerald-600" },
    { value: stats.nonConforme, label: "Non conf.", color: "text-red-600" },
    { value: stats.nonApplicable, label: "N/A", color: "text-gray-500" },
    { value: stats.enAttente, label: "En attente", color: "text-amber-600" },
    { value: stats.deadlinesProches, label: "Échéances", color: "text-purple-600" },
    { value: stats.overdue, label: "Retard", color: "text-rose-600" },
    { value: `${stats.conformiteRate}%`, label: "Taux conf.", color: "text-indigo-600" },
  ];

  return (
    <motion.div
      initial={{ opacity: 0, y: 5 }}
      animate={{ opacity: 1, y: 0 }}
      className={`w-full border border-gray-200 rounded-lg bg-gradient-to-r from-white to-gray-50 px-2 py-1 flex items-center justify-between overflow-x-auto shadow-sm hover:shadow-md transition-shadow ${className}`}
      style={{ minHeight: "24px" }}
    >
      {items.map((item, i) => (
        <React.Fragment key={i}>
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.03 }}
            className="flex-1 text-center min-w-[50px]"
          >
            <StatItem {...item} />
          </motion.div>
          
          {/* Séparateur entre les items */}
          {i < items.length - 1 && (
            <motion.div
              initial={{ opacity: 0, scaleY: 0 }}
              animate={{ opacity: 1, scaleY: 1 }}
              transition={{ delay: i * 0.03 + 0.1 }}
              className="h-6 w-px bg-gradient-to-b from-transparent via-gray-200 to-transparent"
            />
          )}
        </React.Fragment>
      ))}
    </motion.div>
  );
};

export default SummaryDashboard;