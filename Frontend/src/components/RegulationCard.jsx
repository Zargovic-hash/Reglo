import React, { useMemo, useRef, useCallback, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Card, CardHeader, CardTitle, CardContent, Button, StatusBadge } from "./ui/componentsui";
import {
  CheckCircleIcon,
  AlertCircleIcon,
  TrendingUpIcon,
  UserIcon,
  CalendarIcon,
  DocumentIcon,
  XIcon,
} from "../icons/icon";

// Constantes pour éviter les répétitions
const ANIMATION_CONFIG = {
  initial: { opacity: 0, y: 30, scale: 0.95 },
  animate: { opacity: 1, y: 0, scale: 1 },
  whileHover: { y: -6, scale: 1.02 },
  transition: {
    type: "spring",
    stiffness: 300,
    damping: 20
  }
};

const MODAL_ANIMATION = {
  initial: { opacity: 0, scale: 0.9, y: 20 },
  animate: { 
    opacity: 1, 
    scale: 1, 
    y: 0,
    transition: {
      type: "spring",
      stiffness: 400,
      damping: 25
    }
  },
  exit: { 
    opacity: 0, 
    scale: 0.9, 
    y: 20,
    transition: { duration: 0.2 }
  }
};

const BUTTON_ANIMATION = {
  animate: { x: [0, 2, 0] },
  transition: { repeat: Infinity, duration: 1.5 }
};

// Classes CSS communes
const SECTION_CLASSES = "space-y-3";
const SECTION_TITLE_CLASSES = "font-semibold text-gray-800 text-sm flex items-center space-x-2";
const SECTION_CONTENT_CLASSES = "text-sm text-gray-700 leading-relaxed rounded-xl p-4 border border-gray-100 shadow-sm";
const BADGE_ICON_CLASSES = "h-3 w-3 mr-1";

// Sous-composant pour les sections avec contenu
const ContentSection = ({ title, content, bgColor = "bg-gradient-to-br from-gray-50 to-white", dotColor = "bg-blue-400", isExpanded = false }) => (
  <div className={SECTION_CLASSES}>
    <h4 className={SECTION_TITLE_CLASSES}>
      <span className={`w-2 h-2 ${dotColor} rounded-full shadow-sm`} />
      <span>{title}</span>
    </h4>
    <motion.div
      initial={false}
      animate={{ height: "auto" }}
      className={`${SECTION_CONTENT_CLASSES} ${bgColor} transition-all duration-200`}
    >
      <p className={isExpanded ? "" : "line-clamp-3"}>
        {content}
      </p>
    </motion.div>
  </div>
);

// Sous-composant pour les badges d'information d'audit
const AuditBadge = ({ type, value, icon: Icon }) => {
  const badgeConfig = useMemo(() => {
    switch (type) {
      case 'priority':
        const normalizedValue = value?.toLowerCase().trim();
        let status;
        if (normalizedValue?.includes('critique')) {
          status = 'danger';
        } else if (normalizedValue?.includes('élevée')) {
          status = 'warning';
        } else {
          status = 'success';
        }
        return {
          status,
          displayValue: value
        };
      case 'owner':
        return { status: 'neutral', displayValue: value };
      case 'deadline':
        return { 
          status: 'info', 
          displayValue: new Date(value).toLocaleDateString('fr-FR', {
            day: 'numeric',
            month: 'short',
            year: 'numeric'
          })
        };
      default:
        return { status: 'neutral', displayValue: value };
    }
  }, [type, value]);

  return (
    <motion.div
      whileHover={{ scale: 1.05 }}
      whileTap={{ scale: 0.95 }}
    >
      <StatusBadge status={badgeConfig.status} className="text-xs shadow-sm hover:shadow-md transition-shadow">
        {Icon && <Icon className={BADGE_ICON_CLASSES} />}
        {badgeConfig.displayValue}
      </StatusBadge>
    </motion.div>
  );
};

// Sous-composant pour le badge de conformité
const ConformityBadge = ({ conformity }) => {
  const badgeConfig = useMemo(() => {
    const normalizedConformity = conformity?.toLowerCase().trim();
    switch (normalizedConformity) {
      case 'conforme':
        return { status: 'success', icon: CheckCircleIcon };
      case 'non conforme':
      case 'nonconforme':
        return { status: 'danger', icon: AlertCircleIcon };
      case 'non applicable':
      case 'nonapplicable':
        return { status: 'info', icon: AlertCircleIcon };
      default:
        return { status: 'warning', icon: AlertCircleIcon };
    }
  }, [conformity]);

  const { status, icon: Icon } = badgeConfig;

  return (
    <motion.div
      initial={{ scale: 0, rotate: -10 }}
      animate={{ scale: 1, rotate: 0 }}
      transition={{ delay: 0.3, type: "spring", stiffness: 500 }}
      whileHover={{ scale: 1.1 }}
    >
      <StatusBadge status={status} className="flex-shrink-0 shadow-md hover:shadow-lg transition-all duration-200">
        <Icon className={BADGE_ICON_CLASSES} />
        {conformity}
      </StatusBadge>
    </motion.div>
  );
};

