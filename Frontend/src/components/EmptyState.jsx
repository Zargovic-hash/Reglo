import React from 'react';
import { motion } from 'framer-motion';
import { Button } from "./ui/componentsui";
import { EmptyStateIcon } from "../icons/icon";

const EmptyState = ({ searchTerm, filters, handleResetFilters }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      className="text-center py-16"
    >
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay: 0.2, type: "spring" }}
        className="w-24 h-24 bg-gradient-to-br from-gray-100 to-gray-200 rounded-3xl flex items-center justify-center mx-auto mb-6"
      >
        <EmptyStateIcon className="h-16 w-16 text-gray-400" />
      </motion.div>
      <motion.h3 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.3 }}
        className="text-xl font-semibold text-gray-900 mb-3"
      >
        Aucune réglementation trouvée
      </motion.h3>
      <motion.p 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.4 }}
        className="text-gray-600 mb-6 max-w-md mx-auto leading-relaxed"
      >
        {searchTerm || Object.values(filters).some(f => f)
          ? 'Aucun résultat ne correspond à vos critères de recherche. Essayez de modifier vos filtres.'
          : 'Aucune réglementation n\'est disponible pour le moment.'
        }
      </motion.p>
      {(searchTerm || Object.values(filters).some(f => f)) && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5 }}
        >
          <Button
            variant="outline"
            onClick={handleResetFilters}
            className="px-6 py-3 border-2 border-gray-300 hover:border-blue-400 hover:text-blue-600 transition-all duration-200 shadow-sm hover:shadow-md"
          >
            Réinitialiser les filtres
          </Button>
        </motion.div>
      )}
    </motion.div>
  );
};

export default EmptyState;