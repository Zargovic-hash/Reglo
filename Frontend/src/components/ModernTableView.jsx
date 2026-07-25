import React, { useState, useMemo } from 'react';
import {
  Edit2,
  ArrowUpDown,
  Calendar,
  Star,
  ChevronDown,
  ChevronUp,
  Inbox,
  CheckCircle2,
  XCircle,
  MinusCircle,
  HelpCircle
} from 'lucide-react';

// --- Badge de statut (icône compacte) ---
const STATUS_ICONS = {
  'Conforme': { icon: CheckCircle2, className: 'text-emerald-500' },
  'Non Conforme': { icon: XCircle, className: 'text-red-500' },
  'Non conforme': { icon: XCircle, className: 'text-red-500' },
  'Non Applicable': { icon: MinusCircle, className: 'text-slate-400' }
};

const StatusBadge = ({ status }) => {
  const config = STATUS_ICONS[status] || { icon: HelpCircle, className: 'text-amber-500' };
  const Icon = config.icon;

  return (
    <span title={status || 'À évaluer'} className="inline-flex items-center justify-center">
      <Icon className={`w-[18px] h-[18px] ${config.className}`} strokeWidth={2.25} />
    </span>
  );
};

// --- Cellule de texte compacte et extensible au clic ---
const ExpandableCell = ({ text, maxWidth = "max-w-[300px]", minWidth = "min-w-[120px]", isBold = false, isReference = false, clampClassName = "line-clamp-2", extraLabel, extraText }) => {
  const [isExpanded, setIsExpanded] = useState(false);

  if (!text) return <span className="text-slate-300 italic text-sm">Non renseigné</span>;

  return (
    <div
      onClick={(e) => { e.stopPropagation(); setIsExpanded(!isExpanded); }}
      className={`group/cell relative ${minWidth} ${maxWidth} cursor-pointer select-none transition-all duration-200`}
    >
      <div className="flex items-start gap-1.5">
        <div className={`text-sm leading-snug transition-colors duration-200 ${
          isReference ? 'text-blue-700 font-medium' :
          isBold ? 'font-semibold text-slate-900' : 'text-slate-600'
        } ${isExpanded ? 'whitespace-normal' : clampClassName} group-hover/cell:text-blue-700`}>
          {text}
        </div>

        <div className={`mt-1 flex-shrink-0 transition-opacity ${isExpanded ? 'opacity-100' : 'opacity-0 group-hover/cell:opacity-100'}`}>
          {isExpanded ? <ChevronUp className="h-3.5 w-3.5 text-blue-500" /> : <ChevronDown className="h-3.5 w-3.5 text-slate-400" />}
        </div>
      </div>

      {isExpanded && extraText && (
        <div className="mt-2 pt-2 border-t border-slate-100">
          <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wide mb-0.5">{extraLabel}</div>
          <div className="text-xs text-slate-500 whitespace-normal leading-snug">{extraText}</div>
        </div>
      )}
    </div>
  );
};

// --- Le CSV source contient encore des références non-URL (ex: "1.1") en attendant sa
// finalisation : on n'affiche un lien cliquable que pour les valeurs qui ressemblent à une URL.
const isLikelyUrl = (value) => /^https?:\/\//i.test(value?.trim() || '');

// --- 4 points, un par lien (lien_1..lien_4) : plein/cliquable si renseigné, vide sinon ---
const LinkDots = ({ regulation }) => {
  const links = [regulation.lien_1, regulation.lien_2, regulation.lien_3, regulation.lien_4];

  return (
    <div className="flex flex-col items-center justify-center gap-1.5">
      {links.map((link, idx) => {
        const valid = isLikelyUrl(link);
        return valid ? (
          <a
            key={idx}
            href={link}
            target="_blank"
            rel="noopener noreferrer"
            onClick={(e) => e.stopPropagation()}
            title={`Lien ${idx + 1}`}
            className="w-2.5 h-2.5 rounded-full bg-blue-500 hover:bg-blue-600 hover:scale-125 transition-all"
          />
        ) : (
          <span
            key={idx}
            title={`Lien ${idx + 1} non renseigné`}
            className="w-2.5 h-2.5 rounded-full bg-slate-200"
          />
        );
      })}
    </div>
  );
};

