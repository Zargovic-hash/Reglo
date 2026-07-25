import React from 'react';
import { motion } from 'framer-motion';
import {
  ArrowRight,
  CheckCircle2,
  AlertTriangle,
  Clock,
  FileText,
  Shield,
} from 'lucide-react';
import { computeDomainStats, getDomainColor } from '../utils/reglementationStats';

const DomainOverview = ({ regulations, onDomainSelect }) => {
  const domainStats = computeDomainStats(regulations);

  if (domainStats.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-gray-500">
        <FileText className="h-12 w-12 mb-4 text-gray-300" />
        <p className="text-lg font-medium">Aucune réglementation trouvée</p>
      </div>
    );
  }

  const globalStats = {
    total: regulations.length,
    audite: regulations.filter(r => r.conformite).length,
    nonConforme: regulations.filter(r =>
      r.conformite?.toLowerCase().includes('non conforme')
    ).length,
  };
  globalStats.tauxAvancement = globalStats.total > 0
    ? Math.round((globalStats.audite / globalStats.total) * 100)
    : 0;

  return (
    <div className="space-y-6">
      {/* En-tête global */}
      <div className="bg-gradient-to-br from-slate-900 via-blue-900 to-indigo-900 rounded-2xl p-6 text-white shadow-xl">
        <div className="flex items-start justify-between">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Shield className="h-5 w-5 text-blue-300" />
              <span className="text-xs font-bold uppercase tracking-widest text-blue-300">
                Vue d'ensemble
              </span>
            </div>
            <h2 className="text-2xl font-bold mb-1">Référentiel réglementaire</h2>
            <p className="text-blue-200 text-sm">
              Sélectionnez un domaine pour commencer ou poursuivre votre audit de conformité
            </p>
          </div>
          <div className="text-right">
            <div className="text-3xl font-black">{globalStats.tauxAvancement}%</div>
            <div className="text-xs text-blue-300 font-medium">Avancement global</div>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6">
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold">{globalStats.total}</div>
            <div className="text-xs text-blue-200">Exigences totales</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold text-emerald-300">{globalStats.audite}</div>
            <div className="text-xs text-blue-200">Auditées</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold text-amber-300">{globalStats.total - globalStats.audite}</div>
            <div className="text-xs text-blue-200">En attente</div>
          </div>
          <div className="bg-white/10 backdrop-blur-sm rounded-xl p-3">
            <div className="text-2xl font-bold text-red-300">{globalStats.nonConforme}</div>
            <div className="text-xs text-blue-200">Non conformes</div>
          </div>
        </div>

        {/* Barre de progression globale */}
        <div className="mt-4">
          <div className="h-2 bg-white/20 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${globalStats.tauxAvancement}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full bg-gradient-to-r from-emerald-400 to-blue-400 rounded-full"
            />
          </div>
        </div>
      </div>

      {/* Grille des domaines */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {domainStats.map((domain, index) => {
          const colors = getDomainColor(index);

          return (
            <motion.button
              key={domain.domaine}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              whileHover={{ y: -4, scale: 1.01 }}
              whileTap={{ scale: 0.99 }}
              onClick={() => onDomainSelect(domain.domaine)}
              className="text-left bg-white rounded-2xl border border-gray-200 p-5 shadow-sm hover:shadow-lg transition-all duration-300 group overflow-hidden relative"
            >
              <div className={`absolute top-0 left-0 w-1 h-full ${colors.bg}`} />

              <div className="flex items-start justify-between mb-4">
                <div className="flex-1 min-w-0 pr-3">
                  <h3 className="text-lg font-bold text-gray-900 truncate group-hover:text-blue-700 transition-colors">
                    {domain.domaine}
                  </h3>
                  <p className="text-sm text-gray-500 mt-0.5">
                    {domain.total} exigence{domain.total > 1 ? 's' : ''}
                  </p>
                </div>
                <div className={`w-12 h-12 rounded-xl ${colors.light} flex items-center justify-center flex-shrink-0`}>
                  <span className={`text-sm font-black ${colors.text}`}>
                    {domain.tauxAvancement}%
                  </span>
                </div>
              </div>

              {/* Barre de progression */}
              <div className="h-2 bg-gray-100 rounded-full overflow-hidden mb-4">
                <div className="h-full flex">
                  {domain.conforme > 0 && (
                    <div
                      className="bg-emerald-500 transition-all"
                      style={{ width: `${(domain.conforme / domain.total) * 100}%` }}
                    />
                  )}
                  {domain.nonConforme > 0 && (
                    <div
                      className="bg-red-500 transition-all"
                      style={{ width: `${(domain.nonConforme / domain.total) * 100}%` }}
                    />
                  )}
                  {domain.nonApplicable > 0 && (
                    <div
                      className="bg-gray-400 transition-all"
                      style={{ width: `${(domain.nonApplicable / domain.total) * 100}%` }}
                    />
                  )}
                </div>
              </div>

              {/* Stats détaillées */}
              <div className="grid grid-cols-3 gap-2 mb-4">
                <div className="flex items-center gap-1.5 text-xs">
                  <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500" />
                  <span className="font-semibold text-emerald-700">{domain.conforme}</span>
                  <span className="text-gray-400">C</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <AlertTriangle className="h-3.5 w-3.5 text-red-500" />
                  <span className="font-semibold text-red-700">{domain.nonConforme}</span>
                  <span className="text-gray-400">NC</span>
                </div>
                <div className="flex items-center gap-1.5 text-xs">
                  <Clock className="h-3.5 w-3.5 text-amber-500" />
                  <span className="font-semibold text-amber-700">{domain.nonAudite}</span>
                  <span className="text-gray-400">Attente</span>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-gray-100">
                <span className="text-xs text-gray-500">
                  {domain.tauxConformite}% conformité (audité)
                </span>
                <span className={`flex items-center gap-1 text-xs font-bold ${colors.text} group-hover:gap-2 transition-all`}>
                  Auditer
                  <ArrowRight className="h-3.5 w-3.5" />
                </span>
              </div>
            </motion.button>
          );
        })}
      </div>
    </div>
  );
};

export default DomainOverview;
