import React, { useState, useEffect, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import Button from '../components/ui/Button';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import Badge from '../components/ui/Badge';
import DocumentIcon from '../icons/DocumentIcon';
import UserIcon from '../icons/UserIcon';
import CalendarIcon from '../icons/CalendarIcon';
import LoadingSpinner from '../components/ui/LoadingSpinner';
import AuditDetailsTable from '../components/AuditDetailsTable';
import ChevronDownIcon from '../icons/ChevronDownIcon';
import ChevronUpIcon from '../icons/ChevronUpIcon';
import ReportButton from '../components/ReportButton';
import CheckCircleIcon from '../icons/CheckCircleIcon';
import XCircleIcon from '../icons/XCircleIcon';
import ClockIcon from '../icons/ClockIcon';
import TableIcon from '../icons/TableIcon';
import AlertCircleIcon from '../icons/AlertCircleIcon';

// AuditTimeline remplacé par AuditCalendar (composant inline)

// ==================== COMPOSANTS UTILITAIRES ====================

const ModernKPICard = ({ title, value, subtitle, icon, bgGradient, delay = 0, onClick }) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      transition={{ delay, duration: 0.5, type: "spring", stiffness: 100 }}
      onClick={onClick}
    >
      <Card className="text-center transition-all duration-300 transform hover:scale-105 group cursor-pointer overflow-hidden relative bg-white/80 backdrop-blur-xl border-slate-200/60 shadow-xl hover:shadow-2xl">
        <div className={`absolute inset-0 bg-gradient-to-br ${bgGradient} opacity-0 group-hover:opacity-10 transition-opacity duration-300`}></div>
        <CardContent className="p-6 relative z-10">
          <div className="flex items-center justify-between mb-4">
            <div className="text-left flex-1">
              <CardTitle className="text-sm font-medium text-slate-600 mb-2">{title}</CardTitle>
              <p className={`text-3xl sm:text-4xl font-extrabold bg-gradient-to-br ${bgGradient} bg-clip-text text-transparent`}>
                {value}
              </p>
              <p className="text-xs text-slate-500 mt-1">{subtitle}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${bgGradient} flex items-center justify-center text-white shadow-lg`}>
              {icon}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};

// ==================== SECTION COLLAPSIBLE ====================

const CollapsibleSection = ({ 
  title, 
  subtitle, 
  icon, 
  children, 
  defaultOpen = false, 
  badge,
  gradient = "from-primary-500 to-primary-600"
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6"
    >
      <Card className="overflow-hidden bg-white/80 backdrop-blur-xl shadow-xl border-slate-200/60" hover={true}>
        <CardHeader
          className="cursor-pointer hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50 transition-all duration-300"
          onClick={() => setIsOpen(!isOpen)}
          withDivider={false}
        >
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${gradient} flex items-center justify-center text-white shadow-lg group-hover:scale-110 transition-transform`}>
                {icon}
              </div>
              <div>
                <CardTitle className="text-xl font-bold text-slate-900">{title}</CardTitle>
                {subtitle && <CardDescription className="mt-1">{subtitle}</CardDescription>}
              </div>
            </div>
            <div className="flex items-center gap-3">
              {badge && (
                <Badge variant="outline" className={`bg-gradient-to-r ${gradient} text-white border-none shadow-lg px-4 py-2 text-base`}>
                  {badge}
                </Badge>
              )}
              <div className="transform transition-transform duration-200">
                {isOpen ? 
                  <ChevronUpIcon className="h-6 w-6 text-primary-600" /> : 
                  <ChevronDownIcon className="h-6 w-6 text-slate-400" />
                }
              </div>
            </div>
          </div>
        </CardHeader>
        
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3, ease: "easeInOut" }}
              className="overflow-hidden"
            >
              <CardContent className="bg-gradient-to-br from-white to-slate-50/30" padding="lg">
                {children}
              </CardContent>
            </motion.div>
          )}
        </AnimatePresence>
      </Card>
    </motion.div>
  );
};

// ==================== JAUGE DE CONFORMITÉ ====================