// --- État vide ---
const EmptyState = () => (
  <div className="flex flex-1 flex-col items-center justify-center py-24 px-6 text-center">
    <div className="w-14 h-14 rounded-2xl bg-slate-100 flex items-center justify-center mb-4">
      <Inbox className="h-7 w-7 text-slate-400" />
    </div>
    <h3 className="text-base font-bold text-slate-800 mb-1">Aucune réglementation trouvée</h3>
    <p className="text-sm text-slate-500 max-w-sm">
      Essayez d'élargir votre recherche ou de réinitialiser les filtres actifs.
    </p>
  </div>
);

const ModernTableView = ({ filteredRegulations, handleStartAudit, favoriteIds, onToggleFavorite, tableSubView = 'compliance' }) => {
  const [sortConfig, setSortConfig] = useState({ key: null, direction: 'asc' });

  const columnVisibility = useMemo(() => {
    switch (tableSubView) {
      case 'action_plan': return ['aspect', 'plan_action', 'prioritée', 'owner', 'deadline', 'actions'];
      case 'compliance':
      default: return ['aspect', 'exigence', 'reference', 'lien', 'actions'];
    }
  }, [tableSubView]);

  const aspectMaxWidth = tableSubView === 'compliance' ? 'max-w-[220px]' : 'max-w-[280px]';

  const sortedData = useMemo(() => {
    if (!sortConfig.key) return filteredRegulations;
    return [...filteredRegulations].sort((a, b) => {
      const aVal = a[sortConfig.key] ?? '';
      const bVal = b[sortConfig.key] ?? '';
      if (sortConfig.key === 'deadline') return sortConfig.direction === 'asc' ? new Date(aVal) - new Date(bVal) : new Date(bVal) - new Date(aVal);
      return sortConfig.direction === 'asc' ? String(aVal).localeCompare(String(bVal)) : String(bVal).localeCompare(String(aVal));
    });
  }, [filteredRegulations, sortConfig]);

  const HeaderCell = ({ columnKey, label, sortable = true }) => (
    <th className="px-4 py-3.5 text-left first:pl-5 last:pr-5">
      {sortable ? (
        <button
          onClick={() => setSortConfig({ key: columnKey, direction: sortConfig.key === columnKey && sortConfig.direction === 'asc' ? 'desc' : 'asc' })}
          className="flex items-center gap-1.5 text-xs font-bold text-slate-500 uppercase tracking-wider hover:text-blue-600 transition-colors group"
        >
          {label}
          <ArrowUpDown className={`h-3 w-3 transition-opacity ${sortConfig.key === columnKey ? 'text-blue-600 opacity-100' : 'opacity-0 group-hover:opacity-50'}`} />
        </button>
      ) : (
        <span className="text-xs font-bold text-slate-500 uppercase tracking-wider">{label}</span>
      )}
    </th>
  );

  return (
    <div className="flex flex-col h-full bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden font-sans">
      {sortedData.length === 0 ? (
        <EmptyState />
      ) : (
        <div className="flex-1 overflow-auto">
          <table className="w-full border-separate border-spacing-0">
            <thead className="sticky top-0 z-20 bg-slate-50/95 backdrop-blur-md border-b border-slate-200 shadow-sm">
              <tr>
                {columnVisibility.includes('aspect') && <HeaderCell columnKey="titre" label="Intitulé" />}
                {columnVisibility.includes('exigence') && <HeaderCell columnKey="exigence" label="Exigence" sortable={false} />}
                {columnVisibility.includes('reference') && <HeaderCell columnKey="reference_reglementaire" label="Référentiel légal" />}
                {columnVisibility.includes('lien') && <th className="w-px px-3 py-3.5 text-center text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Lien</th>}
                {columnVisibility.includes('plan_action') && <HeaderCell columnKey="plan_action" label="Plan d'action" sortable={false} />}
                {columnVisibility.includes('prioritée') && <HeaderCell columnKey="prioritée" label="Priorité" />}
                {columnVisibility.includes('owner') && <HeaderCell columnKey="owner" label="Responsable" />}
                {columnVisibility.includes('deadline') && <HeaderCell columnKey="deadline" label="Échéance" />}
                {columnVisibility.includes('actions') && <th className="w-px px-2 py-3.5 text-right pr-5 text-xs font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">Statut</th>}
              </tr>
            </thead>

            <tbody className="divide-y divide-slate-100">
              {sortedData.map((reg, idx) => (
                <tr
                  key={reg.id || idx}
                  onClick={() => handleStartAudit(reg)}
                  title="Cliquer pour ouvrir l'audit"
                  className="group even:bg-slate-50/40 hover:bg-blue-50/60 cursor-pointer transition-colors"
                >
                  {columnVisibility.includes('aspect') && (
                    <td className="px-4 py-3.5 align-top pl-5">
                      <ExpandableCell text={reg.titre} maxWidth={aspectMaxWidth} minWidth="min-w-[160px]" isBold={true} />
                      {reg.sous_titre && (
                        <div className={`mt-1 text-xs text-slate-400 line-clamp-1 ${aspectMaxWidth}`}>{reg.sous_titre}</div>
                      )}
                    </td>
                  )}
                  {columnVisibility.includes('exigence') && (
                    <td className="px-4 py-3.5 align-top">
                      <ExpandableCell text={reg.exigence} maxWidth="max-w-[440px]" minWidth="min-w-[220px]" clampClassName="line-clamp-3" extraLabel="Documents justificatifs" extraText={reg.documents_justificatif} />
                    </td>
                  )}
                  {columnVisibility.includes('reference') && (
                    <td className="px-4 py-3.5 align-top">
                      <ExpandableCell text={reg.reference_reglementaire} maxWidth="max-w-[280px]" minWidth="min-w-[140px]" isReference={true} />
                      {reg.id_article && (
                        <span className="inline-block mt-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded">
                          Art. {reg.id_article}
                        </span>
                      )}
                    </td>
                  )}
                  {columnVisibility.includes('lien') && (
                    <td className="w-px px-3 py-3.5 align-top">
                      <LinkDots regulation={reg} />
                    </td>
                  )}
                  {columnVisibility.includes('plan_action') && (
                    <td className="px-4 py-3.5 align-top">
                      <ExpandableCell text={reg.plan_action} maxWidth="max-w-[320px]" minWidth="min-w-[180px]" extraLabel="Documents justificatifs" extraText={reg.documents_justificatif} />
                    </td>
                  )}
                  {columnVisibility.includes('prioritée') && (
                    <td className="px-4 py-3.5 align-top whitespace-nowrap text-sm font-medium text-slate-600">
                      {reg.prioritée || <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  {columnVisibility.includes('owner') && (
                    <td className="px-4 py-3.5 align-top text-sm text-slate-600 font-medium whitespace-nowrap">
                      {reg.owner || <span className="text-slate-300">—</span>}
                    </td>
                  )}
                  {columnVisibility.includes('deadline') && (
                    <td className="px-4 py-3.5 align-top whitespace-nowrap">
                      {reg.deadline ? (
                        <div className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-600 bg-slate-100 px-2 py-1 rounded-md">
                          <Calendar className="h-3.5 w-3.5" />
                          {new Date(reg.deadline).toLocaleDateString('fr-FR')}
                        </div>
                      ) : <span className="text-slate-300 text-sm">—</span>}
                    </td>
                  )}
                  {columnVisibility.includes('actions') && (
                    <td className="w-px px-2 py-3.5 align-top text-right pr-5 whitespace-nowrap">
                      <div className="flex flex-col items-end gap-1.5">
                        {tableSubView === 'compliance' && <StatusBadge status={reg.conformite} />}
                        <div className="flex flex-col items-end gap-1 opacity-70 group-hover:opacity-100 transition-opacity">
                        <button
                          onClick={(e) => { e.stopPropagation(); onToggleFavorite(reg.id).catch(console.error); }}
                          className="inline-flex items-center justify-center p-1.5 text-slate-400 hover:text-amber-500 hover:bg-amber-50 rounded-lg transition-all"
                          aria-label={favoriteIds?.has(reg.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                          title={favoriteIds?.has(reg.id) ? 'Retirer des favoris' : 'Ajouter aux favoris'}
                        >
                          <Star className={`h-4 w-4 ${favoriteIds?.has(reg.id) ? 'fill-amber-400 text-amber-500' : ''}`} />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); handleStartAudit(reg); }}
                          className="inline-flex items-center justify-center p-1.5 text-blue-600 bg-blue-50 hover:bg-blue-100 border border-blue-100 hover:border-blue-200 rounded-lg transition-all"
                          aria-label={reg.conformite ? 'Modifier' : 'Auditer'}
                          title={reg.conformite ? 'Modifier' : 'Auditer'}
                        >
                          <Edit2 className="h-3.5 w-3.5" />
                        </button>
                        </div>
                      </div>
                    </td>
                  )}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      <div className="px-5 py-3 bg-white border-t border-slate-200 flex items-center justify-between flex-shrink-0">
        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">
          {sortedData.length} ligne{sortedData.length > 1 ? 's' : ''} chargée{sortedData.length > 1 ? 's' : ''}
        </span>
      </div>
    </div>
  );
};

export default ModernTableView;
