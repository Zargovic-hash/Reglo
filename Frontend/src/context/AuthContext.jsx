import React, { useState, useEffect, createContext, useContext } from 'react';
import { apiRequest } from '../config/config';

const AuthContext = createContext();

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};

const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [token, setToken] = useState(localStorage.getItem('auth_token'));

  // Vérifier l'authentification au chargement
  useEffect(() => {
    const checkAuth = async () => {
      if (token) {
        try {
          const userData = await apiRequest('/auth/profile', {
            headers: { Authorization: `Bearer ${token}` }
          });
          
          setUser(userData);
        } catch (error) {
          console.error('⚠ Erreur vérification auth:', error);
          // Token invalide, nettoyer
          localStorage.removeItem('auth_token');
          setToken(null);
          setUser(null);
        }
      }
      setLoading(false);
    };

    checkAuth();
  }, [token]);

  const login = async (email, password) => {
    try {
      const data = await apiRequest('/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password })
      });

      // Succès : stocker le token et l'utilisateur
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
      
    } catch (error) {
      console.error('⚠ Erreur login:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur de connexion' 
      };
    }
  };

  const register = async (email, password, firstName, lastName) => {
    try {
      const data = await apiRequest('/auth/register', {
        method: 'POST',
        body: JSON.stringify({ 
          email, 
          password, 
          first_name: firstName, 
          last_name: lastName 
        })
      });

      // Succès : stocker le token et l'utilisateur
      localStorage.setItem('auth_token', data.token);
      setToken(data.token);
      setUser(data.user);
      
      return { success: true };
      
    } catch (error) {
      console.error('⚠ Erreur register:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de l\'inscription' 
      };
    }
  };

  const logout = async () => {
    try {
      if (token) {
        await apiRequest('/auth/logout', {
          method: 'POST',
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error('⚠ Erreur logout:', error);
      // Continuer le logout même en cas d'erreur
    } finally {
      // Nettoyer toujours l'état local
      localStorage.removeItem('auth_token');
      setToken(null);
      setUser(null);
    }
  };

  const updateProfile = async (profileData) => {
    try {
      const updatedUser = await apiRequest('/auth/profile', {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: JSON.stringify(profileData)
      });

      setUser(updatedUser.user);
      return { success: true, user: updatedUser.user };
      
    } catch (error) {
      console.error('⚠ Erreur updateProfile:', error);
      return { 
        success: false, 
        error: error.message || 'Erreur lors de la mise à jour' 
      };
    }
  };

// Nouvelle fonction de suppression de compte
const deleteAccount = async (currentPassword) => {
  try {
    if (!currentPassword) {
      return { 
        success: false, 
        error: 'Mot de passe requis pour la suppression' 
      };
    }

    console.log('🗑️ Suppression du compte en cours...');

    const response = await apiRequest('/auth/delete-account', {
      method: 'DELETE',
      headers: { 
        "Content-Type": "application/json",   // ✅ correction ajoutée
        Authorization: `Bearer ${token}` 
      },
      body: JSON.stringify({ current_password: currentPassword })
    });

    console.log('✅ Compte supprimé avec succès');

    // Nettoyer l'état local après suppression
    localStorage.removeItem('auth_token');
    setToken(null);
    setUser(null);
    
    return { 
      success: true, 
      message: response.message || 'Compte supprimé avec succès' 
    };
    
  } catch (error) {
    console.error('⚠ Erreur deleteAccount:', error);
    return { 
      success: false, 
      error: error.message || 'Erreur lors de la suppression du compte' 
    };
  }
};


  // Fonction utilitaire pour faire des requêtes authentifiées
  const authenticatedRequest = async (endpoint, options = {}) => {
    if (!token) {
      throw new Error('Non authentifié');
    }

    return await apiRequest(endpoint, {
      ...options,
      headers: {
        ...options.headers,
        Authorization: `Bearer ${token}`
      }
    });
  };

  return (
    <AuthContext.Provider value={{
      user,
      token,
      loading,
      login,
      register,
      logout,
      updateProfile,
      deleteAccount,
      authenticatedRequest,
      isAuthenticated: !!user,
      isAdmin: user?.role === 'admin'
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export default AuthProvider;