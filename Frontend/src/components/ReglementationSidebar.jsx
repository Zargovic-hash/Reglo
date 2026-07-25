import React, { useMemo, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Link } from 'react-router-dom';
import {
  Search,
  Filter,
  LayoutGrid,
  Table2,
  X,
  BookOpen,
  Layers,
  CheckCircle2,
  AlertTriangle,
  User,
  Calendar,
  BarChart3,
  FileDown,
  Home,
  FileSpreadsheet,
  ChevronLeft,
  ChevronRight
} from 'lucide-react';

// Valeurs canoniques (alignées sur les options du formulaire d'audit dans AuditModal.jsx) :
// le filtrage backend fait une correspondance exacte sur ces chaînes.
const STATUT_OPTIONS = [
  { value: 'Conforme', label: 'Conforme' },
  { value: 'Non Conforme', label: 'Non Conforme' },
  { value: 'Non Applicable', label: 'Non Applicable' }
];

const PRIORITE_OPTIONS = [
  { value: '1. Critique 🔴', label: 'Critique' },
  { value: '2. Élevée 🟠', label: 'Élevée' },
  { value: '3. Modérée 🟡', label: 'Modérée' },
  { value: '4. Faible 🟢', label: 'Faible' },
  { value: '5. Amélioration ⚪', label: 'Amélioration' }
];

// Chip résumant un filtre actif, avec bouton de retrait rapide
const ActiveFilterChip = ({ label, value, onClear }) => (
  <div className="flex items-center gap-1.5 px-2.5 py-2 rounded-lg bg-blue-50 border border-blue-100">
    <span className="text-[10px] font-bold text-blue-500 uppercase tracking-wide flex-shrink-0">{label}</span>
    <span className="flex-1 min-w-0 truncate text-xs font-semibold text-blue-800" title={value}>
      {value}
    </span>
    <button
      type="button"
      onClick={onClear}
      className="flex-shrink-0 p-0.5 rounded hover:bg-blue-100 text-blue-500"
      title={`Retirer le filtre ${label.toLowerCase()}`}
    >
      <X className="h-3.5 w-3.5" />
    </button>
  </div>
);

