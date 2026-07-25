import React, { useState, useEffect, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from "../components/ui/componentsui.js";
import { Card, CardContent } from "../components/ui/componentsui.js";
import { AlertCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext.jsx';
import AuditModal from '../components/AuditModal.jsx';
import SaveMessage from '../components/SaveMessage.jsx';
import ReglementationSidebar from '../components/ReglementationSidebar.jsx';
import DomainNavbar from '../components/DomainNavbar.jsx';
import ModernTableView from '../components/ModernTableView.jsx';
import ModernCardsView from '../components/ModernCardsView.jsx';

// Vues de colonnes proposées pour la vue tableau : chacune focalise sur un usage
// (lecture/jugement de conformité vs suivi du plan d'action).
const TABLE_SUB_VIEWS = [
  { id: 'compliance', label: 'Audit & conformité' },
  { id: 'action_plan', label: "Plan d'action" }
];

const ModernReglementationPage = () => {
  // États principaux
  const [regulations, setRegulations] = useState([]);
  const [loading, setLoading] = useState(true); // uniquement le tout premier chargement (plein écran)
  const [isFetching, setIsFetching] = useState(false); // recherche/filtre/page en cours (indicateur discret)
  const [error, setError] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [debouncedSearchTerm, setDebouncedSearchTerm] = useState('');
  const [viewMode, setViewMode] = useState('table');
  const [tableSubView, setTableSubView] = useState('compliance');
  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState({ totalCount: 0, totalPages: 0, limit: 50 });
  const [favoriteIds, setFavoriteIds] = useState(new Set());
  const [domaineOptions, setDomaineOptions] = useState([]);
  const [titreOptions, setTitreOptions] = useState([]);
  const [sousTitreOptions, setSousTitreOptions] = useState([]);
  const [ownerOptions, setOwnerOptions] = useState([]);
  const [searchParams] = useSearchParams();
  const [filters, setFilters] = useState({
    domaine: searchParams.get('domaine') || '',
    titre: searchParams.get('titre') || '',
    sous_titre: searchParams.get('sous_titre') || '',
    statut: searchParams.get('statut') || '',
    prioritée: searchParams.get('prioritee') || '',
    owner: searchParams.get('owner') || '',
    deadlineProche: searchParams.get('deadlineProche') || ''
  });

  // États pour l'audit
  const [auditingRegulation, setAuditingRegulation] = useState(null);
  const [showAuditModal, setShowAuditModal] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState(null);
  const [auditForm, setAuditForm] = useState({
    conformite: '',
    prioritée: '',
    faisabilite: '',
    deadline: '',
    owner: '',
    plan_action: ''
  });

  const { token } = useAuth();
  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  // Attend une pause de frappe avant de relancer la recherche (évite un appel API par caractère tapé)
  useEffect(() => {
    const timeoutId = setTimeout(() => setDebouncedSearchTerm(searchTerm.trim()), 400);
    return () => clearTimeout(timeoutId);
  }, [searchTerm]);

  // Chargement des réglementations
  useEffect(() => {
    const fetchRegulations = async () => {
      if (!token) return;

      try {
        setIsFetching(true);
        setError(null);

        const params = new URLSearchParams({ page: String(page), limit: '50' });
        if (debouncedSearchTerm) params.set('search', debouncedSearchTerm);
        if (filters.domaine) params.set('domaine', filters.domaine);
        if (filters.titre) params.set('titre', filters.titre);
        if (filters.sous_titre) params.set('sous_titre', filters.sous_titre);
        if (filters.statut) params.set('conformite', filters.statut);
        if (filters.prioritée) params.set('priorite', filters.prioritée);
        if (filters.owner) params.set('owner', filters.owner);

        if (filters.deadlineProche) {
          const today = new Date();
          const formatDate = (date) => date.toISOString().slice(0, 10);
          const addDays = (days) => new Date(today.getTime() + days * 24 * 60 * 60 * 1000);

          if (filters.deadlineProche === 'expired') {
            params.set('deadline_to', formatDate(addDays(-1)));
          } else {
            params.set('deadline_from', formatDate(today));
            params.set('deadline_to', formatDate(addDays(Number(filters.deadlineProche))));
          }
        }

        const response = await fetch(`${API_BASE}/reglementation?${params.toString()}`, {
          headers: {
            'Authorization': `Bearer ${token}`,
            'Content-Type': 'application/json'
          }
        });

        if (!response.ok) {
          throw new Error(`Erreur HTTP: ${response.status}`);
        }

        const data = await response.json();
        setRegulations(data.items || []);
        setPagination({
          totalCount: data.total_count || 0,
          totalPages: data.total_pages || 0,
          limit: data.limit || 50
        });
      } catch (err) {
        console.error('Erreur lors du chargement des données:', err);
        setError(err.message);
      } finally {
        setIsFetching(false);
        setLoading(false);
      }
    };

    fetchRegulations();
  }, [token, API_BASE, page, debouncedSearchTerm, filters]);

  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/reglementation/favorites`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger les favoris')))
      .then(data => setFavoriteIds(new Set(data.items || [])))
      .catch(error => console.error(error));
  }, [token, API_BASE]);

  // Listes complètes pour les filtres domaine/responsable (indépendantes de la pagination)
  useEffect(() => {
    if (!token) return;
    fetch(`${API_BASE}/reglementation/domaines`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger les domaines')))
      .then(rows => setDomaineOptions(rows.map(r => r.domaine).filter(Boolean)))
      .catch(error => console.error(error));

    fetch(`${API_BASE}/reglementation/owners`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger les responsables')))
      .then(rows => setOwnerOptions(rows.map(r => r.owner).filter(Boolean)))
      .catch(error => console.error(error));
  }, [token, API_BASE]);

  // Titres disponibles dans le domaine choisi (ou tous si aucun domaine sélectionné)
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filters.domaine) params.set('domaine', filters.domaine);
    fetch(`${API_BASE}/reglementation/titres?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger les titres')))
      .then(rows => setTitreOptions(rows.map(r => r.titre).filter(Boolean)))
      .catch(error => console.error(error));
  }, [token, API_BASE, filters.domaine]);

  // Sous-titres disponibles dans le domaine + titre choisis
  useEffect(() => {
    if (!token) return;
    const params = new URLSearchParams();
    if (filters.domaine) params.set('domaine', filters.domaine);
    if (filters.titre) params.set('titre', filters.titre);
    fetch(`${API_BASE}/reglementation/sous-titres?${params.toString()}`, { headers: { Authorization: `Bearer ${token}` } })
      .then(response => response.ok ? response.json() : Promise.reject(new Error('Impossible de charger les sous-titres')))
      .then(rows => setSousTitreOptions(rows.map(r => r.sous_titre).filter(Boolean)))
      .catch(error => console.error(error));
  }, [token, API_BASE, filters.domaine, filters.titre]);

  // Gestion des filtres. Changer de domaine ou de titre invalide les niveaux plus fins
  // (titre/sous-titre) qui en dépendent : on les réinitialise en cascade.
  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => {
      const next = { ...prev, [filterName]: value };
      if (filterName === 'domaine') {
        next.titre = '';
        next.sous_titre = '';
      } else if (filterName === 'titre') {
        next.sous_titre = '';
      }
      return next;
    });
    setPage(1);
  }, []);

  const handleResetFilters = useCallback(() => {
    setSearchTerm('');
    setFilters({
      domaine: '',
      titre: '',
      sous_titre: '',
      statut: '',
      prioritée: '',
      owner: '',
      deadlineProche: ''
    });
    setPage(1);
  }, []);

  const handleToggleFavorite = useCallback(async (regulationId) => {
    if (!token) return;
    const isFavorite = favoriteIds.has(regulationId);
    const response = await fetch(`${API_BASE}/reglementation/favorites/${regulationId}`, {
      method: isFavorite ? 'DELETE' : 'POST',
      headers: { Authorization: `Bearer ${token}` }
    });
    if (!response.ok) throw new Error('Impossible de mettre à jour le favori');
    setFavoriteIds(previous => {
      const next = new Set(previous);
      if (isFavorite) next.delete(regulationId); else next.add(regulationId);
      return next;
    });
  }, [token, API_BASE, favoriteIds]);

  // Gestion de l'audit
  const handleAuditInputChange = useCallback((field, value) => {
    setAuditForm(prev => ({ ...prev, [field]: value }));
  }, []);

  const handleStartAudit = useCallback((regulation) => {
    setAuditingRegulation(regulation);
    setAuditForm({
      conformite: regulation.conformite || '',
      prioritée: regulation.prioritée || '',
      faisabilite: regulation.faisabilite || '',
      deadline: regulation.deadline || '',
      owner: regulation.owner || '',
      plan_action: regulation.plan_action || ''
    });
    setShowAuditModal(true);
  }, []);

  const handleSaveAudit = useCallback(async () => {
    if (!auditingRegulation || !token) return;

    try {
      setIsSaving(true);
      setSaveMessage(null);

      const response = await fetch(`${API_BASE}/audit`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          reglementation_id: auditingRegulation.id,
          ...auditForm
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `Erreur HTTP: ${response.status}`);
      }

      setRegulations(prev =>
        prev.map(reg =>
          reg.id === auditingRegulation.id ? { ...reg, ...auditForm } : reg
        )
      );

      setSaveMessage({ type: 'success', text: 'Audit sauvegardé avec succès !' });

      setTimeout(() => {
        setShowAuditModal(false);
        setAuditingRegulation(null);
        setAuditForm({
          conformite: '',
          prioritée: '',
          faisabilite: '',
          deadline: '',
          owner: '',
          plan_action: ''
        });
        setSaveMessage(null);
      }, 1500);
    } catch (err) {
      console.error('Erreur lors de la sauvegarde de l\'audit:', err);
      setSaveMessage({ type: 'error', text: `Erreur: ${err.message}` });
    } finally {
      setIsSaving(false);
    }
  }, [auditingRegulation, token, auditForm, API_BASE]);

  const handleCloseAuditModal = useCallback(() => {
    setShowAuditModal(false);
    setAuditingRegulation(null);
    setAuditForm({
      conformite: '',
      prioritée: '',
      faisabilite: '',
      deadline: '',
      owner: '',
      plan_action: ''
    });
  }, []);

  // État de chargement
  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center space-y-6"
        >
          <LoadingSpinner size="lg" />
          <div className="space-y-2">
            <h3 className="text-lg font-semibold text-gray-900">
              Chargement des réglementations
            </h3>
            <p className="text-sm text-gray-600">Veuillez patienter...</p>
          </div>
        </motion.div>
      </div>
    );
  }

  // État d'erreur
  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <Card className="max-w-lg mx-auto shadow-xl">
            <CardContent className="text-center py-12 px-8">
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.2, type: "spring" }}
                className="w-20 h-20 bg-red-100 rounded-2xl flex items-center justify-center mx-auto mb-4"
              >
                <AlertCircle className="h-10 w-10 text-red-600" />
              </motion.div>
              <h2 className="text-2xl font-bold text-gray-900 mb-3">
                Erreur de chargement
              </h2>
              <p className="text-gray-600 mb-6 leading-relaxed">{error}</p>
              <button
                onClick={() => window.location.reload()}
                className="px-8 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors shadow-lg"
              >
                Réessayer
              </button>
            </CardContent>
          </Card>
        </motion.div>
      </div>
    );
  }

  // Interface principale
  return (
    <div className="flex h-screen overflow-hidden bg-gray-50">
      {/* Sidebar fixe */}
      <ReglementationSidebar
        searchTerm={searchTerm}
        setSearchTerm={(value) => {
          setSearchTerm(value);
          setPage(1);
        }}
        filters={filters}
        onFilterChange={handleFilterChange}
        onResetFilters={handleResetFilters}
        viewMode={viewMode}
        setViewMode={setViewMode}
        titreOptions={titreOptions}
        sousTitreOptions={sousTitreOptions}
        ownerOptions={ownerOptions}
        filteredCount={pagination.totalCount}
      />

      {/* Zone de contenu principale */}
      <main className="flex-1 overflow-auto relative">
        <DomainNavbar
          domaineOptions={domaineOptions}
          activeDomaine={filters.domaine}
          onSelect={(domaine) => handleFilterChange('domaine', domaine)}
        />
        {/* Barre de progression discrète pendant une recherche/filtre/page en arrière-plan */}
        {isFetching && (
          <div className="absolute top-0 left-0 right-0 h-0.5 bg-blue-100 z-20 overflow-hidden">
            <motion.div
              className="h-full w-1/3 bg-blue-600"
              initial={{ x: '-100%' }}
              animate={{ x: '300%' }}
              transition={{ repeat: Infinity, duration: 1, ease: 'easeInOut' }}
            />
          </div>
        )}
        <div className="p-6" aria-busy={isFetching}>
          {viewMode === 'table' && (
            <div className="mb-4 flex flex-wrap items-center gap-2">
              <span className="mr-1 text-xs font-bold text-slate-500 uppercase tracking-wider">Affichage</span>
              {TABLE_SUB_VIEWS.map(view => (
                <button
                  key={view.id}
                  type="button"
                  onClick={() => setTableSubView(view.id)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border-2 transition-all ${
                    tableSubView === view.id
                      ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                      : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  {view.label}
                </button>
              ))}
            </div>
          )}

          <AnimatePresence mode="wait">
            {viewMode === 'table' ? (
              <motion.div
                key="table"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden"
                style={{ height: 'calc(100vh - 3rem)' }}
              >
                <ModernTableView
                  filteredRegulations={regulations}
                  handleStartAudit={handleStartAudit}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={handleToggleFavorite}
                  tableSubView={tableSubView}
                />
              </motion.div>
            ) : (
              <motion.div
                key="cards"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
              >
                <ModernCardsView
                  filteredRegulations={regulations}
                  handleStartAudit={handleStartAudit}
                  favoriteIds={favoriteIds}
                  onToggleFavorite={handleToggleFavorite}
                />
              </motion.div>
            )}
          </AnimatePresence>
          <div className="mt-4 flex items-center justify-between rounded-lg border border-gray-200 bg-white px-4 py-3">
            <span className="text-sm text-gray-600">
              {pagination.totalCount} résultat{pagination.totalCount > 1 ? 's' : ''} · page {page} sur {Math.max(1, pagination.totalPages)}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setPage(current => Math.max(1, current - 1))}
                disabled={page <= 1 || isFetching}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Précédent
              </button>
              <button
                type="button"
                onClick={() => setPage(current => Math.min(pagination.totalPages, current + 1))}
                disabled={page >= pagination.totalPages || pagination.totalPages === 0 || isFetching}
                className="rounded-md border border-gray-300 px-3 py-1.5 text-sm disabled:cursor-not-allowed disabled:opacity-40"
              >
                Suivant
              </button>
            </div>
          </div>
        </div>
      </main>

      {/* Messages de sauvegarde */}
      <SaveMessage saveMessage={saveMessage} />

      {/* Modal d'audit */}
      <AuditModal
        isOpen={showAuditModal}
        regulation={auditingRegulation}
        auditForm={auditForm}
        onInputChange={handleAuditInputChange}
        onSave={handleSaveAudit}
        onClose={handleCloseAuditModal}
        isSaving={isSaving}
        saveMessage={saveMessage}
      />
    </div>
  );
};

export default ModernReglementationPage;