// Nouveau composant pour la modal en mode étendu
const ExpandedModal = ({ regulation, onClose, onStartAudit }) => {
  const modalRef = useRef(null);

  // Gestion de la fermeture avec clic à l'extérieur
  const handleBackdropClick = useCallback((e) => {
    if (modalRef.current && !modalRef.current.contains(e.target)) {
      onClose();
    }
  }, [onClose]);

 return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/30 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <motion.div
        ref={modalRef}
        {...MODAL_ANIMATION}
        className="w-full max-w-4xl max-h-[90vh] bg-white rounded-2xl shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Header de la modal */}
        <div className="flex-shrink-0 bg-white/95 backdrop-blur-sm border-b border-gray-200 p-6 flex items-center justify-between">
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="flex-1 min-w-0">
              <h2 className="text-2xl font-bold text-gray-900 mb-2 leading-tight">
                {regulation.titre || 'Titre non défini'}
              </h2>
              <div className="flex items-center space-x-2 mt-2">
                {regulation.conformite && (
                  <ConformityBadge conformity={regulation.conformite} />
                )}
                {regulation.prioritée && (
                  <AuditBadge type="priority" value={regulation.prioritée} icon={TrendingUpIcon} />
                )}
              </div>
            </div>
          </div>
          
          <motion.button
            onClick={onClose}
            className="p-2 rounded-xl bg-gray-100 hover:bg-gray-200 text-gray-600 hover:text-gray-800 transition-colors duration-200"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <XIcon className="h-5 w-5" />
          </motion.button>
        </div>

        {/* Contenu scrollable */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Section Exigence */}
          {regulation.exigence && (
            <ContentSection title="Exigence réglementaire" content={regulation.exigence} bgColor="bg-gradient-to-br from-blue-50 to-indigo-50" dotColor="bg-blue-500" isExpanded={true} />
          )}
          {/* Section Références légales */}
          {regulation.lois && (
            <ContentSection title="Références légales" content={regulation.lois} bgColor="bg-gradient-to-br from-amber-50 to-orange-50" dotColor="bg-amber-500" isExpanded={true} />
          )}
          {regulation.documents && (
            <ContentSection title="Document légales" content={regulation.documents} bgColor="bg-gradient-to-br from-amber-50 to-orange-50" dotColor="bg-amber-500" isExpanded={true} />
          )}
          {/* Section Détails d'audit complète */}
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }} className="bg-gradient-to-r from-slate-50 to-blue-50 rounded-xl p-6 border border-slate-200" > 
            <h4 className="font-semibold text-gray-800 text-lg mb-6 flex items-center space-x-2"> 
              <svg className="h-5 w-5 text-slate-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"> 
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" /> 
              </svg> 
              <span>Détails de l'audit</span> 
            </h4> 
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6"> 
              {/* Colonne gauche - Informations de base */} 
              <div className="space-y-4"> 
                {/* Priorité */} 
                <div className="bg-white/80 rounded-lg p-4 border border-slate-100"> 
                  <div className="flex items-center space-x-2 mb-2"> 
                    <TrendingUpIcon className="h-4 w-4 text-slate-600" /> 
                    <span className="font-medium text-slate-700 text-sm">Priorité</span> 
                  </div> 
                  {regulation.prioritée ? ( 
                    <AuditBadge type="priority" value={regulation.prioritée} icon={TrendingUpIcon} />
                  ) : ( 
                    <span className="text-gray-400 italic text-sm">Non définie</span>
                  )}
                </div>
                {/* Propriétaire */}
                <div className="bg-white/80 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <UserIcon className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700 text-sm">Propriétaire</span>
                  </div>
                  {regulation.owner ? (
                    <AuditBadge type="owner" value={regulation.owner} icon={UserIcon} />
                  ) : (
                    <span className="text-gray-400 italic text-sm">Non assigné</span>
                  )}
                </div>
                {/* Échéance */}
                <div className="bg-white/80 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <CalendarIcon className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700 text-sm">Échéance</span>
                  </div>
                  {regulation.deadline ? (
                    <AuditBadge type="deadline" value={regulation.deadline} icon={CalendarIcon} />
                  ) : (
                    <span className="text-gray-400 italic text-sm">Non définie</span>
                  )}
                </div>
              </div>
              {/* Colonne droite - Plan d'actions et Faisabilité */}
              <div className="space-y-4">
                {/* Faisabilité */}
                <div className="bg-white/80 rounded-lg p-4 border border-slate-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <TrendingUpIcon className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700 text-sm">Faisabilité du plan d'action</span>
                  </div>
                  {regulation.faisabilite ? (
                    <span className="text-gray-700 text-sm">{regulation.faisabilite}</span>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Non évaluée</span>
                  )}
                </div>
                {/* Plan d'actions */}
                <div className="bg-white/80 rounded-lg p-2 border border-slate-100">
                  <div className="flex items-center space-x-2 mb-2">
                    <DocumentIcon className="h-4 w-4 text-slate-600" />
                    <span className="font-medium text-slate-700 text-sm">Plan d'actions</span>
                  </div>
                  {regulation.plan_action ? (
                    <p className="text-sm text-gray-700">{regulation.plan_action}</p>
                  ) : (
                    <span className="text-gray-400 italic text-sm">Aucun plan d'actions défini</span>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
        
        {/* Footer de la modal */}
        <div className="flex-shrink-0 flex items-center justify-between bg-white/95 backdrop-blur-sm border-t border-gray-200 p-6">
          <Button
            onClick={() => onStartAudit(regulation)}
            variant="outline"
            size="sm"
            className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md group-hover:scale-105"
          >
            <span className="flex items-center justify-center space-x-2">
                <span>
                    {regulation.conformite ? "Modifier l'audit" : "Démarrer l'audit"}
                </span>
                <motion.svg
                    className="h-4 w-4"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                    {...BUTTON_ANIMATION}
                >
                    <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d={regulation.conformite
                            ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            : "M13 7l5 5m0 0l-5 5m5-5H6"
                        }
                    />
                </motion.svg>
            </span>
          </Button>
          <Button onClick={onClose}>Fermer</Button>
        </div>
      </motion.div>
    </motion.div>
  );
};

