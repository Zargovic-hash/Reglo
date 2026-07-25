import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';

// --- Composants Réutilisables (Button, StatusBadge, Icons) ---
// Votre code pour Button, StatusBadge, et les Icônes est bon.
// Je le garde tel quel, mais je simplifie les styles dans le tableau lui-même.
// ... (Composants Button, StatusBadge, CheckCircleIcon, etc. inchangés) ...
const Button = ({ children, onClick, variant, size, className, ...props }) => {
  const baseStyle = "font-semibold rounded-xl transform transition-all duration-300 active:scale-95 focus:outline-none focus:ring-2 focus:ring-offset-2 shadow-sm hover:shadow-lg";
  const variants = {
    // J'ai enlevé le backdrop-blur du bouton outline pour la performance
    outline: "bg-white border-2 border-gray-200 text-gray-700 hover:border-blue-300 hover:bg-blue-50 hover:text-blue-700 focus:ring-blue-500/50",
    solid: "bg-gradient-to-r from-blue-500 to-blue-600 text-white hover:from-blue-600 hover:to-blue-700 focus:ring-blue-500/50",
    ghost: "text-gray-600 hover:bg-gray-100/70 focus:ring-gray-300/50",
  };
  const sizes = { sm: "px-4 py-2 text-xs font-medium", md: "px-6 py-2.5 text-sm font-medium" };
  return (
    <button onClick={onClick} className={`${baseStyle} ${variants[variant] || variants.solid} ${sizes[size] || sizes.md} ${className}`} {...props}>
      {children}
    </button>
  );
};

