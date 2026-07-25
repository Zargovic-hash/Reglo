import React from 'react';

// Petite barre de navigation par domaine : tous les domaines sur une seule ligne
// (défilement horizontal si nécessaire), l'utilisateur clique pour afficher un domaine.
const DomainNavbar = ({ domaineOptions = [], activeDomaine, onSelect }) => {
  return (
    <div className="bg-white border-b border-slate-200 sticky top-0 z-10 shadow-sm">
      <div className="flex items-center gap-2 overflow-x-auto scrollbar-thin px-4 py-2.5">
        <button
          type="button"
          onClick={() => onSelect('')}
          className={`flex-shrink-0 px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border-2 transition-all ${
            !activeDomaine
              ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
              : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
          }`}
        >
          Tous les domaines
        </button>

        <div className="w-px h-5 bg-slate-200 flex-shrink-0" />

        {domaineOptions.map(domaine => (
          <button
            key={domaine}
            type="button"
            onClick={() => onSelect(domaine)}
            title={domaine}
            className={`flex-shrink-0 max-w-[220px] truncate px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap border-2 transition-all ${
              activeDomaine === domaine
                ? 'bg-blue-600 border-blue-600 text-white shadow-sm'
                : 'bg-white border-slate-200 text-slate-600 hover:border-slate-300 hover:bg-slate-50'
            }`}
          >
            {domaine}
          </button>
        ))}
      </div>
    </div>
  );
};

export default DomainNavbar;
