import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Eye,
  Edit2,
  Calendar,
  User,
  AlertCircle,
  CheckCircle2,
  Clock,
  Star,
  X,
  ExternalLink
} from 'lucide-react';
// Ajout de l'import manquant pour useMemo
import { useMemo } from 'react';

// Le CSV source contient encore des références non-URL (ex: "1.1") en attendant sa
// finalisation : on n'affiche un lien cliquable que pour les valeurs qui ressemblent à une URL.
const isLikelyUrl = (value) => /^https?:\/\//i.test(value?.trim() || '');
// Modal de détails d'une réglementation
const RegulationDetailModal = ({ regulation, isOpen, onClose, onEdit }) => {
  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="w-full max-w-3xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden"
        >
          {/* Header */}
          <div className="flex items-center justify-between p-6 border-b border-slate-200 bg-gradient-to-r from-blue-50 to-indigo-50">
            <div className="flex-1">
              <h2 className="text-2xl font-bold text-slate-900 mb-1">
                {regulation.titre}
              </h2>
              {regulation.sous_titre && (
                <p className="text-sm text-slate-500 mb-2">{regulation.sous_titre}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap">
                <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                  {regulation.domaine}
                </span>
                {regulation.derniere_verification_jo && (
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-slate-100 text-slate-600">
                    Vérifié au JO le {new Date(regulation.derniere_verification_jo).toLocaleDateString('fr-FR')}
                  </span>
                )}
                {regulation.conformite && (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    regulation.conformite === 'Conforme'
                      ? 'bg-emerald-100 text-emerald-700'
                      : regulation.conformite === 'Non Conforme'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {regulation.conformite}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-2 rounded-lg hover:bg-white/50 transition-colors"
            >
              <X className="h-5 w-5 text-slate-500" />
            </button>
          </div>

          {/* Content */}
          <div className="p-6 overflow-y-auto max-h-[calc(90vh-200px)] space-y-6">
            {/* Exigence */}
            {regulation.exigence && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2 flex items-center gap-2">
                  <AlertCircle className="h-4 w-4 text-blue-500" />
                  Exigence réglementaire
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {regulation.exigence}
                </p>
              </div>
            )}

            {/* Références légales */}
            {(regulation.reference_reglementaire || regulation.id_article || [regulation.lien_1, regulation.lien_2, regulation.lien_3, regulation.lien_4].some(isLikelyUrl)) && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Références légales
                </h3>
                {regulation.id_article && (
                  <span className="inline-block mb-2 px-2 py-1 rounded-md text-xs font-medium bg-indigo-100 text-indigo-700">
                    Art. {regulation.id_article}
                  </span>
                )}
                {regulation.reference_reglementaire && (
                  <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                    {regulation.reference_reglementaire}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 mt-2">
                  {[regulation.lien_1, regulation.lien_2, regulation.lien_3, regulation.lien_4]
                    .filter(isLikelyUrl)
                    .map((link, idx, arr) => (
                      <a
                        key={idx}
                        href={link}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 text-sm font-medium text-blue-600 hover:text-blue-800 hover:underline"
                      >
                        <ExternalLink className="h-3.5 w-3.5" />
                        Voir le texte réglementaire{arr.length > 1 ? ` ${idx + 1}` : ''}
                      </a>
                    ))}
                </div>
              </div>
            )}

            {/* Documents */}
            {regulation.documents_justificatif && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Documents justificatifs
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {regulation.documents_justificatif}
                </p>
              </div>
            )}

            {/* Informations d'audit */}
            <div className="grid grid-cols-2 gap-4">
              {regulation.prioritée && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Priorité</div>
                  <div className="text-sm font-medium text-slate-900">
                    {regulation.prioritée}
                  </div>
                </div>
              )}
              {regulation.owner && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Propriétaire</div>
                  <div className="text-sm font-medium text-slate-900">
                    {regulation.owner}
                  </div>
                </div>
              )}
              {regulation.deadline && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Échéance</div>
                  <div className="text-sm font-medium text-slate-900">
                    {new Date(regulation.deadline).toLocaleDateString('fr-FR')}
                  </div>
                </div>
              )}
              {regulation.faisabilite && (
                <div className="bg-slate-50 p-4 rounded-lg">
                  <div className="text-xs text-slate-600 mb-1">Faisabilité</div>
                  <div className="text-sm font-medium text-slate-900">
                    {regulation.faisabilite}
                  </div>
                </div>
              )}
            </div>

            {/* Plan d'action */}
            {regulation.plan_action && (
              <div>
                <h3 className="text-sm font-semibold text-slate-900 mb-2">
                  Plan d'actions
                </h3>
                <p className="text-sm text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-lg">
                  {regulation.plan_action}
                </p>
              </div>
            )}
          </div>

          {/* Footer */}
          <div className="flex items-center justify-end gap-3 p-6 border-t border-slate-200 bg-slate-50">
            <button
              onClick={onClose}
              className="px-4 py-2 text-sm font-medium text-slate-700 hover:text-slate-900 transition-colors"
            >
              Fermer
            </button>
            <button
              onClick={() => {
                onEdit(regulation);
                onClose();
              }}
              className="px-4 py-2 text-sm font-medium text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition-colors"
            >
              Modifier l'audit
            </button>
          </div>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
};