const ConformityGauge = ({ stats }) => {
  const totalAudite = stats.conformes + stats.non_conformes + stats.non_applicables;
  const tauxConformite = totalAudite > 0 ? Math.round((stats.conformes + stats.non_applicables) / totalAudite * 100) : 0;
  const tauxCompletion = stats.total > 0 ? Math.round((totalAudite / stats.total) * 100) : 0;

  return (
    <div className="flex flex-col items-center py-8 space-y-10">

      {/* --- Jauge circulaire de conformité --- */}
      <div className="flex flex-col items-center">
        <div className="relative w-56 h-56 mb-8">
          <svg className="transform -rotate-90 w-56 h-56">
            <circle
              cx="112"
              cy="112"
              r="100"
              stroke="#E5E7EB"
              strokeWidth="20"
              fill="transparent"
            />
            <circle
              cx="112"
              cy="112"
              r="100"
              stroke="url(#gradient)"
              strokeWidth="20"
              fill="transparent"
              strokeDasharray={`${2 * Math.PI * 100}`}
              strokeDashoffset={`${2 * Math.PI * 100 * (1 - tauxConformite / 100)}`}
              strokeLinecap="round"
              className="transition-all duration-1000 ease-out"
            />
            <defs>
              <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#10B981" />
                <stop offset="100%" stopColor="#3B82F6" />
              </linearGradient>
            </defs>
          </svg>
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <p className="text-6xl font-extrabold bg-gradient-to-br from-success-500 to-primary-600 bg-clip-text text-transparent">
                {tauxConformite}%
              </p>
              <p className="text-sm text-slate-600 mt-2 font-medium">Conforme</p>
            </div>
          </div>
        </div>
        <p className="text-xs text-slate-500 font-medium -mt-4 mb-2">
          Calculé sur <span className="font-bold text-slate-700">{totalAudite}</span> éléments audités / {stats.total} total
        </p>
      </div>

      {/* --- Alerte actions en retard --- */}
      {stats.en_retard > 0 && (
        <Link
          to={`/reglementation?deadlineProche=expired`}
          className="w-full max-w-4xl flex items-center gap-4 p-4 rounded-2xl border-2 border-red-200 bg-red-50 hover:bg-red-100 hover:border-red-300 transition-all shadow-sm group"
        >
          <div className="w-11 h-11 rounded-xl bg-red-100 text-red-600 flex items-center justify-center flex-shrink-0">
            <AlertCircleIcon className="w-6 h-6" />
          </div>
          <div className="flex-1 min-w-0">
            <p className="font-bold text-red-700">
              {stats.en_retard} action{stats.en_retard > 1 ? 's' : ''} en retard
            </p>
            <p className="text-sm text-red-600">Échéance dépassée sans être conforme — action requise.</p>
          </div>
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide group-hover:underline flex-shrink-0">
            Voir →
          </span>
        </Link>
      )}

      {/* --- Compteurs par statut --- */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full max-w-4xl">
        {[
          { label: 'Conformes', value: stats.conformes, color: 'success', icon: <CheckCircleIcon className="w-5 h-5" />, statut: 'Conforme' },
          { label: 'Non conformes', value: stats.non_conformes, color: 'error', icon: <XCircleIcon className="w-5 h-5" />, statut: 'Non Conforme' },
          { label: 'Non Applicable', value: stats.non_applicables, color: 'slate', icon: <XCircleIcon className="w-5 h-5" />, statut: 'Non Applicable' },
          { label: 'En attente', value: stats.en_attente, color: 'warning', icon: <ClockIcon className="w-5 h-5" /> },
        ].map((item) => {
          const CardTag = item.statut ? Link : motion.div;
          const cardProps = item.statut
            ? { to: `/reglementation?statut=${encodeURIComponent(item.statut)}` }
            : { whileHover: { scale: 1.05 } };

          return (
            <CardTag
              key={item.label}
              {...cardProps}
              className={`text-center p-5 bg-${item.color}-50 rounded-2xl border-2 border-${item.color}-100 shadow-sm hover:shadow-md transition-all ${item.statut ? 'block cursor-pointer hover:scale-105' : ''}`}
            >
              <div className={`flex items-center justify-center gap-2 text-${item.color}-600 mb-2`}>
                {item.icon}
              </div>
              <p className={`text-3xl font-bold text-${item.color}-600`}>{item.value}</p>
              <p className="text-xs text-slate-600 mt-1 font-medium">{item.label}</p>
            </CardTag>
          );
        })}
      </div>

      {/* --- Taux de Complétion --- */}
      <div className="w-full max-w-4xl">
        <div className="bg-white rounded-2xl border-2 border-indigo-100 shadow-lg p-6">
          <div className="flex items-center justify-between mb-4">
            <div>
              <h4 className="text-lg font-bold text-slate-800">Taux de Complétion</h4>
              <p className="text-sm text-slate-500 mt-1">Éléments audités sur le total des réglementations</p>
            </div>
            <div className="text-right">
              <p className="text-4xl font-extrabold bg-gradient-to-br from-indigo-500 to-purple-600 bg-clip-text text-transparent">
                {tauxCompletion}%
              </p>
              <p className="text-xs text-slate-500 mt-1">{totalAudite} / {stats.total} audités</p>
            </div>
          </div>

          <div className="relative">
            <div className="overflow-hidden h-5 rounded-full bg-slate-200">
              <motion.div
                initial={{ width: '0%' }}
                animate={{ width: `${tauxCompletion}%` }}
                transition={{ duration: 1.5, ease: "easeInOut" }}
                className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-purple-600 shadow-lg relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
              </motion.div>
            </div>
            <div className="flex justify-between mt-2 text-xs text-slate-400 font-medium">
              <span>0%</span>
              <span>50%</span>
              <span>100%</span>
            </div>
          </div>

          <div className="grid grid-cols-3 gap-3 mt-5">
            <div className="text-center p-3 bg-indigo-50 rounded-xl border border-indigo-100">
              <p className="text-xl font-bold text-indigo-600">{totalAudite}</p>
              <p className="text-xs text-slate-500 mt-1">Audités</p>
            </div>
            <div className="text-center p-3 bg-amber-50 rounded-xl border border-amber-100">
              <p className="text-xl font-bold text-amber-600">{stats.en_attente}</p>
              <p className="text-xs text-slate-500 mt-1">En attente</p>
            </div>
            <div className="text-center p-3 bg-slate-50 rounded-xl border border-slate-100">
              <p className="text-xl font-bold text-slate-600">{stats.total}</p>
              <p className="text-xs text-slate-500 mt-1">Total</p>
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

// ==================== MATRICE D'EISENHOWER ====================

const EisenhowerMatrix = ({ allAudits }) => {
  const [selectedAction, setSelectedAction] = useState(null);

  const quadrants = useMemo(() => {
    const getImportance = (priorite) => {
      const normalizedPriority = priorite?.toLowerCase().trim();
      return normalizedPriority?.includes('critique') || normalizedPriority?.includes('élevée');
    };

    const getUrgency = (deadline, priorite) => {
      if (!deadline && priorite?.toLowerCase().includes('critique')) return true;
      if (!deadline) return false;

      const today = new Date();
      const deadlineDate = new Date(deadline);
      const daysDiff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      if (priorite?.toLowerCase().includes('critique')) return daysDiff <= 30;
      if (priorite?.toLowerCase().includes('élevée')) return daysDiff <= 21;
      return daysDiff <= 14;
    };

    const isEvaluated = (conformite) => {
      const normalizedConformite = conformite?.toLowerCase().trim();
      return normalizedConformite === 'conforme' ||
             normalizedConformite === 'non conforme' ||
             normalizedConformite === 'nonconforme' ||
             normalizedConformite === 'non applicable' ||
             normalizedConformite === 'nonapplicable';
    };

    const q1 = allAudits.filter(a => getImportance(a.prioritée) && getUrgency(a.deadline, a.prioritée));
    const q2 = allAudits.filter(a => getImportance(a.prioritée) && !getUrgency(a.deadline, a.prioritée));
    const q3 = allAudits.filter(a => !getImportance(a.prioritée) && getUrgency(a.deadline, a.prioritée));
    const q4 = allAudits.filter(a => !getImportance(a.prioritée) && !getUrgency(a.deadline, a.prioritée) && isEvaluated(a.conformite) && a.deadline);

    return [
      {
        id: 'q1',
        title: 'Important & Urgent',
        subtitle: 'À faire immédiatement',
        actions: q1,
        color: 'border-red-300 bg-gradient-to-br from-red-50 to-red-100',
        headerColor: 'text-red-700 bg-gradient-to-r from-red-100 to-red-200',
        bgGradient: 'from-red-500 to-red-600'
      },
      {
        id: 'q2',
        title: 'Important & Non Urgent',
        subtitle: 'À planifier',
        actions: q2,
        color: 'border-blue-300 bg-gradient-to-br from-blue-50 to-blue-100',
        headerColor: 'text-blue-700 bg-gradient-to-r from-blue-100 to-blue-200',
        bgGradient: 'from-blue-500 to-blue-600'
      },
      {
        id: 'q3',
        title: 'Non Important & Urgent',
        subtitle: 'À déléguer',
        actions: q3,
        color: 'border-yellow-300 bg-gradient-to-br from-yellow-50 to-yellow-100',
        headerColor: 'text-yellow-700 bg-gradient-to-r from-yellow-100 to-yellow-200',
        bgGradient: 'from-yellow-500 to-yellow-600'
      },
      {
        id: 'q4',
        title: 'Faible Priorité',
        subtitle: 'Actions de suivi ou d\'amélioration continue',
        actions: q4,
        color: 'border-green-300 bg-gradient-to-br from-green-50 to-green-100',
        headerColor: 'text-green-700 bg-gradient-to-r from-green-100 to-green-200',
        bgGradient: 'from-green-500 to-green-600'
      },
    ];
  }, [allAudits]);

  const ActionTag = ({ action }) => {
    const getPriorityColor = (priorite) => {
      const normalizedPriority = priorite?.toLowerCase().trim();
      if (normalizedPriority?.includes('critique')) return 'bg-red-100 text-red-800 border-red-200';
      if (normalizedPriority?.includes('élevée')) return 'bg-orange-100 text-orange-800 border-orange-200';
      if (normalizedPriority?.includes('modérée')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      if (normalizedPriority?.includes('faible')) return 'bg-green-100 text-green-800 border-green-200';
      return 'bg-slate-100 text-slate-800 border-slate-200';
    };

    const getStatusColor = (conformite) => {
      const normalizedConformite = conformite?.toLowerCase().trim();
      if (normalizedConformite === 'conforme') return 'bg-green-500';
      if (normalizedConformite === 'non conforme' || normalizedConformite === 'nonconforme') return 'bg-red-500';
      return 'bg-slate-400';
    };

    return (
      <motion.div
        layout
        initial={{ opacity: 0, scale: 0.8 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.8 }}
        whileHover={{ scale: 1.02, y: -2 }}
        onClick={() => setSelectedAction(action)}
        className={`p-3 rounded-xl border-2 cursor-pointer transition-all duration-200 hover:shadow-lg ${getPriorityColor(action.prioritée)}`}
      >
        <div className="flex items-start justify-between mb-2">
          <h4 className="text-sm font-semibold text-slate-800 line-clamp-2">{action.titre}</h4>
          <div className={`w-2 h-2 rounded-full flex-shrink-0 mt-1 ml-1 ${getStatusColor(action.conformite)}`}></div>
        </div>

        <div className="space-y-1">
          <p className="text-xs text-slate-600">{action.domaine}</p>
          {action.owner && <p className="text-xs text-slate-500 flex items-center gap-1">
            <UserIcon className="w-3 h-3" /> {action.owner}
          </p>}
          {action.deadline && <p className="text-xs text-slate-500 flex items-center gap-1">
            <CalendarIcon className="w-3 h-3" /> {new Date(action.deadline).toLocaleDateString('fr-FR')}
          </p>}
        </div>
      </motion.div>
    );
  };

  return (
    <>
      {/* Conteneur principal avec les labels d'axes */}
      <div className="relative">

        {/* Label axe horizontal (Urgence) */}
        <div className="flex items-center justify-center mb-3 gap-2">
          <div className="flex items-center gap-6">
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-red-500 inline-block"></span>
              <span className="text-sm font-bold text-red-600 uppercase tracking-widest">Urgent</span>
            </div>
            <div className="flex-1 h-0.5 w-24 bg-gradient-to-r from-red-400 to-slate-300 rounded-full"></div>
            <span className="text-xs text-slate-400 font-semibold uppercase tracking-widest">→ Vecteur Urgence →</span>
            <div className="flex-1 h-0.5 w-24 bg-gradient-to-r from-slate-300 to-slate-200 rounded-full"></div>
            <div className="flex items-center gap-2">
              <span className="w-3 h-3 rounded-full bg-slate-300 inline-block"></span>
              <span className="text-sm font-bold text-slate-400 uppercase tracking-widest">Non Urgent</span>
            </div>
          </div>
        </div>

        {/* Grille 2x2 avec label axe vertical (Importance) */}
        <div className="flex gap-3">

          {/* Label axe vertical (Importance) */}
          <div className="flex flex-col items-center justify-center w-8 flex-shrink-0 gap-2">
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-orange-500 inline-block"></span>
              <span
                className="text-xs font-bold text-orange-600 uppercase tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Important
              </span>
            </div>
            <div className="flex-1 w-0.5 bg-gradient-to-b from-orange-400 via-slate-300 to-slate-200 rounded-full min-h-[60px]"></div>
            <span
              className="text-xs font-semibold text-slate-400 uppercase tracking-widest"
              style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
            >
              ↑ Importance ↑
            </span>
            <div className="flex-1 w-0.5 bg-gradient-to-b from-slate-200 to-slate-100 rounded-full min-h-[60px]"></div>
            <div className="flex items-center gap-1">
              <span className="w-2 h-2 rounded-full bg-slate-300 inline-block"></span>
              <span
                className="text-xs font-bold text-slate-400 uppercase tracking-widest"
                style={{ writingMode: 'vertical-rl', transform: 'rotate(180deg)' }}
              >
                Non Important
              </span>
            </div>
          </div>

          {/* Grille 2x2 */}
          <div className="flex-1 grid grid-cols-2 gap-4">
            {quadrants.map((quadrant, index) => (
              <motion.div
                key={quadrant.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 * index }}
                className={`border-2 rounded-2xl p-4 xl:p-6 ${quadrant.color} min-h-[380px] shadow-xl hover:shadow-2xl transition-all duration-300`}
              >
                <div className={`flex items-center gap-3 mb-6 p-4 rounded-xl ${quadrant.headerColor} backdrop-blur-sm`}>
                  <div className="flex-1">
                    <h3 className="font-bold text-base xl:text-lg">{quadrant.title}</h3>
                    <p className="text-xs xl:text-sm opacity-75">{quadrant.subtitle}</p>
                  </div>
                  <Badge variant="outline" className={`bg-gradient-to-r ${quadrant.bgGradient} text-white border-none shadow-lg`}>
                    {quadrant.actions.length}
                  </Badge>
                </div>

                <div className="space-y-3 max-h-[400px] overflow-y-auto scrollbar-thin scrollbar-thumb-slate-300 scrollbar-track-transparent">
                  <AnimatePresence>
                    {quadrant.actions.length === 0 ? (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        className="text-center py-12 text-slate-500"
                      >
                        <p className="font-medium">Aucune action dans ce quadrant</p>
                        <p className="text-sm mt-2">C'est parfait pour votre productivité!</p>
                      </motion.div>
                    ) : (
                      quadrant.actions.slice(0, 10).map(action => (
                        <ActionTag key={action.id} action={action} />
                      ))
                    )}
                  </AnimatePresence>
                  {quadrant.actions.length > 10 && (
                    <motion.div className="text-center pt-4">
                      <Link
                        to="/reglementation"
                        className="text-blue-600 hover:text-blue-800 font-medium text-sm hover:underline transition-colors"
                      >
                        + {quadrant.actions.length - 10} autres actions
                      </Link>
                    </motion.div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </div>

      </div>

      {/* Modal de détails */}
      <AnimatePresence>
        {selectedAction && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4"
            onClick={() => setSelectedAction(null)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 20 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 20 }}
              className="bg-white/95 backdrop-blur-xl rounded-2xl p-6 max-w-2xl w-full shadow-2xl border border-slate-200"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="flex items-start justify-between mb-6">
                <div>
                  <h3 className="text-xl font-bold text-slate-900 mb-2">{selectedAction.titre}</h3>
                  <Badge variant="outline" className="text-xs">{selectedAction.domaine}</Badge>
                </div>
                <button
                  onClick={() => setSelectedAction(null)}
                  className="p-2 hover:bg-slate-100 rounded-xl transition-colors"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </div>

              <div className="space-y-6">
                {selectedAction.exigence && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Exigence réglementaire</p>
                    <p className="text-slate-600 bg-slate-50 p-3 rounded-lg">{selectedAction.exigence}</p>
                  </div>
                )}

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Priorité</p>
                    <Badge variant="outline" className={
                      selectedAction.prioritée?.toLowerCase().includes('critique') ? 'bg-red-100 text-red-800 border-red-300' :
                      selectedAction.prioritée?.toLowerCase().includes('élevée') ? 'bg-orange-100 text-orange-800 border-orange-300' :
                      'bg-yellow-100 text-yellow-800 border-yellow-300'
                    }>
                      {selectedAction.prioritée}
                    </Badge>
                  </div>

                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Statut</p>
                    <Badge variant="outline" className={
                      selectedAction.conformite?.toLowerCase() === 'conforme' ? 'bg-green-100 text-green-800 border-green-300' :
                      'bg-red-100 text-red-800 border-red-300'
                    }>
                      {selectedAction.conformite || 'En attente'}
                    </Badge>
                  </div>
                </div>

                {selectedAction.plan_action && (
                  <div>
                    <p className="text-sm font-semibold text-slate-700 mb-2">Plan d'action</p>
                    <p className="text-slate-600 bg-blue-50 p-3 rounded-lg">{selectedAction.plan_action}</p>
                  </div>
                )}

                <div className="flex justify-between items-center text-sm text-slate-600 pt-4 border-t">
                  {selectedAction.owner && (
                    <span className="flex items-center gap-2">
                      <UserIcon className="w-4 h-4" /> {selectedAction.owner}
                    </span>
                  )}
                  {selectedAction.deadline && (
                    <span className="flex items-center gap-2">
                      <CalendarIcon className="w-4 h-4" /> {new Date(selectedAction.deadline).toLocaleDateString('fr-FR')}
                    </span>
                  )}
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

// ==================== CALENDRIER DES AUDITS ====================

const AuditCalendar = ({ allAudits }) => {
  const today = new Date();
  const [currentYear, setCurrentYear] = useState(today.getFullYear());
  const [currentMonth, setCurrentMonth] = useState(today.getMonth());
  const [selectedDay, setSelectedDay] = useState(null);
  const [hoveredAudit, setHoveredAudit] = useState(null);

  const JOURS = ['Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam', 'Dim'];
  const MOIS = ['Janvier','Février','Mars','Avril','Mai','Juin','Juillet','Août','Septembre','Octobre','Novembre','Décembre'];

  const getCriticityStyle = (priorite, deadline) => {
    const p = priorite?.toLowerCase().trim();
    const dl = deadline ? new Date(deadline) : null;
    const daysDiff = dl ? Math.ceil((dl - today) / (1000 * 60 * 60 * 24)) : null;
    if (p?.includes('critique') || (daysDiff !== null && daysDiff <= 7))
      return { dot: 'bg-red-500', bar: 'bg-red-500', badge: 'bg-red-100 text-red-700 border-red-300', label: 'Critique', row: 'border-l-red-500 bg-red-50' };
    if (p?.includes('élevée') || (daysDiff !== null && daysDiff <= 21))
      return { dot: 'bg-orange-500', bar: 'bg-orange-500', badge: 'bg-orange-100 text-orange-700 border-orange-300', label: 'Élevée', row: 'border-l-orange-500 bg-orange-50' };
    if (p?.includes('modérée') || (daysDiff !== null && daysDiff <= 60))
      return { dot: 'bg-yellow-400', bar: 'bg-yellow-400', badge: 'bg-yellow-100 text-yellow-700 border-yellow-300', label: 'Modérée', row: 'border-l-yellow-400 bg-yellow-50' };
    return { dot: 'bg-green-500', bar: 'bg-green-500', badge: 'bg-green-100 text-green-700 border-green-300', label: 'Faible', row: 'border-l-green-500 bg-green-50' };
  };

  const auditsByDate = useMemo(() => {
    const map = {};
    allAudits.forEach(audit => {
      if (!audit.deadline) return;
      const d = new Date(audit.deadline);
      const key = `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      if (!map[key]) map[key] = [];
      map[key].push(audit);
    });
    return map;
  }, [allAudits]);

  const getDayKey = (year, month, day) =>
    `${year}-${String(month+1).padStart(2,'0')}-${String(day).padStart(2,'0')}`;

  const firstDayOfMonth = new Date(currentYear, currentMonth, 1);
  const daysInMonth = new Date(currentYear, currentMonth + 1, 0).getDate();
  let startOffset = firstDayOfMonth.getDay() - 1;
  if (startOffset < 0) startOffset = 6;

  const prevMonth = () => { if (currentMonth === 0) { setCurrentMonth(11); setCurrentYear(y => y-1); } else setCurrentMonth(m => m-1); setSelectedDay(null); };
  const nextMonth = () => { if (currentMonth === 11) { setCurrentMonth(0); setCurrentYear(y => y+1); } else setCurrentMonth(m => m+1); setSelectedDay(null); };
  const goToday = () => { setCurrentMonth(today.getMonth()); setCurrentYear(today.getFullYear()); setSelectedDay(null); };

  const selectedKey = selectedDay ? getDayKey(currentYear, currentMonth, selectedDay) : null;
  const selectedAudits = selectedKey ? (auditsByDate[selectedKey] || []) : [];

  const monthAuditsCount = Object.entries(auditsByDate)
    .filter(([key]) => key.startsWith(`${currentYear}-${String(currentMonth+1).padStart(2,'0')}`))
    .reduce((acc, [, arr]) => acc + arr.length, 0);

  return (
    <div className="space-y-5">
      {/* Navigation */}
      <div className="flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3">
          <button onClick={prevMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <h3 className="text-xl font-bold text-slate-800 min-w-[180px] text-center">{MOIS[currentMonth]} {currentYear}</h3>
          <button onClick={nextMonth} className="w-9 h-9 rounded-xl bg-white border border-slate-200 shadow-sm flex items-center justify-center hover:bg-slate-50 transition-all">
            <svg className="w-4 h-4 text-slate-600" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" /></svg>
          </button>
          <button onClick={goToday} className="px-4 py-1.5 rounded-xl text-sm font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow-sm hover:shadow-md transition-all">Aujourd'hui</button>
        </div>
        <div className="flex items-center gap-3 text-xs flex-wrap">
          {[
            { dot: 'bg-red-500', label: 'Critique' },
            { dot: 'bg-orange-500', label: 'Élevée' },
            { dot: 'bg-yellow-400', label: 'Modérée' },
            { dot: 'bg-green-500', label: 'Faible' },
          ].map(l => (
            <span key={l.label} className="flex items-center gap-1.5 font-medium text-slate-600">
              <span className={`w-2.5 h-2.5 rounded-full ${l.dot}`}></span>{l.label}
            </span>
          ))}
          {monthAuditsCount > 0 && (
            <span className="ml-1 px-3 py-1 rounded-full bg-blue-100 text-blue-700 font-bold text-xs">
              {monthAuditsCount} échéance{monthAuditsCount > 1 ? 's' : ''} ce mois
            </span>
          )}
        </div>
      </div>

      {/* Grille */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-lg overflow-hidden">
        <div className="grid grid-cols-7 border-b border-slate-100 bg-slate-50">
          {JOURS.map(j => (
            <div key={j} className="py-3 text-center text-xs font-bold text-slate-500 uppercase tracking-wider">{j}</div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {Array.from({ length: startOffset }).map((_, i) => (
            <div key={`e-${i}`} className="min-h-[110px] border-b border-r border-slate-100 bg-slate-50/30" />
          ))}

          {Array.from({ length: daysInMonth }, (_, i) => i + 1).map(day => {
            const key = getDayKey(currentYear, currentMonth, day);
            const dayAudits = auditsByDate[key] || [];
            const isToday = day === today.getDate() && currentMonth === today.getMonth() && currentYear === today.getFullYear();
            const isSelected = selectedDay === day;
            const isPast = new Date(currentYear, currentMonth, day) < new Date(today.getFullYear(), today.getMonth(), today.getDate());

            return (
              <div
                key={day}
                onClick={() => setSelectedDay(isSelected ? null : day)}
                className={`min-h-[110px] border-b border-r border-slate-100 p-2 cursor-pointer transition-all duration-150 relative group
                  ${isSelected ? 'bg-blue-50 ring-2 ring-inset ring-blue-400' : 'hover:bg-slate-50'}
                  ${isPast && !isToday ? 'opacity-80' : ''}
                `}
              >
                {/* Numéro */}
                <div className={`w-7 h-7 flex items-center justify-center rounded-full text-sm font-bold mb-1.5
                  ${isToday ? 'bg-gradient-to-br from-blue-500 to-indigo-600 text-white shadow-md' : 'text-slate-700'}
                  ${isSelected && !isToday ? 'bg-blue-100 text-blue-700' : ''}
                `}>
                  {day}
                </div>

                {/* Actions dans la cellule */}
                {dayAudits.length > 0 && (
                  <div className="space-y-1">
                    {dayAudits.slice(0, 3).map((audit, idx) => {
                      const crit = getCriticityStyle(audit.prioritée, audit.deadline);
                      return (
                        <div
                          key={idx}
                          className={`relative flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs border-l-2 ${crit.row} border border-slate-200/60 group/item`}
                          onMouseEnter={() => setHoveredAudit({ audit, day, key: `${day}-${idx}` })}
                          onMouseLeave={() => setHoveredAudit(null)}
                        >
                          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${crit.dot}`}></span>
                          <div className="flex-1 min-w-0">
                            <p className="truncate font-semibold text-slate-800 leading-tight">{audit.titre}</p>
                            {audit.owner && (
                              <p className="truncate text-slate-500 text-xs leading-tight flex items-center gap-0.5">
                                <UserIcon className="w-2.5 h-2.5 flex-shrink-0" />{audit.owner}
                              </p>
                            )}
                          </div>
                          {/* Tooltip au survol */}
                          <div className="absolute bottom-full left-0 mb-1 z-50 hidden group-hover/item:block w-64 pointer-events-none">
                            <div className="bg-slate-900 text-white rounded-xl p-3 shadow-2xl text-xs space-y-2">
                              <p className="font-bold text-sm leading-snug">{audit.titre}</p>
                              {audit.owner && (
                                <p className="flex items-center gap-1.5 text-slate-300">
                                  <UserIcon className="w-3 h-3" />{audit.owner}
                                </p>
                              )}
                              <span className={`inline-block px-2 py-0.5 rounded-full text-xs font-bold border ${crit.badge}`}>{crit.label}</span>
                              {audit.plan_action && (
                                <div className="border-t border-slate-700 pt-2">
                                  <p className="text-slate-400 text-xs mb-1 uppercase tracking-wide">Plan d'action</p>
                                  <p className="text-slate-200 line-clamp-3">{audit.plan_action}</p>
                                </div>
                              )}
                            </div>
                            <div className="w-2 h-2 bg-slate-900 rotate-45 ml-3 -mt-1"></div>
                          </div>
                        </div>
                      );
                    })}
                    {dayAudits.length > 3 && (
                      <div className="text-xs text-blue-600 font-bold pl-1">+{dayAudits.length - 3} autres</div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Panneau détail jour cliqué */}
      <AnimatePresence>
        {selectedDay && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="bg-white rounded-2xl border border-slate-200 shadow-xl p-6"
          >
            <div className="flex items-center justify-between mb-5">
              <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-blue-500" />
                {selectedDay} {MOIS[currentMonth]} {currentYear}
              </h4>
              <button onClick={() => setSelectedDay(null)} className="p-1.5 hover:bg-slate-100 rounded-xl transition-colors">
                <XCircleIcon className="w-5 h-5 text-slate-400" />
              </button>
            </div>

            {selectedAudits.length === 0 ? (
              <p className="text-slate-500 text-sm text-center py-6">Aucune échéance ce jour.</p>
            ) : (
              <div className="space-y-3">
                {selectedAudits.map((audit, idx) => {
                  const crit = getCriticityStyle(audit.prioritée, audit.deadline);
                  return (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: idx * 0.05 }}
                      className={`p-4 rounded-xl border-l-4 border border-slate-200 ${crit.row}`}
                    >
                      <div className="flex items-start justify-between gap-3 mb-3">
                        <div className="flex items-center gap-2">
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 ${crit.dot}`}></span>
                          <p className="font-bold text-slate-800 text-sm">{audit.titre}</p>
                        </div>
                        <span className={`text-xs px-2 py-0.5 rounded-full font-bold border flex-shrink-0 ${crit.badge}`}>{crit.label}</span>
                      </div>
                      <div className="space-y-2 pl-4">
                        {audit.owner && (
                          <div className="flex items-center gap-1.5 text-sm">
                            <UserIcon className="w-4 h-4 text-indigo-500" />
                            <span className="font-semibold text-indigo-700">{audit.owner}</span>
                          </div>
                        )}
                        {audit.plan_action ? (
                          <div>
                            <p className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1">Plan d'action</p>
                            <p className="text-sm text-slate-700 bg-white/80 rounded-lg p-2 border border-slate-200">{audit.plan_action}</p>
                          </div>
                        ) : (
                          <p className="text-xs text-slate-400 italic">Aucun plan d'action défini</p>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};


// ==================== GESTION D'ÉQUIPE ====================

const TeamManagement = ({ allAudits }) => {
  const [expandedOwner, setExpandedOwner] = useState(null);

  const getCriticalityStyle = (priorite, deadline) => {
    const p = priorite?.toLowerCase().trim();
    const today = new Date();
    const dl = deadline ? new Date(deadline) : null;
    const daysDiff = dl ? Math.ceil((dl - today) / (1000 * 60 * 60 * 24)) : null;

    if (p?.includes('critique') || (daysDiff !== null && daysDiff <= 7))
      return { label: 'Critique', bg: 'bg-red-100', text: 'text-red-700', border: 'border-red-300', dot: 'bg-red-500' };
    if (p?.includes('élevée') || (daysDiff !== null && daysDiff <= 21))
      return { label: 'Élevée', bg: 'bg-orange-100', text: 'text-orange-700', border: 'border-orange-300', dot: 'bg-orange-500' };
    if (p?.includes('modérée') || (daysDiff !== null && daysDiff <= 60))
      return { label: 'Modérée', bg: 'bg-yellow-100', text: 'text-yellow-700', border: 'border-yellow-300', dot: 'bg-yellow-400' };
    return { label: 'Faible', bg: 'bg-green-100', text: 'text-green-700', border: 'border-green-300', dot: 'bg-green-500' };
  };

  const getConformiteBadge = (conformite) => {
    const c = conformite?.toLowerCase().trim();
    if (c === 'conforme') return 'bg-green-100 text-green-700 border-green-200';
    if (c === 'non conforme' || c === 'nonconforme') return 'bg-red-100 text-red-700 border-red-200';
    if (c === 'non applicable' || c === 'nonapplicable') return 'bg-slate-100 text-slate-600 border-slate-200';
    return 'bg-amber-100 text-amber-700 border-amber-200';
  };

  const ownerData = useMemo(() => {
    const map = {};
    allAudits.forEach(audit => {
      if (!audit.owner) return;
      const key = audit.owner.trim().toLowerCase();
      if (!map[key]) map[key] = { displayName: audit.owner.trim(), actions: [] };
      map[key].actions.push(audit);
    });

    return Object.values(map).map(owner => ({
      ...owner,
      // Tri chronologique : deadline définie d'abord (proche → lointaine), sans deadline à la fin
      actions: [...owner.actions].sort((a, b) => {
        if (!a.deadline && !b.deadline) return 0;
        if (!a.deadline) return 1;
        if (!b.deadline) return -1;
        return new Date(a.deadline) - new Date(b.deadline);
      }),
    })).sort((a, b) => b.actions.length - a.actions.length);
  }, [allAudits]);

  return (
    <div className="space-y-4">
      {ownerData.map((owner, index) => {
        const isExpanded = expandedOwner === owner.displayName;
        const critiques = owner.actions.filter(a => {
          const s = getCriticalityStyle(a.prioritée, a.deadline);
          return s.label === 'Critique';
        }).length;

        return (
          <motion.div
            key={owner.displayName}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.06 }}
            className="bg-white/90 backdrop-blur-xl rounded-2xl border border-slate-200/70 shadow-lg overflow-hidden"
          >
            {/* En-tête owner cliquable */}
            <div
              className="flex items-center gap-4 p-5 cursor-pointer hover:bg-slate-50/80 transition-colors"
              onClick={() => setExpandedOwner(isExpanded ? null : owner.displayName)}
            >
              <div className="w-12 h-12 rounded-full bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center text-white font-bold text-lg shadow-md flex-shrink-0">
                {owner.displayName.charAt(0).toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <h4 className="font-bold text-slate-900 text-base">{owner.displayName}</h4>
                <p className="text-sm text-slate-500">{owner.actions.length} action{owner.actions.length > 1 ? 's' : ''}</p>
              </div>
              <div className="flex items-center gap-3 flex-shrink-0">
                {critiques > 0 && (
                  <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-red-100 text-red-700 text-xs font-bold border border-red-200">
                    <span className="w-2 h-2 rounded-full bg-red-500"></span>
                    {critiques} critique{critiques > 1 ? 's' : ''}
                  </span>
                )}
                <div className={`transition-transform duration-200 ${isExpanded ? 'rotate-180' : ''}`}>
                  <ChevronDownIcon className="w-5 h-5 text-slate-400" />
                </div>
              </div>
            </div>

            {/* Liste des actions */}
            <AnimatePresence>
              {isExpanded && (
                <motion.div
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.25, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="border-t border-slate-100 px-5 pb-5 pt-3 space-y-2">
                    {owner.actions.map((action, idx) => {
                      const crit = getCriticalityStyle(action.prioritée, action.deadline);
                      const today = new Date();
                      const dl = action.deadline ? new Date(action.deadline) : null;
                      const daysDiff = dl ? Math.ceil((dl - today) / (1000 * 60 * 60 * 24)) : null;

                      return (
                        <motion.div
                          key={idx}
                          initial={{ opacity: 0, x: -8 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: idx * 0.04 }}
                          className={`flex items-start gap-3 p-3 rounded-xl border ${crit.bg} ${crit.border}`}
                        >
                          {/* Dot criticité */}
                          <span className={`w-2.5 h-2.5 rounded-full flex-shrink-0 mt-1.5 ${crit.dot}`}></span>

                          {/* Contenu */}
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-semibold text-slate-800 leading-snug">{action.titre}</p>
                            {action.domaine && <p className="text-xs text-slate-500 mt-0.5">{action.domaine}</p>}
                          </div>

                          {/* Badges droite */}
                          <div className="flex flex-col items-end gap-1 flex-shrink-0">
                            {/* Criticité */}
                            <span className={`text-xs px-2 py-0.5 rounded-full font-bold border ${crit.bg} ${crit.text} ${crit.border}`}>
                              {crit.label}
                            </span>
                            {/* Conformité */}
                            <span className={`text-xs px-2 py-0.5 rounded-full border font-medium ${getConformiteBadge(action.conformite)}`}>
                              {action.conformite || 'En attente'}
                            </span>
                            {/* Deadline */}
                            {dl && (
                              <span className={`text-xs flex items-center gap-1 font-medium ${
                                daysDiff < 0 ? 'text-red-600' : daysDiff <= 7 ? 'text-orange-600' : 'text-slate-500'
                              }`}>
                                <CalendarIcon className="w-3 h-3" />
                                {daysDiff < 0
                                  ? `Expiré (${Math.abs(daysDiff)}j)`
                                  : daysDiff === 0
                                  ? "Aujourd'hui"
                                  : `J-${daysDiff}`}
                              </span>
                            )}
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}
    </div>
  );
};

// ==================== COMPOSANT PRINCIPAL ====================

const RecapPage = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    conformes: 0,
    non_conformes: 0,
    non_applicables: 0,
    en_attente: 0,
    en_retard: 0,
    domaines: {},
    priorites: {},
    owners: {}
  });
  const [allAudits, setAllAudits] = useState([]);
  const [deadlines, setDeadlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  const getPriorityLabel = (priority) => {
    const normalizedPriority = priority?.toLowerCase().trim();
    if (!normalizedPriority) return 'Non définie';
    if (normalizedPriority.includes('critique')) return '1. Critique 🔴';
    if (normalizedPriority.includes('élevée')) return '2. Élevée 🟠';
    if (normalizedPriority.includes('modérée')) return '3. Modérée 🟡';
    if (normalizedPriority.includes('faible')) return '4. Faible 🟢';
    if (normalizedPriority.includes('amélioration')) return '5. Amélioration ⚪';
    return 'Non définie';
  };

  // Fonction pour calculer le nombre total d'actions dans la matrice d'Eisenhower
  const calculateEisenhowerActionsCount = useMemo(() => {
    const getImportance = (priorite) => {
      const normalizedPriority = priorite?.toLowerCase().trim();
      return normalizedPriority?.includes('critique') || normalizedPriority?.includes('élevée');
    };

    const getUrgency = (deadline, priorite) => {
      if (!deadline && priorite?.toLowerCase().includes('critique')) return true;
      if (!deadline) return false;

      const today = new Date();
      const deadlineDate = new Date(deadline);
      const daysDiff = Math.ceil((deadlineDate - today) / (1000 * 60 * 60 * 24));

      if (priorite?.toLowerCase().includes('critique')) return daysDiff <= 30;
      if (priorite?.toLowerCase().includes('élevée')) return daysDiff <= 21;
      return daysDiff <= 14;
    };

    const isEvaluated = (conformite) => {
      const normalizedConformite = conformite?.toLowerCase().trim();
      return normalizedConformite === 'conforme' ||
             normalizedConformite === 'non conforme' ||
             normalizedConformite === 'nonconforme' ||
             normalizedConformite === 'non applicable' ||
             normalizedConformite === 'nonapplicable';
    };

    const q1 = allAudits.filter(a => getImportance(a.prioritée) && getUrgency(a.deadline, a.prioritée));
    const q2 = allAudits.filter(a => getImportance(a.prioritée) && !getUrgency(a.deadline, a.prioritée));
    const q3 = allAudits.filter(a => !getImportance(a.prioritée) && getUrgency(a.deadline, a.prioritée));
    const q4 = allAudits.filter(a => !getImportance(a.prioritée) && !getUrgency(a.deadline, a.prioritée) && isEvaluated(a.conformite) && a.deadline);

    return q1.length + q2.length + q3.length + q4.length;
  }, [allAudits]);

useEffect(() => {
  if (!token) {
    setLoading(false);
    return;
  }

  const fetchStats = async () => {
    try {
      // Le backend pagine (100 éléments max par page) : il faut parcourir toutes les
      // pages pour que les statistiques portent sur l'intégralité des réglementations,
      // pas seulement les 50/100 premières.
      const regs = [];
      let page = 1;
      let totalPages = 1;

      do {
        const response = await fetch(`${API_BASE}/reglementation?page=${page}&limit=100`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (!response.ok) {
          console.error('Erreur API reglementation, status:', response.status);
          setLoading(false);
          return;
        }

        const payload = await response.json();
        // Normaliser : backend -> { items: [...], total_count, total_pages, ... }
        const items = Array.isArray(payload) ? payload : (payload.items || []);
        regs.push(...items);
        totalPages = Array.isArray(payload) ? 1 : (payload.total_pages || 1);
        page++;
      } while (page <= totalPages);

      setAllAudits(regs);

      let conformes = 0;
      let non_conformes = 0;
      let non_applicables = 0;
      let en_attente = 0;
      let en_retard = 0;
      const priorites = {};
      const domaines = {};
      const owners = {};

      const today = new Date();
      today.setHours(0, 0, 0, 0);

      regs.forEach(regulation => {
        const conformite = regulation.conformite?.toLowerCase().trim();

        if (conformite === 'conforme') {
          conformes++;
        } else if (conformite === 'non conforme' || conformite === 'nonconforme') {
          non_conformes++;
        } else if (conformite === 'non applicable' || conformite === 'nonapplicable') {
          non_applicables++;
        } else {
          en_attente++;
        }

        const prioriteLabel = getPriorityLabel(regulation.prioritée);
        priorites[prioriteLabel] = (priorites[prioriteLabel] || 0) + 1;

        if (regulation.domaine) {
          domaines[regulation.domaine] = (domaines[regulation.domaine] || 0) + 1;
        }

        if (regulation.owner) {
          owners[regulation.owner] = (owners[regulation.owner] || 0) + 1;
        }

        // Une échéance dépassée sur un élément déjà "Conforme" n'est pas un retard actif
        // (même règle que le backend pour /api/dashboard/stats : conformite != 'Conforme').
        if (regulation.deadline && conformite !== 'conforme') {
          const deadlineDate = new Date(regulation.deadline);
          deadlineDate.setHours(0, 0, 0, 0);
          if (deadlineDate < today) {
            en_retard++;
          }
        }
      });

      const deadlinesProches = regs
        .filter(regulation => {
          if (!regulation.deadline) return false;
          if (regulation.conformite?.toLowerCase().trim() === 'conforme') return false;
          const deadlineDate = new Date(regulation.deadline);
          const thirtyDaysFromNow = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);
          return deadlineDate > today && deadlineDate <= thirtyDaysFromNow;
        })
        .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
        .slice(0, 10);

      setStats({
        total: regs.length,
        conformes,
        non_conformes,
        non_applicables,
        en_attente,
        en_retard,
        priorites,
        domaines,
        owners
      });

      setDeadlines(deadlinesProches);

    } catch (error) {
      console.error("Erreur de l'API :", error);
    } finally {
      setLoading(false);
    }
  };

  fetchStats();
}, [token]);
  const nonConformesAudits = allAudits.filter(a =>
    a.conformite?.toLowerCase().trim() === 'non conforme' ||
    a.conformite?.toLowerCase().trim() === 'nonconforme'
  );
  const planActionAudits = allAudits.filter(a => a.plan_action?.trim());

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
        <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-center">
          <LoadingSpinner size="xl" text="Chargement du tableau de bord..." variant="primary" />
        </motion.div>
      </div>
    );
  }

  const totalAudite = stats.conformes + stats.non_conformes + stats.non_applicables;
  const conformitePct = totalAudite > 0 ? Math.round(((stats.conformes + stats.non_applicables) / totalAudite) * 100) : 0;

  const NAV_TABS = [
    { id: 'overview',      label: 'Vue d\'ensemble',          icon: <DocumentIcon className="w-4 h-4" />,  badge: `${conformitePct}%`,                          badgeColor: 'bg-primary-100 text-primary-700' },
    { id: 'plans_action',  label: "Plans d'action",            icon: <TableIcon className="w-4 h-4" />,     badge: planActionAudits.length > 0 ? planActionAudits.length : null, badgeColor: 'bg-teal-100 text-teal-700' },
    { id: 'planning',      label: 'Planification',             icon: <CalendarIcon className="w-4 h-4" />,  badge: `${calculateEisenhowerActionsCount}`,          badgeColor: 'bg-blue-100 text-blue-700' },
    { id: 'calendar',      label: 'Calendrier',                icon: <CalendarIcon className="w-4 h-4" />,  badge: null,                                          badgeColor: '' },
    { id: 'team',          label: 'Équipe',                    icon: <UserIcon className="w-4 h-4" />,      badge: `${Object.keys(stats.owners).length}`,         badgeColor: 'bg-indigo-100 text-indigo-700' },
    { id: 'deadlines',     label: 'Échéances 30j',             icon: <ClockIcon className="w-4 h-4" />,     badge: deadlines.length > 0 ? deadlines.length : null, badgeColor: 'bg-orange-100 text-orange-700' },
    { id: 'nonconformes',  label: 'Non Conformes',             icon: <XCircleIcon className="w-4 h-4" />,   badge: nonConformesAudits.length > 0 ? nonConformesAudits.length : null, badgeColor: 'bg-red-100 text-red-700' },
  ];

  const GRADIENT_MAP = {
    overview: 'from-primary-500 to-primary-600',
    plans_action: 'from-teal-500 to-emerald-600',
    planning: 'from-blue-500 to-blue-600',
    calendar: 'from-purple-500 to-purple-600',
    team: 'from-indigo-500 to-indigo-600',
    deadlines: 'from-orange-500 to-orange-600',
    nonconformes: 'from-red-500 to-red-600',
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-[1920px] mx-auto space-y-6">

        {/* ── EN-TÊTE ── */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }} className="text-center">
          <h1 className="text-3xl sm:text-4xl md:text-5xl font-extrabold gradient-text mb-2">
            Tableau de Bord Récapitulatif
          </h1>
          <CardDescription className="text-base max-w-2xl mx-auto">
            Vue d'ensemble complète de votre conformité réglementaire
          </CardDescription>
        </motion.div>

        {/* ── NAVBAR ── */}
        <motion.div initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1, duration: 0.4 }}>
          <div className="bg-white/90 backdrop-blur-xl rounded-2xl shadow-xl border border-slate-200/60 overflow-hidden">

            {/* Tabs + actions */}
            <div className="flex flex-wrap items-stretch border-b border-slate-100">
              {/* Onglets */}
              <div className="flex flex-wrap flex-1">
                {NAV_TABS.map(tab => {
                  const active = activeTab === tab.id;
                  return (
                    <button
                      key={tab.id}
                      onClick={() => setActiveTab(tab.id)}
                      className={`flex items-center gap-2 px-4 py-3.5 text-sm font-semibold transition-all duration-200 relative border-b-2
                        ${active
                          ? `border-blue-500 text-blue-600 bg-blue-50/60`
                          : 'border-transparent text-slate-500 hover:text-slate-800 hover:bg-slate-50'
                        }`}
                    >
                      <span className={`${active ? 'text-blue-500' : 'text-slate-400'}`}>{tab.icon}</span>
                      <span className="hidden sm:inline">{tab.label}</span>
                      {tab.badge && (
                        <span className={`text-xs px-1.5 py-0.5 rounded-full font-bold ${active ? 'bg-blue-100 text-blue-700' : tab.badgeColor || 'bg-slate-100 text-slate-600'}`}>
                          {tab.badge}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>

              {/* Boutons d'action */}
              <div className="flex items-center gap-2 px-4 py-2 border-l border-slate-100 flex-shrink-0">
                <ReportButton
                  type="dashboard"
                  size="sm"
                  className="text-xs px-3 py-1.5 rounded-xl font-semibold transition-all hover:scale-105"
                >
                  <span className="hidden md:inline">Export PDF</span>
                  <span className="md:hidden">PDF</span>
                </ReportButton>
                <Link to="/reglementation">
                  <button className="text-xs px-3 py-1.5 rounded-xl font-semibold bg-gradient-to-r from-blue-500 to-indigo-500 text-white shadow hover:scale-105 transition-all">
                    <span className="hidden md:inline">Voir Réglementation</span>
                    <span className="md:hidden">Audit</span>
                  </button>
                </Link>
              </div>
            </div>

            {/* ── CONTENU DE L'ONGLET ACTIF ── */}
            <div className="p-6">
              <AnimatePresence mode="wait">
                <motion.div
                  key={activeTab}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.2 }}
                >
                  {activeTab === 'overview' && <ConformityGauge stats={stats} />}

                  {activeTab === 'plans_action' && (
                    planActionAudits.length > 0
                      ? <AuditDetailsTable audits={planActionAudits} title="Plans d'action en cours" />
                      : <p className="text-center text-slate-500 py-12 text-sm">Aucun plan d'action renseigné.</p>
                  )}

                  {activeTab === 'planning' && <EisenhowerMatrix allAudits={allAudits} />}

                  {activeTab === 'calendar' && <AuditCalendar allAudits={allAudits} />}

                  {activeTab === 'team' && <TeamManagement allAudits={allAudits} />}

                  {activeTab === 'deadlines' && (
                    deadlines.length > 0
                      ? <AuditDetailsTable audits={deadlines} />
                      : <p className="text-center text-slate-500 py-12 text-sm">Aucune échéance dans les 30 prochains jours.</p>
                  )}

                  {activeTab === 'nonconformes' && (
                    nonConformesAudits.length > 0
                      ? <AuditDetailsTable audits={nonConformesAudits} />
                      : <p className="text-center text-slate-500 py-12 text-sm">Aucun audit non conforme.</p>
                  )}
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </motion.div>

      </div>
    </div>
  );
};

export default RecapPage;