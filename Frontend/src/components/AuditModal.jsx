import React, { useEffect, useRef, useCallback } from 'react';
import { X, Save, AlertCircle, ExternalLink } from 'lucide-react';

// Le CSV source contient encore des références non-URL (ex: "1.1") en attendant sa
// finalisation : on n'affiche un lien cliquable que pour les valeurs qui ressemblent à une URL.
const isLikelyUrl = (value) => /^https?:\/\//i.test(value?.trim() || '');


const FormGroup = React.memo(({ label, children, required = false }) => (
  <div className="flex flex-col space-y-3">
    <label className="text-sm font-semibold text-gray-700 flex items-center space-x-1">
      <span>{label}</span>
      {required && <span className="text-red-500 font-bold">*</span>}
    </label>
    {children}
  </div>
));
FormGroup.displayName = 'FormGroup';

const SelectField = React.memo(({ value, onChange, options, placeholder = "Sélectionner...", required = false }) => {
  const handleChange = useCallback((e) => {
    e.stopPropagation();
    onChange(e.target.value);
  }, [onChange]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleFocus = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <select
      value={value}
      onChange={handleChange}
      className={`w-full px-4 py-3 border rounded-lg bg-white focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
        required && !value ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={handleClick}
      onFocus={handleFocus}
      required={required}
    >
      <option value="">{placeholder}</option>
      {options.map((option, index) => (
        <option key={index} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
});
SelectField.displayName = 'SelectField';

const InputField = React.memo(({ type = "text", value, onChange, placeholder, required = false, ...props }) => {
  const handleChange = useCallback((e) => {
    e.stopPropagation();
    onChange(e.target.value);
  }, [onChange]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleFocus = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <input
      type={type}
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
        required && !value ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={handleClick}
      onFocus={handleFocus}
      required={required}
      {...props}
    />
  );
});
InputField.displayName = 'InputField';

const TextareaField = React.memo(({ value, onChange, placeholder, rows = 4, required = false }) => {
  const handleChange = useCallback((e) => {
    e.stopPropagation();
    onChange(e.target.value);
  }, [onChange]);

  const handleClick = useCallback((e) => {
    e.stopPropagation();
  }, []);

  const handleFocus = useCallback((e) => {
    e.stopPropagation();
  }, []);

  return (
    <textarea
      value={value}
      onChange={handleChange}
      placeholder={placeholder}
      rows={rows}
      className={`w-full px-4 py-3 border rounded-lg resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-200 ${
        required && !value ? 'border-red-300 bg-red-50' : 'border-gray-300 hover:border-gray-400'
      }`}
      onClick={handleClick}
      onFocus={handleFocus}
      required={required}
    />
  );
});
TextareaField.displayName = 'TextareaField';

const AuditModal = ({
  isOpen,
  regulation,
  auditForm,
  onInputChange,
  onSave,
  onClose,
  isSaving
}) => {
  const modalRef = useRef(null);

  // Focus management and escape key handling
  useEffect(() => {
    if (isOpen) {
      const handleEscape = (e) => {
        if (e.key === 'Escape' && !isSaving) {
          onClose();
        }
      };

      document.addEventListener('keydown', handleEscape);
      document.body.style.overflow = 'hidden';

      // Focus the modal for accessibility
      if (modalRef.current) {
        modalRef.current.focus();
      }

      return () => {
        document.removeEventListener('keydown', handleEscape);
        document.body.style.overflow = 'unset';
      };
    }
  }, [isOpen, onClose, isSaving]);

  if (!isOpen) return null;

  const handleBackdropClick = (e) => {
    if (e.target === e.currentTarget && !isSaving) {
      onClose();
    }
  };

  const handleSave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    onSave();
  };

  const handleClose = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (!isSaving) {
      onClose();
    }
  };

  const conformityOptions = [
    { value: 'Conforme', label: 'Conforme' },
    { value: 'Non Conforme', label: 'Non Conforme' },
    { value: 'Non Applicable', label: 'Non Applicable' }
  ];

const priorityOption = [
  { value: '1. Critique 🔴', label: 'Critique' },
  { value: '2. Élevée 🟠', label: 'Élevée' },
  { value: '3. Modérée 🟡', label: 'Modérée' },
  { value: '4. Faible 🟢', label: 'Faible' },
  { value: '5. Amélioration ⚪', label: 'Amélioration' }
];


  const feasibilityOptions = [
    { value: 'Facile', label: 'Facile' },
    { value: 'Moyen', label: 'Moyenne' },
    { value: 'Difficile', label: 'Difficile' }
  ];

  const isFormValid = auditForm.conformite.trim() !== '';

  return (
    <div 
      className="fixed inset-0 flex items-center justify-center bg-black/50 z-50 p-4"
      onClick={handleBackdropClick}
      role="dialog"
      aria-modal="true"
      aria-labelledby="audit-modal-title"
    >
      <div 
        ref={modalRef}
        className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
        tabIndex={-1}
      >
        <div className="p-6 border-b border-gray-200 bg-gradient-to-r from-blue-50 to-indigo-50">
          <div className="flex items-start justify-between gap-4">
            <div className="flex-1 min-w-0">
              <p className="text-xs font-semibold uppercase tracking-wide text-blue-600 mb-1">
                Audit de conformité
              </p>
              <h3 id="audit-modal-title" className="text-xl font-semibold text-gray-900">
                {regulation?.titre || 'Réglementation'}
              </h3>
              {regulation?.sous_titre && (
                <p className="text-sm text-gray-500 mt-0.5">{regulation.sous_titre}</p>
              )}
              <div className="flex items-center gap-2 flex-wrap mt-2">
                {regulation?.domaine && (
                  <span className="px-2 py-1 rounded-md text-xs font-medium bg-blue-100 text-blue-700">
                    {regulation.domaine}
                  </span>
                )}
                {regulation?.conformite && (
                  <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                    regulation.conformite === 'Conforme'
                      ? 'bg-emerald-100 text-emerald-700'
                      : regulation.conformite === 'Non Conforme' || regulation.conformite === 'Non conforme'
                      ? 'bg-red-100 text-red-700'
                      : 'bg-slate-100 text-slate-700'
                  }`}>
                    {regulation.conformite}
                  </span>
                )}
              </div>
            </div>
            <button
              onClick={handleClose}
              className="p-2 hover:bg-white/60 rounded-lg transition-colors flex-shrink-0"
              disabled={isSaving}
              aria-label="Fermer la modal"
              type="button"
            >
              <X size={20} />
            </button>
          </div>
        </div>

        {regulation && (regulation.exigence || regulation.reference_reglementaire || regulation.id_article || regulation.documents_justificatif || [regulation.lien_1, regulation.lien_2, regulation.lien_3, regulation.lien_4].some(isLikelyUrl)) && (
          <div className="mx-6 mt-6 p-4 bg-slate-50 border border-slate-100 rounded-lg space-y-4">
            {regulation.exigence && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5 flex items-center gap-1.5">
                  <AlertCircle className="h-3.5 w-3.5 text-blue-500" />
                  Exigence réglementaire
                </h4>
                <p className="text-sm text-slate-700 leading-relaxed">{regulation.exigence}</p>
              </div>
            )}
            {(regulation.reference_reglementaire || regulation.id_article || [regulation.lien_1, regulation.lien_2, regulation.lien_3, regulation.lien_4].some(isLikelyUrl)) && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Référence réglementaire</h4>
                {regulation.reference_reglementaire && (
                  <p className="text-sm text-slate-700 leading-relaxed">{regulation.reference_reglementaire}</p>
                )}
                {regulation.id_article && (
                  <span className="inline-block mt-1.5 text-[10px] font-bold text-indigo-600 bg-indigo-100 px-1.5 py-0.5 rounded">
                    Art. {regulation.id_article}
                  </span>
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
            {regulation.documents_justificatif && (
              <div>
                <h4 className="text-xs font-semibold text-slate-500 uppercase tracking-wide mb-1.5">Documents justificatifs</h4>
                <p className="text-sm text-slate-700 leading-relaxed">{regulation.documents_justificatif}</p>
              </div>
            )}
          </div>
        )}

        <form onSubmit={handleSave} className="p-6 pt-4 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup label="Conformité" required>
              <SelectField
                value={auditForm.conformite}
                onChange={(value) => onInputChange('conformite', value)}
                options={conformityOptions}
                placeholder="Sélectionner le statut..."
                required
              />
            </FormGroup>
            
            <FormGroup label="Prioritée du CAPA">
              <SelectField
                value={auditForm.prioritée}
                onChange={(value) => onInputChange('prioritée', value)}
                options={priorityOption}
                placeholder="Évaluer la prioritée du CAPA..."
              />
            </FormGroup>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <FormGroup label="Faisabilité">
              <SelectField
                value={auditForm.faisabilite}
                onChange={(value) => onInputChange('faisabilite', value)}
                options={feasibilityOptions}
                placeholder="Évaluer la faisabilité..."
              />
            </FormGroup>
            
            <FormGroup label="Échéance">
              <InputField
                type="date"
                value={auditForm.deadline}
                onChange={(value) => onInputChange('deadline', value)}
                min={new Date().toISOString().split('T')[0]}
              />
            </FormGroup>
          </div>
          
          <FormGroup label="Responsable">
            <InputField
              type="text"
              value={auditForm.owner}
              onChange={(value) => onInputChange('owner', value)}
              placeholder="Nom du responsable"
              maxLength={100}
            />
          </FormGroup>
          
          <FormGroup label="Plan d'action">
            <TextareaField
              value={auditForm.plan_action}
              onChange={(value) => onInputChange('plan_action', value)}
              placeholder="Décrivez le plan d'action nécessaire pour assurer la conformité..."
              rows={4}
            />
          </FormGroup>

          {!isFormValid && (
            <p className="text-sm text-red-600 mt-2">
              * La conformité est obligatoire
            </p>
          )}
        </form>
        
        <div className="flex justify-end space-x-3 p-6 border-t border-gray-200">
          <button
            onClick={handleClose}
            disabled={isSaving}
            className="px-4 py-2 rounded-lg border border-gray-300 text-gray-700 hover:bg-gray-100 transition-colors"
            type="button"
          >
            Annuler
          </button>
          <button
            onClick={handleSave}
            disabled={isSaving || !isFormValid}
            className="px-4 py-2 rounded-lg bg-blue-600 text-white hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2"
            type="button"
          >
            <Save size={16} />
            <span>{isSaving ? 'Sauvegarde...' : 'Sauvegarder'}</span>
          </button>
        </div>
      </div>
    </div>
  );
};

export default AuditModal;