// Carte individuelle de réglementation
const RegulationCard = ({ regulation, index, onView, onEdit, isFavorite, onToggleFavorite }) => {
  const getStatusConfig = () => {
    if (!regulation.conformite) {
      return {
        icon: Clock,
        color: 'text-amber-600',
        bg: 'bg-amber-50',
        border: 'border-amber-200'
      };
    }

    switch (regulation.conformite) {
      case 'Conforme':
        return {
          icon: CheckCircle2,
          color: 'text-emerald-600',
          bg: 'bg-emerald-50',
          border: 'border-emerald-200'
        };
      case 'Non Conforme':
        return {
          icon: AlertCircle,
          color: 'text-red-600',
          bg: 'bg-red-50',
          border: 'border-red-200'
        };
      default:
        return {
          icon: AlertCircle,
          color: 'text-slate-600',
          bg: 'bg-slate-50',
          border: 'border-slate-200'
        };
    }
  };

  const statusConfig = getStatusConfig();
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
      whileHover={{ y: -4 }}
      className="bg-white rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 overflow-hidden group"
    >
      {/* Header de la carte */}
      <div className={`p-4 border-b border-slate-100 ${statusConfig.bg}`}>
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            <h3 className="text-sm font-semibold text-slate-900 line-clamp-2 mb-1">
              {regulation.titre || 'Sans titre'}
            </h3>
            {regulation.sous_titre && (
              <p className="text-xs text-slate-500 line-clamp-1 mb-2">{regulation.sous_titre}</p>
            )}
            <span className="inline-block px-2 py-1 rounded-md text-xs font-medium bg-white border border-slate-200 text-slate-700">
              {regulation.domaine || 'Non défini'}
            </span>
          </div>
          <StatusIcon className={`h-5 w-5 ${statusConfig.color} flex-shrink-0`} />
        </div>
      </div>

      {/* Corps de la carte */}
      <div className="p-4 space-y-3">
        {/* Exigence */}
        <p className="text-sm text-slate-600 line-clamp-3 leading-relaxed">
          {regulation.exigence || 'Aucune exigence définie'}
        </p>

        {/* Métadonnées */}
        <div className="space-y-2 pt-2 border-t border-slate-100">
          {regulation.owner && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <User className="h-3.5 w-3.5 text-slate-400" />
              <span>{regulation.owner}</span>
            </div>
          )}
          {regulation.deadline && (
            <div className="flex items-center gap-2 text-xs text-slate-600">
              <Calendar className="h-3.5 w-3.5 text-slate-400" />
              <span className={
                new Date(regulation.deadline) < new Date()
                  ? 'text-red-600 font-medium'
                  : ''
              }>
                {new Date(regulation.deadline).toLocaleDateString('fr-FR')}
              </span>
            </div>
          )}
          {regulation.prioritée && (
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-600">Priorité:</span>
              <span className={`text-xs font-medium ${
                regulation.prioritée.toLowerCase().includes('critique')
                  ? 'text-red-600'
                  : regulation.prioritée.toLowerCase().includes('élevée')
                  ? 'text-orange-600'
                  : 'text-green-600'
              }`}>
                {regulation.prioritée}
              </span>
            </div>
          )}
        </div>
      </div>

      {/* Footer avec actions */}
      <div className="px-4 py-3 bg-slate-50 border-t border-slate-100 flex items-center justify-between gap-2">
        <button
          onClick={() => onToggleFavorite(regulation.id).catch(console.error)}
          className="p-1.5 text-slate-500 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-colors"
          aria-label={isFavorite ? 'Retirer des favoris' : 'Ajouter aux favoris'}
        >
          <Star className={`h-3.5 w-3.5 ${isFavorite ? 'fill-amber-400 text-amber-500' : ''}`} />
        </button>
        <button
          onClick={() => onView(regulation)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-slate-700 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
        >
          <Eye className="h-3.5 w-3.5" />
          Voir
        </button>
        <button
          onClick={() => onEdit(regulation)}
          className="flex items-center gap-2 px-3 py-1.5 text-xs font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors"
        >
          <Edit2 className="h-3.5 w-3.5" />
          {regulation.conformite ? 'Modifier' : 'Auditer'}
        </button>
      </div>
    </motion.div>
  );
};

