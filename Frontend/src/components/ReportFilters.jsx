import React, { useState, useEffect } from 'react';

const ReportFilters = ({ 
  type = 'audit', 
  onFiltersChange, 
  initialFilters = {},
  className = '' 
}) => {
  const [filters, setFilters] = useState(initialFilters);
  const [domains, setDomains] = useState([]);
  const [titles, setTitles] = useState([]);
  const [owners, setOwners] = useState([]);

  // Charger les données pour les filtres
  useEffect(() => {
    loadFilterData();
  }, [type]);

  const loadFilterData = async () => {
    try {
      // Charger les domaines
      const domainsResponse = await fetch('/api/reglementation/domaines');
      if (domainsResponse.ok) {
        const domainsData = await domainsResponse.json();
        setDomains(domainsData);
      }

      // Charger les titres
      const titlesResponse = await fetch('/api/reglementation/titres');
      if (titlesResponse.ok) {
        const titlesData = await titlesResponse.json();
        setTitles(titlesData);
      }

      // Charger les responsables (pour les audits)
      if (type === 'audit') {
        const ownersResponse = await fetch('/api/audit/owners');
        if (ownersResponse.ok) {
          const ownersData = await ownersResponse.json();
          setOwners(ownersData);
        }
      }
    } catch (error) {
      console.error('Erreur chargement filtres:', error);
    }
  };

  const handleFilterChange = (key, value) => {
    const newFilters = { ...filters };
    
    if (value === '' || value === null) {
      delete newFilters[key];
    } else {
      newFilters[key] = value;
    }
    
    setFilters(newFilters);
    onFiltersChange(newFilters);
  };

  const clearFilters = () => {
    setFilters({});
    onFiltersChange({});
  };

  const hasActiveFilters = Object.keys(filters).length > 0;

  return (
    <div className={`bg-white p-4 rounded-lg border border-gray-200 ${className}`}>
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">Filtres du Rapport</h3>
        {hasActiveFilters && (
          <button
            onClick={clearFilters}
            className="text-sm text-blue-600 hover:text-blue-800 font-medium"
          >
            Effacer tous les filtres
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Filtre Domaine */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Domaine
          </label>
          <select
            value={filters.domaine || ''}
            onChange={(e) => handleFilterChange('domaine', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          >
            <option value="">Tous les domaines</option>
            {domains.map((domain) => (
              <option key={domain} value={domain}>
                {domain}
              </option>
            ))}
          </select>
        </div>

        {/* Filtre Titre (pour réglementation) */}
        {type === 'reglementation' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Titre
            </label>
            <select
              value={filters.titre || ''}
              onChange={(e) => handleFilterChange('titre', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les titres</option>
              {titles.map((title) => (
                <option key={title} value={title}>
                  {title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtre Conformité (pour audit) */}
        {type === 'audit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Conformité
            </label>
            <select
              value={filters.conformite || ''}
              onChange={(e) => handleFilterChange('conformite', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Toutes les conformités</option>
              <option value="Conforme">Conforme</option>
              <option value="Non Conforme">Non Conforme</option>
              <option value="En Cours">En Cours</option>
              <option value="Non Applicable">Non Applicable</option>
            </select>
          </div>
        )}

        {/* Filtre Responsable (pour audit) */}
        {type === 'audit' && (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              Responsable
            </label>
            <select
              value={filters.owner || ''}
              onChange={(e) => handleFilterChange('owner', e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">Tous les responsables</option>
              {owners.map((owner) => (
                <option key={owner} value={owner}>
                  {owner}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Filtre Date de début */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de début
          </label>
          <input
            type="date"
            value={filters.date_debut || ''}
            onChange={(e) => handleFilterChange('date_debut', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtre Date de fin */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Date de fin
          </label>
          <input
            type="date"
            value={filters.date_fin || ''}
            onChange={(e) => handleFilterChange('date_fin', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>

        {/* Filtre Recherche textuelle */}
        <div className="md:col-span-2 lg:col-span-3">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recherche textuelle
          </label>
          <input
            type="text"
            placeholder="Rechercher dans les titres, exigences, lois..."
            value={filters.search || ''}
            onChange={(e) => handleFilterChange('search', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
          />
        </div>
      </div>

      {/* Affichage des filtres actifs */}
      {hasActiveFilters && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-2">
            <span className="text-sm text-gray-600">Filtres actifs:</span>
            {Object.entries(filters).map(([key, value]) => (
              <span
                key={key}
                className="inline-flex items-center gap-1 px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full"
              >
                <span className="font-medium">{key}:</span>
                <span>{value}</span>
                <button
                  onClick={() => handleFilterChange(key, '')}
                  className="ml-1 text-blue-600 hover:text-blue-800"
                >
                  ×
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default ReportFilters;
