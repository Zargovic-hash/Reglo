import React, { useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Maximize, Minimize } from "lucide-react";
import { Button, Input, StatusBadge } from "../components/ui/componentsui";
import { SearchIcon, XIcon, GridIcon, TableIcon } from "../icons/icon";
import { Link } from "react-router-dom";
import SummaryDashboard from "../components/SummaryDashboard"; // Inchangé
import AdvancedFilters from "../components/AdvancedFilters.jsx"; // Inchangé
import ReportButton from "../components/ReportButton.jsx"; // Inchangé

// 🌟 COPIÉ DEPUIS TABLEVIEW
// Ce composant est maintenant géré par le PageHeader
const ColumnViewSelector = ({ activeView, setActiveView }) => {
  const views = useMemo(() => [
    { id: 'compliance', name: 'Conformité' },
    { id: 'action_plan', name: 'Plan d\'Actions' },
    { id: 'references', name: 'Références' },
    { id: 'full', name: 'Vue Complète' },
  ], []);

  // Style "pro" épuré pour les boutons
  const ViewOption = ({ name, isActive, onClick }) => (
    <button
      onClick={onClick}
      className={`px-4 py-2 text-sm font-medium rounded-md transition-colors ${
        isActive 
          ? 'bg-blue-600 text-white shadow-sm' 
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {name}
    </button>
  );

  return (
    // Style "pro" épuré pour le conteneur
    <div className="flex space-x-1 p-1 bg-gray-100 rounded-lg">
      {views.map((view) => (
        <ViewOption
          key={view.id}
          name={view.name}
          isActive={activeView === view.id}
          onClick={() => setActiveView(view.id)}
        />
      ))}
    </div>
  );
};


const PageHeader = ({
  filteredRegulations,
  filters,
  searchTerm,
  setSearchTerm,
  isFullscreen,
  toggleFullscreen,
  viewMode,
  setViewMode,
  handleFilterChange,
  handleResetFilters,
  regulations,
  onReportClick,
  tableSubView, // 👈 NOUVEAU PROP
  setTableSubView // 👈 NOUVEAU PROP
}) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -20 }}
      animate={{ opacity: 1, y: 0 }}
      // L'en-tête est blanc, se détachant du fond gris de la page
      className="sticky top-0 z-40 bg-white border-b border-gray-200 shadow-sm"
    >
      <div className="max-w-full px-4 sm:px-6 py-3 space-y-3">
        
        {/* Ligne 1: Titre, Recherche & Actions Principales */}
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Section Gauche: Titre de page */}
          <div className="flex-1 min-w-0">
            <nav className="flex items-center gap-1 text-sm text-gray-500 mb-1">
              <Link to="/" className="hover:text-gray-700 hover:underline">Accueil</Link>
              <span>/</span>
              <span className="font-medium text-gray-800">Réglementations</span>
            </nav>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900 truncate">
                Réglementations
              </h1>
              {/* Compteur de résultats */}
              <motion.div 
                key={filteredRegulations.length} // Force l'animation
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                className="px-3 py-1 bg-gray-100 text-gray-700 rounded-full text-sm font-semibold"
              >
                {filteredRegulations.length}
              </motion.div>
            </div>
          </div>

          {/* Section Droite: Actions */}
          <motion.div 
            className="flex-shrink-0 flex items-center flex-wrap gap-2"
          >
            {/* Barre de recherche */}
            <div className="relative w-full sm:w-64 group">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                <SearchIcon className={`h-4 w-4 transition-colors ${searchTerm ? 'text-blue-500' : 'text-gray-400 group-hover:text-gray-500'}`} />
              </div>
              <Input
                placeholder="Rechercher..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="w-full pl-9 pr-9 py-2 text-sm" // Style simplifié
              />
              {searchTerm && (
                <motion.button
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  onClick={() => setSearchTerm('')}
                  className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-700"
                >
                  <XIcon className="h-4 w-4" />
                </motion.button>
              )}
            </div>

            {/* Bouton Rapport */}
            <ReportButton
              type="reglementation"
              filters={filters}
              size="sm"
              onClick={onReportClick}
              className="px-4 py-2 text-sm" // Style simplifié
            >
              Rapport
            </ReportButton>

            {/* Sélecteur de Vue (Cartes/Tableau) */}
            <div className="relative flex items-center bg-gray-100 rounded-lg p-1">
              <motion.div
                layoutId="activeViewMode"
                className="absolute inset-y-1 bg-white rounded-md shadow-sm"
                style={{
                  left: viewMode === 'cards' ? '0.25rem' : 'calc(50%)',
                  width: 'calc(50% - 0.25rem)'
                }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
              />
              <button
                onClick={() => setViewMode('cards')}
                className={`relative z-10 px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'cards' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <GridIcon className="h-4 w-4" />
                <span>Cartes</span>
              </button>
              <button
                onClick={() => setViewMode('table')}
                className={`relative z-10 px-3 py-1 text-sm rounded-md transition-colors flex items-center gap-2 ${viewMode === 'table' ? 'text-gray-900' : 'text-gray-600 hover:text-gray-900'}`}
              >
                <TableIcon className="h-4 w-4" />
                <span>Tableau</span>
              </button>
            </div>
            {/* Vous pouvez ajouter votre bouton Fullscreen ici */}
          </motion.div>
        </div>

        {/* Ligne 2: Filtres Avancés */}
        <div className="overflow-x-auto">
          <AdvancedFilters
            filters={filters}
            onFilterChange={handleFilterChange}
            onResetFilters={handleResetFilters}
            regulations={regulations}
          />
        </div>

        {/* Ligne 3: Dashboard & Contrôles de Vue Secondaires */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          {/* Dashboard Résumé */}
          <div className="flex-1 min-w-0">
            <SummaryDashboard regulations={filteredRegulations} />
          </div>

          {/* 🌟 LE SÉLECTEUR DE VUE EST MAINTENANT ICI 🌟 */}
          <AnimatePresence>
            {viewMode === 'table' && (
              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 20 }}
                className="flex-shrink-0"
              >
                <ColumnViewSelector 
                  activeView={tableSubView} 
                  setActiveView={setTableSubView} 
                />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </motion.div>
  );
};

export default PageHeader;