// Vue principale en cartes
const ModernCardsView = ({ filteredRegulations, handleStartAudit, favoriteIds, onToggleFavorite }) => {
  const [selectedRegulation, setSelectedRegulation] = useState(null);
  const [modalOpen, setModalOpen] = useState(false);

  // Grouper par domaine
  const groupedRegulations = useMemo(() => {
    return filteredRegulations.reduce((acc, reg) => {
      const domaine = reg.domaine || 'Non défini';
      if (!acc[domaine]) acc[domaine] = [];
      acc[domaine].push(reg);
      return acc;
    }, {});
  }, [filteredRegulations]);

  const handleView = (regulation) => {
    setSelectedRegulation(regulation);
    setModalOpen(true);
  };

  const handleCloseModal = () => {
    setModalOpen(false);
    setTimeout(() => setSelectedRegulation(null), 300);
  };

  return (
    <>
      <div className="space-y-8">
        {Object.entries(groupedRegulations).map(([domaine, regulations], groupIndex) => (
          <motion.div
            key={domaine}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: groupIndex * 0.1 }}
          >
            {/* En-tête du groupe */}
            <div className="flex items-center gap-3 mb-4">
              <h2 className="text-lg font-bold text-slate-900">{domaine}</h2>
              <span className="px-2.5 py-1 bg-slate-100 text-slate-700 rounded-full text-xs font-semibold">
                {regulations.length}
              </span>
            </div>

            {/* Grille de cartes */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
              {regulations.map((regulation, index) => (
                <RegulationCard
                  key={regulation.id}
                  regulation={regulation}
                  index={index}
                  onView={handleView}
                  onEdit={handleStartAudit}
                  isFavorite={favoriteIds?.has(regulation.id)}
                  onToggleFavorite={onToggleFavorite}
                />
              ))}
            </div>
          </motion.div>
        ))}

        {/* Empty state */}
        {filteredRegulations.length === 0 && (
          <div className="text-center py-12">
            <p className="text-slate-500">Aucune réglementation trouvée</p>
          </div>
        )}
      </div>

      {/* Modal de détails */}
      <RegulationDetailModal
        regulation={selectedRegulation}
        isOpen={modalOpen}
        onClose={handleCloseModal}
        onEdit={handleStartAudit}
      />
    </>
  );
};



export default ModernCardsView;
