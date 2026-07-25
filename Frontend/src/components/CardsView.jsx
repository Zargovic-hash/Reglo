import React from 'react';
import { motion } from 'framer-motion';
import { StatusBadge } from "./ui/componentsui";
import RegulationCard from './RegulationCard'; // 👈 ASSUREZ-VOUS D'IMPORTER LE NOUVEAU FICHIER

const CardsView = ({ groupedRegulations, isFullscreen, handleStartAudit }) => {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-10"
    >
      {Object.entries(groupedRegulations).map(([domaine, items], groupIndex) => (
        <motion.div
          key={domaine}
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: groupIndex * 0.1 }}
        >
          {/* Titre du groupe */}
          <div className="flex items-center gap-3 mb-6">
            <motion.h2 
              className="text-2xl font-bold text-gray-900"
            >
              {domaine}
            </motion.h2>
            <StatusBadge status="info" className="text-sm font-semibold">
              {items.length} {items.length > 1 ? 'éléments' : 'élément'}
            </StatusBadge>
          </div>
          
          {/* Grille de cartes */}
          <div className={`grid gap-6 ${isFullscreen 
            ? 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5' 
            : 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4'
          }`}>
            {items.map((regulation, index) => (
              <RegulationCard
                key={regulation.id}
                regulation={regulation}
                index={index}
                groupIndex={groupIndex}
                handleStartAudit={handleStartAudit}
              />
            ))}
          </div>
        </motion.div>
      ))}
    </motion.div>
  );
};

export default CardsView;