const StatusBadge = ({ children, status, className }) => {
  const baseStyle = "inline-flex items-center rounded-full px-3 py-1.5 text-xs font-bold border"; // Simplifié
  const statuses = {
    success: "bg-emerald-100 text-emerald-800 border-emerald-200",
    danger: "bg-red-100 text-red-800 border-red-200",
    warning: "bg-amber-100 text-amber-800 border-amber-200",
    neutral: "bg-gray-100 text-gray-700 border-gray-200",
    info: "bg-blue-100 text-blue-800 border-blue-200",
  };
  return (
    <span className={`${baseStyle} ${statuses[status]} ${className}`}>
      {children}
    </span>
  );
};
// ... (Icônes inchangées)
const CheckCircleIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"> <path fillRule="evenodd" d="M2.25 12c0-5.385 4.365-9.75 9.75-9.75s9.75 4.365 9.75 9.75-4.365 9.75-9.75 9.75S2.25 17.385 2.25 12Zm13.36-1.814a.75.75 0 1 0-1.22-.872l-3.236 4.536-1.636-1.636a.75.75 0 1 0-1.06 1.06l2.25 2.25a.75.75 0 0 0 1.14-.094l3.75-5.25Z" clipRule="evenodd" /> </svg> );
const AlertCircleIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"> <path fillRule="evenodd" d="M9.401 3.003c1.155-2.003 4.103-2.003 5.258 0L21.62 16.002c1.155 2.003-.346 4.5-2.62 4.5H5.002c-2.274 0-3.775-2.497-2.62-4.5L9.4 3.003ZM12 8.25a.75.75 0 0 1 .75.75v3.75a.75.75 0 0 1-1.5 0V9a.75.75 0 0 1 .75-.75Zm.002 6.75a.75.75 0 1 0 0 1.5.75.75 0 0 0 0-1.5Z" clipRule="evenodd" /> </svg> );
const TrendingUpIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"> <path fillRule="evenodd" d="M15.22 6.268a.75.75 0 0 1 .968-.432l5.942 2.28a.75.75 0 0 1 .431.97l-2.28 5.94a.75.75 0 1 1-1.4-.537l1.63-4.251-1.086.484a11.2 11.2 0 0 0-5.45 5.173.75.75 0 0 1-1.199.19L9 12.312l-6.22 6.22a.75.75 0 0 1-1.06-1.061l6.75-6.75a.75.75 0 0 1 1.06 0l3.606 3.606a12.695 12.695 0 0 1 5.68-4.973l1.086-.483-4.251-1.632a.75.75 0 0 1-.432-.97Z" clipRule="evenodd" /> </svg> );
const UserIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"> <path fillRule="evenodd" d="M7.5 6a4.5 4.5 0 1 1 9 0 4.5 4.5 0 0 1-9 0ZM3.751 20.105a8.25 8.25 0 0 1 16.498 0 .75.75 0 0 1-.437.695A18.683 18.683 0 0 1 12 22.5c-2.73 0-5.41-.608-7.812-1.7a.75.75 0 0 1-.437-.695Z" clipRule="evenodd" /> </svg> );
const CalendarIcon = (props) => ( <svg {...props} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor"> <path d="M12.75 12.75a.75.75 0 1 1-1.5 0 .75.75 0 0 1 1.5 0ZM7.5 15.75a.75.75 0 1 0 0-1.5.75.75 0 0 0 0 1.5ZM8.25 21l4.5-4.5 4.5 4.5" /> </svg> );

// --- ❌ SUPPRIMÉ: ColumnViewSelector (déplacé vers PageHeader) ---

// --- TableView Main Component ---

const TableView = ({ filteredRegulations, handleStartAudit, tableSubView }) => { // 👈 'tableSubView' en prop
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'ascending' });
  
  // --- ❌ SUPPRIMÉ: const [activeView, setActiveView] = useState('compliance');

  // ... (Logique de tri 'sortedRegulations', 'requestSort', 'getSortIndicator' INCHANGÉE) ...
  const sortedRegulations = useMemo(() => {
    return [...filteredRegulations].sort((a, b) => {
      if (!sortConfig.key) return 0;
      const aValue = a[sortConfig.key];
      const bValue = b[sortConfig.key];
      if (aValue === null || aValue === undefined) return sortConfig.direction === 'ascending' ? 1 : -1;
      if (bValue === null || bValue === undefined) return sortConfig.direction === 'ascending' ? -1 : 1;
      if (sortConfig.key === 'deadline') {
        const dateA = new Date(aValue);
        const dateB = new Date(bValue);
        if (dateA < dateB) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (dateA > dateB) return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      if (typeof aValue === 'string' && typeof bValue === 'string') {
        if (aValue.toLowerCase() < bValue.toLowerCase()) return sortConfig.direction === 'ascending' ? -1 : 1;
        if (aValue.toLowerCase() > bValue.toLowerCase()) return sortConfig.direction === 'ascending' ? 1 : -1;
      }
      return 0;
    });
  }, [filteredRegulations, sortConfig]);

  const requestSort = (key) => {
    let direction = 'ascending';
    if (sortConfig.key === key && sortConfig.direction === 'ascending') {
      direction = 'descending';
    }
    setSortConfig({ key, direction });
  };

  const getSortIndicator = (key) => {
    if (sortConfig.key !== key) return null;
    return sortConfig.direction === 'ascending' ? '▲' : '▼';
  };


  // 🌟 MODIFIÉ: Utilise 'tableSubView' (des props) au lieu de 'activeView'
  const columnVisibility = useMemo(() => {
    switch (tableSubView) { // 👈 Prop
      case 'compliance':
        return ['domaine', 'titre', 'exigence', 'conformite', 'actions'];
      case 'action_plan':
        return ['titre', 'exigence', 'prioritée', 'owner', 'deadline', 'plan_action', 'actions'];
      case 'references':
        return ['domaine', 'titre', 'lois', 'documents', 'actions'];
      case 'full':
      default:
        return ['domaine', 'titre', 'exigence', 'lois', 'documents', 'conformite', 'prioritée', 'plan_action', 'owner', 'deadline', 'actions'];
    }
  }, [tableSubView]); // 👈 Dépend de la prop

  // ... (columnConfig INCHANGÉ) ...
  const columnConfig = useMemo(() => ({
    domaine: { label: 'Domaine', sortable: true, width: 'w-40', minWidth: null },
    titre: { label: 'Titre', sortable: true, width: null, minWidth: 'min-w-[200px]' },
    exigence: { label: 'Exigence', sortable: false, width: null, minWidth: 'min-w-[400px]' },
    lois: { label: 'Références légales', sortable: false, width: null, minWidth: 'min-w-[400px]' },
    documents: { label: 'Documents légaux', sortable: false, width: null, minWidth: 'min-w-[400px]' },
    conformite: { label: 'Statut', sortable: true, width: 'w-32', minWidth: null },
    prioritée: { label: 'Priorité', sortable: true, width: 'w-32', minWidth: null },
    plan_action: { label: 'Plan d\'actions', sortable: false, width: null, minWidth: 'min-w-[300px]' },
    owner: { label: 'Propriétaire', sortable: true, width: 'w-40', minWidth: null },
    deadline: { label: 'Échéance', sortable: true, width: 'w-32', minWidth: null },
    actions: { label: 'Actions', sortable: false, width: 'w-32', minWidth: null },
  }), []);

  // 🌟 STYLES D'EN-TÊTE SIMPLIFIÉS
  const commonHeaderProps = "px-6 py-4 text-left text-xs font-bold text-gray-600 uppercase tracking-wider select-none transition-all duration-300";
  const sortableHeaderProps = "cursor-pointer hover:text-blue-600 hover:bg-gray-100";
  const commonHeaderStyle = "flex items-center space-x-2";

  return (
    <motion.div
      initial={{ opacity: 0, y: 30 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5 }}
      // 🌟 STYLE "PRO" ÉPURÉ: Fini les gradients, blurs, et ombres complexes.
      className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden"
    >
      {/* --- ❌ SUPPRIMÉ: div p-5 avec le ColumnViewSelector --- */}

      {/* Le conteneur de scroll est géré par la page, mais le scroll X est ici */}
      <div className="overflow-x-auto scrollbar-thin scrollbar-track-gray-100 scrollbar-thumb-gray-300">
        <table className="min-w-full divide-y divide-gray-200">
          {/* 🌟 EN-TÊTE ÉPURÉ */}
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              {columnVisibility.map((key) => {
                const config = columnConfig[key];
                const headerClassName = `${commonHeaderProps} ${config.width} ${config.minWidth} ${config.sortable ? sortableHeaderProps : ''}`;
                
                return (
                  <th 
                    key={key}
                    className={headerClassName} 
                    onClick={config.sortable ? () => requestSort(key) : undefined}
                  >
                    <div className={commonHeaderStyle}>
                      <span>{config.label}</span>
                      {config.sortable && (
                        <span className="text-gray-400">
                          {getSortIndicator(key)}
                        </span>
                      )}
                    </div>
                  </th>
                );
              })}
            </tr>
          </thead>
          
          {/* 🌟 CORPS DE TABLEAU ÉPURÉ */}
          <tbody className="divide-y divide-gray-100">
            {sortedRegulations.map((regulation, index) => (
              <motion.tr
                key={regulation.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: index * 0.02 }}
                // 🌟 STYLE DE LIGNE SIMPLE
                className="hover:bg-gray-50 transition-colors duration-150"
              >
                {/* ... (Toute la logique de rendu des cellules (<td>) est INCHANGÉE) ...
                  J'ai seulement supprimé les effets "group-hover" qui ajoutaient du bruit.
                */}
                
                {columnVisibility.includes('domaine') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">
                    <span title={regulation.domaine || 'Non défini'}>
                      {regulation.domaine || 'Non défini'}
                    </span>
                  </td>
                )}
                {columnVisibility.includes('titre') && (
                  <td className="px-6 py-4 text-sm text-gray-800">
                    <p className="font-semibold line-clamp-2 leading-snug" title={regulation.titre || 'Titre non défini'}>
                      {regulation.titre || 'Titre non défini'}
                    </p>
                  </td>
                )}
                {columnVisibility.includes('exigence') && (
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <p className="line-clamp-4 leading-relaxed" title={regulation.exigence || 'Aucune exigence définie'}>
                      {regulation.exigence || 'Aucune exigence définie'}
                    </p>
                  </td>
                )}
                {columnVisibility.includes('lois') && (
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <p className="line-clamp-4 leading-relaxed" title={regulation.lois || 'Aucune référence légale définie'}>
                      {regulation.lois || 'Aucune référence légale définie'}
                    </p>
                  </td>
                )}
                {columnVisibility.includes('documents') && (
                  <td className="px-6 py-4 text-sm text-gray-600">
                    <p className="line-clamp-4 leading-relaxed" title={regulation.documents || 'Aucun document légal est exigé'}>
                      {regulation.documents || 'Aucun document légal est exigé'}
                    </p>
                  </td>
                )}
                {columnVisibility.includes('conformite') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {regulation.conformite ? (
                      <StatusBadge 
                        status={regulation.conformite === 'Conforme' ? 'success' : regulation.conformite === 'Non conforme' ? 'danger' : 'warning'}
                        className="flex items-center space-x-2"
                      >
                        {regulation.conformite === 'Conforme' && <CheckCircleIcon className="h-4 w-4" />}
                        {regulation.conformite === 'Non conforme' && <AlertCircleIcon className="h-4 w-4" />}
                        <span>{regulation.conformite}</span>
                      </StatusBadge>
                    ) : (
                      <StatusBadge status="neutral" className="border-dashed flex items-center space-x-2">
                        <span className="w-2 h-2 bg-gray-500 rounded-full animate-pulse"></span>
                        <span>En attente</span>
                      </StatusBadge>
                    )}
                  </td>
                )}
                {columnVisibility.includes('prioritée') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {regulation.prioritée ? (
                      <StatusBadge 
                        status={regulation.prioritée === 'Critique' ? 'danger' : regulation.prioritée === 'Élevée' ? 'warning' : 'success'}
                        className="flex items-center space-x-2"
                      >
                        <TrendingUpIcon className="h-4 w-4" />
                        <span>{regulation.prioritée}</span>
                      </StatusBadge>
                    ) : (
                      <span className="text-gray-400 italic text-xs font-medium">Non assigné</span>
                    )}
                  </td>
                )}
                {columnVisibility.includes('plan_action') && (
                  <td className="px-6 py-4 text-sm text-gray-600">
                    {regulation.plan_action ? (
                      <p className="line-clamp-3 leading-relaxed">
                        {regulation.plan_action}
                      </p>
                    ) : (
                      <span className="text-gray-400 italic text-xs font-medium">Non défini</span>
                    )}
                  </td>
                )}
                {columnVisibility.includes('owner') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    {regulation.owner ? (
                      <StatusBadge 
                        status="neutral"
                        className="flex items-center space-x-2"
                      >
                        <UserIcon className="h-4 w-4" />
                        <span>{regulation.owner}</span>
                      </StatusBadge>
                    ) : (
                      <span className="text-gray-400 italic text-xs font-medium">Non assigné</span>
                    )}
                  </td>
                )}
                {columnVisibility.includes('deadline') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-600">
                    {regulation.deadline ? (
                      <StatusBadge 
                        status={new Date(regulation.deadline) < new Date() ? 'danger' : 'info'}
                        className="flex items-center space-x-2"
                      >
                        <CalendarIcon className="h-4 w-4" />
                        <span>{new Date(regulation.deadline).toLocaleDateString()}</span>
                      </StatusBadge>
                    ) : (
                      <span className="text-gray-400 italic text-xs font-medium">Non définie</span>
                    )}
                  </td>
                )}
                {columnVisibility.includes('actions') && (
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <Button
                      onClick={() => handleStartAudit(regulation)}
                      variant="outline"
                      size="sm"
                      className="hover:scale-105" // Simplifié
                    >
                      {regulation.conformite ? 'Modifier' : 'Auditer'}
                    </Button>
                  </td>
                )}
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
      
      {/* --- ❌ SUPPRIMÉ: Effet de bordure lumineuse --- */}
    </motion.div>
  );
};

export default TableView;