// Groupe de puces pour un choix unique parmi une petite liste fixe (+ "Tous")
const FilterPillGroup = ({ options, value, onChange, allLabel }) => (
  <div className="grid grid-cols-2 gap-1.5">
    <button
      type="button"
      onClick={() => onChange('')}
      className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
        !value
          ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
          : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
      }`}
    >
      {allLabel}
    </button>
    {options.map(option => (
      <button
        type="button"
        key={option.value}
        onClick={() => onChange(option.value)}
        className={`px-2.5 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all truncate ${
          value === option.value
            ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
            : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
        }`}
        title={option.label}
      >
        {option.label}
      </button>
    ))}
  </div>
);

// Bouton icône rond utilisé dans le rail réduit
const RailButton = ({ onClick, title, active, activeClass, children, disabled, badge, as: Component = 'button', to }) => {
  const className = `relative flex items-center justify-center w-11 h-11 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed ${
    active
      ? activeClass || 'bg-blue-600 text-white shadow-md'
      : 'text-slate-500 hover:bg-slate-100 hover:text-blue-600'
  }`;

  const content = (
    <>
      {children}
      {badge > 0 && (
        <span className="absolute -top-1 -right-1 w-4 h-4 bg-red-500 text-white text-[9px] rounded-full flex items-center justify-center font-bold shadow-sm">
          {badge}
        </span>
      )}
    </>
  );

  if (Component === Link) {
    return (
      <Link to={to} title={title} className={className}>
        {content}
      </Link>
    );
  }

  return (
    <button type="button" onClick={onClick} disabled={disabled} title={title} className={className}>
      {content}
    </button>
  );
};

const ReglementationSidebar = ({
  searchTerm,
  setSearchTerm,
  filters,
  onFilterChange,
  onResetFilters,
  viewMode,
  setViewMode,
  titreOptions = [],
  sousTitreOptions = [],
  ownerOptions = [],
  filteredCount
}) => {
  const [isMobileOpen, setIsMobileOpen] = useState(false);
  const [collapsed, setCollapsed] = useState(false);
  const [exportFormat, setExportFormat] = useState(null);

  const activeFiltersCount = useMemo(() => {
    return Object.values(filters).filter(value => value && value !== '').length;
  }, [filters]);

  // Fonction d'export
  const handleExport = async (format) => {
    setExportFormat(format);

    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');

      // 🔧 QUICK FIX: Adapter les noms de filtres pour le backend
      // Note: prioritée, owner, deadlineProche ne fonctionnent pas encore (nécessite fix backend)
      const adaptedFilters = {
        domaine: filters.domaine,
        conformite: filters.statut,  // Backend attend 'conformite' pas 'statut'
        search: searchTerm || undefined  // Ajouter la recherche textuelle
      };

      const response = await fetch(`${API_BASE}/reports/${format}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type: 'reglementation',
          filters: adaptedFilters
        })
      });

      if (!response.ok) throw new Error('Erreur lors de l\'export');

      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;

      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const extension = format === 'pdf' ? 'pdf' : 'xlsx';
      link.download = `rapport_reglementation_${timestamp}.${extension}`;

      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Erreur export:', error);
      alert(`Erreur lors de l'export ${format.toUpperCase()}`);
    } finally {
      setExportFormat(null);
    }
  };

  return (
    <>
      {/* Mobile Toggle Button */}
      <button
        onClick={() => setIsMobileOpen(!isMobileOpen)}
        className="lg:hidden fixed bottom-6 right-6 z-50 p-3.5 bg-gradient-to-br from-blue-600 to-blue-700 text-white rounded-full shadow-xl hover:shadow-2xl hover:scale-105 transition-all duration-300"
      >
        <Filter className="h-4 w-4" />
        {activeFiltersCount > 0 && (
          <span className="absolute -top-1 -right-1 w-4.5 h-4.5 bg-red-500 text-white text-[10px] rounded-full flex items-center justify-center font-bold shadow-md">
            {activeFiltersCount}
          </span>
        )}
      </button>

      {/* Backdrop Mobile */}
      <AnimatePresence>
        {isMobileOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setIsMobileOpen(false)}
            className="lg:hidden fixed inset-0 bg-black/30 backdrop-blur-sm z-40"
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <aside
        className={`
          fixed lg:static inset-y-0 left-0 z-40
          ${collapsed ? 'w-20' : 'w-72'} bg-white border-r border-slate-200
          flex flex-col h-full overflow-hidden
          transition-transform duration-300 ease-in-out
          ${isMobileOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        `}
      >
        {collapsed ? (
          /* ==================== RAIL RÉDUIT ==================== */
          <div className="flex flex-col items-center h-full py-4 gap-2 overflow-y-auto scrollbar-thin">
            <button
              type="button"
              onClick={() => setCollapsed(false)}
              title="Déployer la barre latérale"
              className="hidden lg:flex items-center justify-center w-11 h-11 rounded-xl border border-slate-200 text-slate-500 hover:bg-slate-100 hover:text-blue-600 transition-colors mb-1"
            >
              <ChevronRight className="h-4 w-4" />
            </button>

            <RailButton as={Link} to="/" title="Accueil">
              <Home className="h-5 w-5" />
            </RailButton>

            <RailButton as={Link} to="/recap" title="Tableau de Bord" active activeClass="bg-gradient-to-br from-blue-600 to-indigo-600 text-white shadow-md">
              <BarChart3 className="h-5 w-5" />
            </RailButton>

            <div className="w-8 border-t border-slate-200 my-1" />

            <RailButton
              onClick={() => handleExport('pdf')}
              disabled={exportFormat === 'pdf'}
              title="Export PDF"
            >
              {exportFormat === 'pdf'
                ? <div className="animate-spin h-5 w-5 border-2 border-red-600 border-t-transparent rounded-full" />
                : <FileDown className="h-5 w-5 text-red-600" />}
            </RailButton>

            <RailButton
              onClick={() => handleExport('excel')}
              disabled={exportFormat === 'excel'}
              title="Export Excel"
            >
              {exportFormat === 'excel'
                ? <div className="animate-spin h-5 w-5 border-2 border-green-600 border-t-transparent rounded-full" />
                : <FileSpreadsheet className="h-5 w-5 text-green-600" />}
            </RailButton>

            <div className="w-8 border-t border-slate-200 my-1" />

            <RailButton onClick={() => setViewMode('table')} title="Vue Tableau" active={viewMode === 'table'}>
              <Table2 className="h-5 w-5" />
            </RailButton>

            <RailButton onClick={() => setViewMode('cards')} title="Vue Cartes" active={viewMode === 'cards'}>
              <LayoutGrid className="h-5 w-5" />
            </RailButton>

            <div className="w-8 border-t border-slate-200 my-1" />

            <RailButton onClick={() => setCollapsed(false)} title="Afficher la recherche et les filtres" badge={activeFiltersCount}>
              <Filter className="h-5 w-5" />
            </RailButton>
          </div>
        ) : (
          /* ==================== SIDEBAR COMPLÈTE ==================== */
          <>
            {/* Header avec Toggle Vue en haut */}
            <div className="flex-shrink-0 border-b border-slate-200 bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
              {/* Titre et compteur */}
              <div className="p-4 pb-3">
                <div className="flex items-center justify-between mb-3">
                  <div>
                    <h2 className="text-base font-bold text-slate-900 tracking-tight">Réglementations</h2>
                    <p className="text-xs text-slate-600 mt-0.5">
                      <span className="font-bold text-blue-600">{filteredCount}</span>
                      <span className="ml-1 font-medium">résultat{filteredCount > 1 ? 's' : ''}</span>
                    </p>
                  </div>

                  <div className="flex items-center gap-1.5">
                    {/* Réduire (desktop uniquement) */}
                    <button
                      type="button"
                      onClick={() => setCollapsed(true)}
                      title="Réduire la barre latérale"
                      className="hidden lg:flex p-1.5 rounded-lg border border-slate-200 bg-white/70 text-slate-500 hover:bg-white hover:text-blue-600 transition-colors"
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </button>

                    {/* Close button mobile */}
                    <button
                      onClick={() => setIsMobileOpen(false)}
                      className="lg:hidden p-1.5 hover:bg-white/60 rounded-lg transition-all duration-200"
                    >
                      <X className="h-4 w-4 text-slate-600" />
                    </button>
                  </div>
                </div>

                {/* Actions en grille 2x2 */}
                <div className="grid grid-cols-2 gap-2 mb-3">
                  {/* Accueil */}
                  <Link to="/">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex flex-col items-center justify-center gap-1.5 py-3 text-slate-600 bg-white border border-slate-200 rounded-xl hover:border-slate-300 hover:bg-slate-50 transition-all duration-200"
                    >
                      <Home className="h-4.5 w-4.5" />
                      <span className="text-[11px] font-semibold">Accueil</span>
                    </motion.button>
                  </Link>

                  {/* Statistiques */}
                  <Link to="/recap">
                    <motion.button
                      whileHover={{ scale: 1.02 }}
                      whileTap={{ scale: 0.97 }}
                      className="w-full flex flex-col items-center justify-center gap-1.5 py-3 text-blue-600 bg-white border border-blue-200 rounded-xl hover:border-blue-300 hover:bg-blue-50/50 transition-all duration-200"
                    >
                      <BarChart3 className="h-4.5 w-4.5" />
                      <span className="text-[11px] font-semibold">Tableau de Bord</span>
                    </motion.button>
                  </Link>

                  {/* Export PDF */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleExport('pdf')}
                    disabled={exportFormat === 'pdf'}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 text-red-600 bg-white border border-red-200 rounded-xl hover:border-red-300 hover:bg-red-50/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportFormat === 'pdf' ? (
                      <>
                        <div className="animate-spin h-4.5 w-4.5 border-2 border-red-600 border-t-transparent rounded-full" />
                        <span className="text-[11px] font-semibold">Export...</span>
                      </>
                    ) : (
                      <>
                        <FileDown className="h-4.5 w-4.5" />
                        <span className="text-[11px] font-semibold">PDF</span>
                      </>
                    )}
                  </motion.button>

                  {/* Export Excel */}
                  <motion.button
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.97 }}
                    onClick={() => handleExport('excel')}
                    disabled={exportFormat === 'excel'}
                    className="flex flex-col items-center justify-center gap-1.5 py-3 text-emerald-600 bg-white border border-emerald-200 rounded-xl hover:border-emerald-300 hover:bg-emerald-50/50 transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {exportFormat === 'excel' ? (
                      <>
                        <div className="animate-spin h-4.5 w-4.5 border-2 border-emerald-600 border-t-transparent rounded-full" />
                        <span className="text-[11px] font-semibold">Export...</span>
                      </>
                    ) : (
                      <>
                        <FileSpreadsheet className="h-4.5 w-4.5" />
                        <span className="text-[11px] font-semibold">Excel</span>
                      </>
                    )}
                  </motion.button>
                </div>

                {/* Toggle Vue - pastille glissante */}
                <div className="relative flex gap-1 bg-slate-100 p-1 rounded-2xl">
                  {[
                    { id: 'table', label: 'Tableau', icon: Table2 },
                    { id: 'cards', label: 'Cartes', icon: LayoutGrid }
                  ].map(({ id, label, icon: Icon }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => setViewMode(id)}
                      title={`Vue ${label}`}
                      className={`relative flex-1 flex items-center justify-center gap-1.5 px-2 py-2 rounded-xl text-xs font-semibold transition-colors duration-200 ${
                        viewMode === id ? 'text-white' : 'text-slate-600 hover:text-slate-900'
                      }`}
                    >
                      {viewMode === id && (
                        <motion.span
                          layoutId="viewModeActivePill"
                          className="absolute inset-0 bg-gradient-to-r from-blue-600 to-blue-700 rounded-xl shadow-sm"
                          transition={{ type: 'spring', bounce: 0.2, duration: 0.5 }}
                        />
                      )}
                      <span className="relative flex items-center gap-1.5">
                        <Icon className="h-3.5 w-3.5" />
                        {label}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              {/* Recherche */}
              <div className="px-4 pb-4">
                <div className="relative">
                  <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-slate-400" />
                  <input
                    type="text"
                    placeholder="Rechercher..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full pl-8 pr-8 py-2 text-xs font-medium border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all bg-white shadow-sm placeholder:text-slate-400"
                  />
                  {searchTerm && (
                    <motion.button
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      onClick={() => setSearchTerm('')}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-0.5 hover:bg-slate-100 rounded transition-colors"
                    >
                      <X className="h-3.5 w-3.5 text-slate-500" />
                    </motion.button>
                  )}
                </div>
              </div>
            </div>

            {/* Filtres - Plus compacts */}
            <div className="flex-1 overflow-y-auto scrollbar-thin">
              <div className="p-4 space-y-3.5">
                {/* Header Filtres */}
                <div className="flex items-center justify-between pb-1">
                  <div className="flex items-center gap-1.5">
                    <Filter className="h-3.5 w-3.5 text-blue-600" />
                    <h3 className="text-xs font-bold text-slate-900 uppercase tracking-wide">
                      Filtres
                    </h3>
                    {activeFiltersCount > 0 && (
                      <motion.span
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        className="px-1.5 py-0.5 text-[10px] font-bold bg-blue-600 text-white rounded-full"
                      >
                        {activeFiltersCount}
                      </motion.span>
                    )}
                  </div>

  {activeFiltersCount > 0 && (
                    <motion.button
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      onClick={onResetFilters}
                      className="text-[10px] font-bold text-red-600 hover:text-red-700 transition-colors uppercase tracking-wide"
                    >
                      Réinitialiser
                    </motion.button>
                  )}
                </div>

                {(filters.domaine || filters.titre || filters.sous_titre || filters.statut || filters.prioritée) && (
                  <div className="space-y-1.5">
                    {filters.domaine && (
                      <ActiveFilterChip label="Domaine" value={filters.domaine} onClear={() => onFilterChange('domaine', '')} />
                    )}
                    {filters.titre && (
                      <ActiveFilterChip label="Titre" value={filters.titre} onClear={() => onFilterChange('titre', '')} />
                    )}
                    {filters.sous_titre && (
                      <ActiveFilterChip label="Sous-titre" value={filters.sous_titre} onClear={() => onFilterChange('sous_titre', '')} />
                    )}
                    {filters.statut && (
                      <ActiveFilterChip label="Statut" value={filters.statut} onClear={() => onFilterChange('statut', '')} />
                    )}
                    {filters.prioritée && (
                      <ActiveFilterChip
                        label="Priorité"
                        value={PRIORITE_OPTIONS.find(o => o.value === filters.prioritée)?.label || filters.prioritée}
                        onClear={() => onFilterChange('prioritée', '')}
                      />
                    )}
                  </div>
                )}

                {/* Titre */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <BookOpen className="h-3.5 w-3.5 text-blue-500" />
                    Titre
                  </label>
                  <select
                    value={filters.titre || ''}
                    onChange={(e) => onFilterChange('titre', e.target.value)}
                    disabled={!filters.domaine}
                    title={!filters.domaine ? 'Choisissez d\'abord un domaine' : undefined}
                    className={`w-full px-2.5 py-2 text-xs font-medium border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all ${
                      filters.domaine ? 'hover:border-slate-400 cursor-pointer' : 'opacity-50 cursor-not-allowed bg-slate-50'
                    }`}
                  >
                    <option value="">{filters.domaine ? 'Tous les titres' : 'Choisissez un domaine d\'abord'}</option>
                    {titreOptions.map(titre => (
                      <option key={titre} value={titre}>{titre}</option>
                    ))}
                  </select>
                </div>

                {/* Sous-titre */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Layers className="h-3.5 w-3.5 text-blue-500" />
                    Sous-titre
                  </label>
                  <select
                    value={filters.sous_titre || ''}
                    onChange={(e) => onFilterChange('sous_titre', e.target.value)}
                    disabled={!filters.domaine}
                    title={!filters.domaine ? 'Choisissez d\'abord un domaine' : undefined}
                    className={`w-full px-2.5 py-2 text-xs font-medium border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all ${
                      filters.domaine ? 'hover:border-slate-400 cursor-pointer' : 'opacity-50 cursor-not-allowed bg-slate-50'
                    }`}
                  >
                    <option value="">{filters.domaine ? 'Tous les sous-titres' : 'Choisissez un domaine d\'abord'}</option>
                    {sousTitreOptions.map(sousTitre => (
                      <option key={sousTitre} value={sousTitre}>{sousTitre}</option>
                    ))}
                  </select>
                </div>

                {/* Statut */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                    Statut
                  </label>
                  <FilterPillGroup
                    options={STATUT_OPTIONS}
                    value={filters.statut}
                    onChange={(value) => onFilterChange('statut', value)}
                    allLabel="Tous"
                  />
                </div>

                {/* Priorité */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <AlertTriangle className="h-3.5 w-3.5 text-orange-500" />
                    Priorité
                  </label>
                  <FilterPillGroup
                    options={PRIORITE_OPTIONS}
                    value={filters.prioritée}
                    onChange={(value) => onFilterChange('prioritée', value)}
                    allLabel="Toutes"
                  />
                </div>

                {/* Propriétaire */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <User className="h-3.5 w-3.5 text-purple-500" />
                    Propriétaire
                  </label>
                  <select
                    value={filters.owner || ''}
                    onChange={(e) => onFilterChange('owner', e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-medium border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all hover:border-slate-400 cursor-pointer"
                  >
                    <option value="">Tous les propriétaires</option>
                    {ownerOptions.map(owner => (
                      <option key={owner} value={owner}>{owner}</option>
                    ))}
                  </select>
                </div>

                {/* Échéances */}
                <div className="space-y-1.5">
                  <label className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <Calendar className="h-3.5 w-3.5 text-red-500" />
                    Échéances
                  </label>
                  <select
                    value={filters.deadlineProche || ''}
                    onChange={(e) => onFilterChange('deadlineProche', e.target.value)}
                    className="w-full px-2.5 py-2 text-xs font-medium border-2 border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 bg-white transition-all hover:border-slate-400 cursor-pointer"
                  >
                    <option value="">Toutes les échéances</option>
                    <option value="7">Dans 7 jours</option>
                    <option value="30">Dans 30 jours</option>
                    <option value="90">Dans 90 jours</option>
                    <option value="expired">Échues</option>
                  </select>
                </div>
              </div>
            </div>
          </>
        )}
      </aside>
    </>
  );
};

export default ReglementationSidebar;
