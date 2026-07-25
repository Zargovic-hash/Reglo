import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ReportButton = ({ 
  type = 'audit', 
  filters = {}, 
  className = '', 
  variant = 'primary',
  size = 'md',
  children,
  showDropdown = true,
  onSuccess = null,
  onError = null
}) => {
  const { authenticatedRequest } = useAuth();
  const [isGenerating, setIsGenerating] = useState(false);
  const [activeFormat, setActiveFormat] = useState(null);
  const [showFormatMenu, setShowFormatMenu] = useState(false);

  const generateReport = async (selectedFormat) => {
    if (isGenerating) return;
    
    setIsGenerating(true);
    setActiveFormat(selectedFormat);
    setShowFormatMenu(false);
    
    try {
      const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';
      const token = localStorage.getItem('auth_token');
      
      if (!token) {
        throw new Error('Session expirée. Veuillez vous reconnecter.');
      }
      
      console.log(`Génération rapport ${selectedFormat.toUpperCase()} - Type: ${type}`);
      
      // 🔧 QUICK FIX: Adapter les noms de filtres pour le backend
      // Mapper 'statut' → 'conformite' car le backend attend 'conformite'
      const adaptedFilters = { ...filters };
      if (filters.statut) {
        adaptedFilters.conformite = filters.statut;
        delete adaptedFilters.statut;
      }
      
      const response = await fetch(`${API_BASE}/reports/${selectedFormat}`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          type,
          filters: adaptedFilters
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({ error: 'Erreur serveur' }));
        throw new Error(errorData.error || `Erreur HTTP ${response.status}`);
      }

      // Créer le blob et déclencher le téléchargement
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, '-');
      const extension = selectedFormat === 'pdf' ? 'pdf' : 'xlsx';
      const filename = `rapport_${type}_${timestamp}.${extension}`;
      link.download = filename;
      
      // Ajouter temporairement au DOM pour déclencher le téléchargement
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);

      console.log(`Rapport ${selectedFormat.toUpperCase()} téléchargé: ${filename}`);
      
      // Callback de succès
      if (onSuccess) {
        onSuccess(selectedFormat, filename);
      }

    } catch (error) {
      console.error('Erreur génération rapport:', error);
      const errorMessage = `Impossible de générer le rapport ${selectedFormat.toUpperCase()}: ${error.message}`;
      
      // Callback d'erreur
      if (onError) {
        onError(error, selectedFormat);
      } else {
        alert(errorMessage);
      }
    } finally {
      setIsGenerating(false);
      setActiveFormat(null);
    }
  };

  const getButtonClasses = () => {
    const baseClasses = 'inline-flex items-center gap-2 font-medium transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed relative overflow-hidden';
    
    const sizeClasses = {
      sm: 'px-3 py-2 text-xs rounded-lg',
      md: 'px-4 py-2.5 text-sm rounded-xl',
      lg: 'px-6 py-3 text-base rounded-xl'
    };
    
    const variantClasses = {
      primary: 'bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-lg hover:shadow-xl',
      secondary: 'bg-gradient-to-r from-gray-600 to-gray-700 text-white hover:from-gray-700 hover:to-gray-800 focus:ring-gray-500 shadow-lg hover:shadow-xl',
      outline: 'border-2 border-blue-600 text-blue-700 hover:bg-blue-50 focus:ring-blue-500 bg-white',
      success: 'bg-gradient-to-r from-green-600 to-green-700 text-white hover:from-green-700 hover:to-green-800 focus:ring-green-500 shadow-lg hover:shadow-xl'
    };
    
    return `${baseClasses} ${sizeClasses[size]} ${variantClasses[variant]} ${className}`;
  };

  // Version simple sans dropdown
  if (!showDropdown) {
    return (
      <button
        className={getButtonClasses()}
        disabled={isGenerating}
        onClick={() => generateReport('pdf')}
        title="Générer un rapport PDF"
      >
        {isGenerating ? (
          <>
            <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
            <span>Génération...</span>
          </>
        ) : (
          <>
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            <span>{children || 'Rapport PDF'}</span>
          </>
        )}
      </button>
    );
  }

  // Version avec dropdown pour choisir le format
  return (
    <div className="relative inline-block">
      {/* Container principal */}
      <div className="flex rounded-xl overflow-hidden shadow-lg hover:shadow-xl transition-all duration-200">
        
        {/* Bouton principal PDF */}
        <button
          className={`${getButtonClasses()} rounded-r-none border-r border-white/20`}
          disabled={isGenerating}
          onClick={() => generateReport('pdf')}
          title="Générer un rapport PDF"
        >
          {isGenerating && activeFormat === 'pdf' ? (
            <>
              <svg className="animate-spin h-4 w-4" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span>PDF...</span>
            </>
          ) : (
            <>
              <svg className="w-4 h-4 text-red-200" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
              </svg>
              <span>PDF</span>
            </>
          )}
        </button>
        
        {/* Bouton dropdown */}
        <button
          className={`px-3 py-2.5 text-white hover:bg-white/10 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 rounded-l-none transition-all duration-200 ${
            variant === 'primary' ? 'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800' :
            variant === 'secondary' ? 'bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800' :
            variant === 'success' ? 'bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800' :
            'bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800'
          }`}
          onClick={() => setShowFormatMenu(!showFormatMenu)}
          disabled={isGenerating}
          title="Choisir le format"
        >
          <svg 
            className={`w-4 h-4 transition-transform duration-200 ${showFormatMenu ? 'rotate-180' : ''}`} 
            fill="none" 
            stroke="currentColor" 
            viewBox="0 0 24 24"
          >
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </button>
      </div>
      
      {/* Menu dropdown */}
      {showFormatMenu && (
        <>
<div className="absolute right-0 mt-2 w-72 bg-white rounded-2xl shadow-2xl ring-1 ring-black/5 z-[9999] border border-gray-100 overflow-hidden">
            <div className="p-3">
              {/* En-tête */}
              <div className="px-3 py-2 text-xs font-semibold text-gray-500 uppercase tracking-wider border-b border-gray-100 mb-3">
                Format de téléchargement
              </div>
              
              {/* Option PDF */}
              <button
                className="w-full flex items-center gap-4 px-3 py-4 text-sm text-gray-700 hover:bg-red-50 rounded-xl transition-all duration-200 group disabled:opacity-50"
                onClick={() => generateReport('pdf')}
                disabled={isGenerating}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-red-100 group-hover:bg-red-200 rounded-xl flex items-center justify-center transition-colors duration-200">
                  <svg className="w-6 h-6 text-red-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-red-800">
                    {isGenerating && activeFormat === 'pdf' ? 'Génération PDF...' : 'Rapport PDF'}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-red-600 mt-1">
                    Document formaté pour impression et partage
                  </div>
                </div>
                {isGenerating && activeFormat === 'pdf' ? (
                  <svg className="animate-spin h-5 w-5 text-red-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-red-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                )}
              </button>
              
              {/* Option Excel */}
              <button
                className="w-full flex items-center gap-4 px-3 py-4 text-sm text-gray-700 hover:bg-green-50 rounded-xl transition-all duration-200 group disabled:opacity-50"
                onClick={() => generateReport('excel')}
                disabled={isGenerating}
              >
                <div className="flex-shrink-0 w-12 h-12 bg-green-100 group-hover:bg-green-200 rounded-xl flex items-center justify-center transition-colors duration-200">
                  <svg className="w-6 h-6 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zm0 4a1 1 0 011-1h6a1 1 0 110 2H4a1 1 0 01-1-1zm8 0a1 1 0 100 2h6a1 1 0 100-2h-6zm-8 4a1 1 0 100 2h6a1 1 0 100-2H3zm8 0a1 1 0 100 2h6a1 1 0 100-2h-6z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="flex-1 text-left">
                  <div className="font-semibold text-gray-900 group-hover:text-green-800">
                    {isGenerating && activeFormat === 'excel' ? 'Génération Excel...' : 'Fichier Excel'}
                  </div>
                  <div className="text-xs text-gray-500 group-hover:text-green-600 mt-1">
                    Tableur structuré pour analyse des données
                  </div>
                </div>
                {isGenerating && activeFormat === 'excel' ? (
                  <svg className="animate-spin h-5 w-5 text-green-600" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-gray-400 group-hover:text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 10v6m0 0l-3-3m3 3l3-3" />
                  </svg>
                )}
              </button>
            </div>
            
            {/* Footer informatif */}
            <div className="px-4 py-3 bg-gray-50 border-t border-gray-100">
              <div className="text-xs text-gray-600 text-center">
                Les filtres actuels seront appliqués au rapport
              </div>
            </div>
          </div>
          
          {/* Overlay */}
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setShowFormatMenu(false)}
          />
        </>
      )}
    </div>
  );
};

export default ReportButton;