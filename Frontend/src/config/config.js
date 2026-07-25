// config.js
export const API_CONFIG = {
  // Priorité : variable d'environnement, sinon localhost
  BASE_URL: process.env.REACT_APP_API_URL || 'http://localhost:3001/api',
  
  // Timeout pour les requêtes
  TIMEOUT: 10000, // 10 secondes
  
  // Headers par défaut
  DEFAULT_HEADERS: {
    'Content-Type': 'application/json',
    'Accept': 'application/json'
  },
  
  // Configuration pour les requêtes fetch
  getConfig: (token = null) => ({
    headers: {
      ...API_CONFIG.DEFAULT_HEADERS,
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
  })
};

// Fonction utilitaire pour les requêtes avec gestion d'erreurs
export const apiRequest = async (endpoint, options = {}) => {
  const url = `${API_CONFIG.BASE_URL}${endpoint}`;
  
  // Configuration par défaut avec timeout
  const config = {
    ...API_CONFIG.getConfig(),
    ...options,
    // Ajouter signal pour timeout (compatible avec les navigateurs plus anciens)
    signal: typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(API_CONFIG.TIMEOUT) : undefined
  };

  try {
    console.log(`🌐 Requête API: ${options.method || 'GET'} ${url}`);
    
    const response = await fetch(url, config);
    
    // Log pour debug
    console.log(`📊 Réponse API: ${response.status} ${response.statusText}`);
    
    // Vérifier si la réponse est OK
    if (!response.ok) {
      const errorData = await response.json().catch(() => ({ 
        error: `Erreur HTTP ${response.status}` 
      }));
      throw new Error(errorData.error || `Erreur ${response.status}`);
    }

    return await response.json();
    
  } catch (error) {
    // Gestion spécifique des erreurs
    if (error.name === 'AbortError') {
      throw new Error('Timeout: Le serveur met trop de temps à répondre');
    }
    
    if (error.message.includes('fetch') || error.message.includes('NetworkError')) {
      throw new Error('Impossible de contacter le serveur. Vérifiez votre connexion.');
    }
    
    // Si c'est déjà une erreur formatée, la relancer
    if (error.message && !error.message.includes('Erreur')) {
      throw error;
    }
    
    throw new Error(error.message || 'Une erreur inattendue s\'est produite');
  }
};