const RegulationCard = ({ regulation, handleStartAudit }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  return (
    <>
      <motion.div
        {...ANIMATION_CONFIG}
        whileHover={ANIMATION_CONFIG.whileHover}
        onClick={() => setIsExpanded(true)}
      >
        <Card className="hover:ring-2 hover:ring-blue-500/50 transition-all duration-200 cursor-pointer">
          <CardHeader>
            <CardTitle>
              {regulation.titre || "Titre non défini"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center flex-wrap gap-2">
              <StatusBadge status="neutral" className="text-xs">
                {regulation.domaine || "Non spécifié"}
              </StatusBadge>
              {regulation.conformite && (
                <ConformityBadge conformity={regulation.conformite} />
              )}
              {regulation.prioritée && (
                <AuditBadge type="priority" value={regulation.prioritée} icon={TrendingUpIcon} />
              )}
            </div>

            <ContentSection
              title="Exigence réglementaire"
              content={regulation.exigence || "Aucune exigence définie."}
              isExpanded={false}
            />
            
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2 text-sm text-gray-600">
                <UserIcon className="h-4 w-4" />
                <span>{regulation.owner || 'Non assigné'}</span>
              </div>
              
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  handleStartAudit(regulation);
                }}
                variant="outline"
                size="sm"
                className="hover:bg-blue-50 hover:border-blue-300 hover:text-blue-700 transition-all duration-200 shadow-sm hover:shadow-md group-hover:scale-105"
              >
                <span className="flex items-center justify-center space-x-2">
                  <span>
                    {regulation.conformite ? "Modifier l'audit" : "Démarrer l'audit"}
                  </span>
                  <motion.svg 
                    className="h-4 w-4" 
                    fill="none" 
                    stroke="currentColor" 
                    viewBox="0 0 24 24"
                    {...BUTTON_ANIMATION}
                  >
                    <path 
                      strokeLinecap="round" 
                      strokeLinejoin="round" 
                      strokeWidth={2} 
                      d={regulation.conformite 
                        ? "M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                        : "M13 7l5 5m0 0l-5 5m5-5H6"
                      }
                    />
                  </motion.svg>
                </span>
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Modal en mode étendu */}
      <AnimatePresence>
        {isExpanded && (
          <ExpandedModal 
            regulation={regulation} 
            onClose={() => setIsExpanded(false)} 
            onStartAudit={handleStartAudit}
          />
        )}
      </AnimatePresence>
    </>
  );
};

export default RegulationCard;