const normalizeConformite = (value) => {
  if (!value) return null;
  const lower = value.toLowerCase();
  if (lower.includes('conforme') && !lower.includes('non')) return 'conforme';
  if (lower.includes('non conforme') || lower.includes('non-conforme')) return 'non_conforme';
  if (lower.includes('non applicable') || lower.includes('n/a')) return 'non_applicable';
  return 'other';
};

export const computeRegulationStats = (regulations) => {
  const stats = {
    total: regulations.length,
    conforme: 0,
    nonConforme: 0,
    nonApplicable: 0,
    nonAudite: 0,
    avecPlan: 0,
    echeanceProche: 0,
    echeanceDepassee: 0,
  };

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const in30Days = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000);

  regulations.forEach((reg) => {
    const status = normalizeConformite(reg.conformite);

    if (!status) {
      stats.nonAudite += 1;
    } else if (status === 'conforme') {
      stats.conforme += 1;
    } else if (status === 'non_conforme') {
      stats.nonConforme += 1;
    } else if (status === 'non_applicable') {
      stats.nonApplicable += 1;
    }

    if (reg.plan_action?.trim()) stats.avecPlan += 1;

    if (reg.deadline) {
      const deadline = new Date(reg.deadline);
      deadline.setHours(0, 0, 0, 0);
      if (deadline < today) stats.echeanceDepassee += 1;
      else if (deadline <= in30Days) stats.echeanceProche += 1;
    }
  });

  stats.audite = stats.total - stats.nonAudite;
  stats.tauxConformite = stats.audite > 0
    ? Math.round((stats.conforme / stats.audite) * 100)
    : 0;
  stats.tauxAvancement = stats.total > 0
    ? Math.round((stats.audite / stats.total) * 100)
    : 0;

  return stats;
};

export const computeDomainStats = (regulations) => {
  const domainMap = {};

  regulations.forEach((reg) => {
    const domaine = reg.domaine || 'Non défini';
    if (!domainMap[domaine]) {
      domainMap[domaine] = [];
    }
    domainMap[domaine].push(reg);
  });

  return Object.entries(domainMap)
    .map(([domaine, items]) => ({
      domaine,
      ...computeRegulationStats(items),
    }))
    .sort((a, b) => a.domaine.localeCompare(b.domaine, 'fr'));
};

export const groupByHierarchy = (regulations) => {
  const tree = {};

  regulations.forEach((reg) => {
    const titre = reg.titre || 'Sans titre';
    const sousTitre = reg.sous_titre || 'Général';

    if (!tree[titre]) tree[titre] = {};
    if (!tree[titre][sousTitre]) tree[titre][sousTitre] = [];
    tree[titre][sousTitre].push(reg);
  });

  return tree;
};

export const getDomainColor = (index) => {
  const colors = [
    { bg: 'bg-blue-500', light: 'bg-blue-50', text: 'text-blue-700', border: 'border-blue-200', ring: 'ring-blue-500' },
    { bg: 'bg-indigo-500', light: 'bg-indigo-50', text: 'text-indigo-700', border: 'border-indigo-200', ring: 'ring-indigo-500' },
    { bg: 'bg-violet-500', light: 'bg-violet-50', text: 'text-violet-700', border: 'border-violet-200', ring: 'ring-violet-500' },
    { bg: 'bg-emerald-500', light: 'bg-emerald-50', text: 'text-emerald-700', border: 'border-emerald-200', ring: 'ring-emerald-500' },
    { bg: 'bg-amber-500', light: 'bg-amber-50', text: 'text-amber-700', border: 'border-amber-200', ring: 'ring-amber-500' },
    { bg: 'bg-rose-500', light: 'bg-rose-50', text: 'text-rose-700', border: 'border-rose-200', ring: 'ring-rose-500' },
    { bg: 'bg-cyan-500', light: 'bg-cyan-50', text: 'text-cyan-700', border: 'border-cyan-200', ring: 'ring-cyan-500' },
    { bg: 'bg-orange-500', light: 'bg-orange-50', text: 'text-orange-700', border: 'border-orange-200', ring: 'ring-orange-500' },
  ];
  return colors[index % colors.length];
};
