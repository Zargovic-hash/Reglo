import React, { useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { 
  FolderIcon, 
  CheckCircleIcon, 
  TrendingUpIcon, 
  UserIcon, 
  CalendarIcon, 
  FilterIcon 
} from "../icons/icon"; 
import Button from "./ui/Button";
import Label from "./ui/Label";

const AdvancedFilters = ({ 
  filters, 
  onFilterChange, 
  onResetFilters, 
  regulations,
  className = ""
}) => {
  const [open, setOpen] = useState(false);

  const uniqueValues = useMemo(() => {
    return {
      domaines: [...new Set(regulations.map(r => r.domaine).filter(Boolean))].sort(),
      statuts: [...new Set(regulations.map(r => r.conformite).filter(Boolean))],
      prioritées: [...new Set(regulations.map(r => r.prioritée).filter(Boolean))],
      owners: [...new Set(regulations.map(r => r.owner).filter(Boolean))]
    };
  }, [regulations]);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value && value !== '').length;
  }, [filters]);

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={`bg-white/90 backdrop-blur-md border border-gray-200 rounded-xl shadow-sm p-4 ${className}`}
    >
      {/* Header */}
      <div className="flex items-center justify-between mb-2">
        <button
          onClick={() => setOpen(!open)}
          className="flex items-center gap-2 text-sm font-medium text-gray-700 hover:text-blue-600 transition-colors"
        >
          <FilterIcon className="h-4 w-4 text-blue-500" />
          {open ? "Masquer les filtres" : "Afficher les filtres"}
          {activeFiltersCount > 0 && (
            <span className="ml-1 px-2 py-0.5 bg-blue-100 text-blue-600 text-xs font-semibold rounded-full">
              {activeFiltersCount}
            </span>
          )}
        </button>

        {activeFiltersCount > 0 && open && (
          <Button
            variant="outline"
            size="xs"
            onClick={onResetFilters}
            className="text-gray-600 hover:text-red-600 hover:bg-red-50 border-gray-300 text-xs px-2 py-1 rounded-md"
          >
            Réinitialiser
          </Button>
        )}
      </div>

      {/* Contenu collapsable */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ duration: 0.3 }}
            className="overflow-hidden"
          >
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 mt-3">
              {/* Domaine */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 truncate">
                  <FolderIcon className="h-3.5 w-3.5 text-blue-500 shrink-0" />
                  <span>Domaine</span>
                </Label>
                <select
                  value={filters.domaine}
                  onChange={(e) => onFilterChange('domaine', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500 bg-white"
                >
                  <option value="">Tous</option>
                  {uniqueValues.domaines.map(domaine => (
                    <option key={domaine} value={domaine}>{domaine}</option>
                  ))}
                </select>
              </div>

              {/* Statut */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 truncate">
                  <CheckCircleIcon className="h-3.5 w-3.5 text-green-500 shrink-0" />
                  <span>Statut</span>
                </Label>
                <select
                  value={filters.statut}
                  onChange={(e) => onFilterChange('statut', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-green-500/30 focus:border-green-500 bg-white"
                >
                  <option value="">Tous</option>
                  {uniqueValues.statuts.map(statut => (
                    <option key={statut} value={statut}>{statut}</option>
                  ))}
                </select>
              </div>

              {/* Priorité */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 truncate">
                  <TrendingUpIcon className="h-3.5 w-3.5 text-orange-500 shrink-0" />
                  <span>Priorité</span>
                </Label>
                <select
                  value={filters.prioritée}
                  onChange={(e) => onFilterChange('prioritée', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-orange-500/30 focus:border-orange-500 bg-white"
                >
                  <option value="">Toutes</option>
                  {uniqueValues.prioritées.map(prioritée => (
                    <option key={prioritée} value={prioritée}>{prioritée}</option>
                  ))}
                </select>
              </div>

              {/* Propriétaire */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 truncate">
                  <UserIcon className="h-3.5 w-3.5 text-purple-500 shrink-0" />
                  <span>Propriétaire</span>
                </Label>
                <select
                  value={filters.owner}
                  onChange={(e) => onFilterChange('owner', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-purple-500/30 focus:border-purple-500 bg-white"
                >
                  <option value="">Tous</option>
                  {uniqueValues.owners.map(owner => (
                    <option key={owner} value={owner}>{owner}</option>
                  ))}
                </select>
              </div>

              {/* Échéances */}
              <div className="space-y-1">
                <Label className="text-xs font-medium text-gray-600 flex items-center gap-1 truncate">
                  <CalendarIcon className="h-3.5 w-3.5 text-red-500 shrink-0" />
                  <span>Échéances</span>
                </Label>
                <select
                  value={filters.deadlineProche}
                  onChange={(e) => onFilterChange('deadlineProche', e.target.value)}
                  className="w-full px-3 py-2 text-xs border border-gray-300 rounded-md focus:ring-2 focus:ring-red-500/30 focus:border-red-500 bg-white"
                >
                  <option value="">Toutes</option>
                  <option value="7">7 jours</option>
                  <option value="30">30 jours</option>
                  <option value="90">90 jours</option>
                  <option value="expired">Échues</option>
                </select>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AdvancedFilters;
