import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import { useNavigate } from 'react-router-dom';
import Card, { CardHeader, CardTitle, CardContent } from '../components/ui/Card';

const ProfilePage = () => {
  const { user, deleteAccount } = useAuth();
  const navigate = useNavigate();
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [confirmationText, setConfirmationText] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [deleteError, setDeleteError] = useState('');

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <p className="text-gray-600 text-lg">Vous devez être connecté pour voir cette page.</p>
      </div>
    );
  }

  const handleDeleteAccount = async () => {
    // Vérifications de sécurité
    if (confirmationText !== 'SUPPRIMER') {
      setDeleteError('Veuillez taper "SUPPRIMER" pour confirmer');
      return;
    }

    if (!currentPassword) {
      setDeleteError('Veuillez saisir votre mot de passe actuel');
      return;
    }

    setDeleteLoading(true);
    setDeleteError('');

    try {
      const result = await deleteAccount(currentPassword);
      
      if (result.success) {
        // Rediriger vers la page d'accueil après suppression
        navigate('/', { 
          state: { 
            message: 'Votre compte a été supprimé avec succès', 
            type: 'success' 
          } 
        });
      } else {
        setDeleteError(result.error || 'Erreur lors de la suppression du compte');
      }
    } catch (error) {
      setDeleteError('Erreur inattendue lors de la suppression');
    } finally {
      setDeleteLoading(false);
    }
  };

  const resetDeleteModal = () => {
    setShowDeleteModal(false);
    setConfirmationText('');
    setCurrentPassword('');
    setDeleteError('');
  };

  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8 flex justify-center">
      <div className="max-w-2xl w-full space-y-6">
        {/* Carte profil existante */}
        <Card className="shadow-lg">
          <CardHeader className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="w-20 h-20 bg-blue-600 rounded-full flex items-center justify-center text-white text-3xl font-bold">
                {user.first_name?.charAt(0)?.toUpperCase() || 'U'}
              </div>
            </div>
            <CardTitle className="text-2xl font-bold">Mon Profil</CardTitle>
            <p className="text-gray-500">Informations personnelles</p>
          </CardHeader>

          <CardContent className="space-y-4">
            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-600">Prénom</span>
              <span className="font-medium">{user.first_name}</span>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-600">Nom</span>
              <span className="font-medium">{user.last_name}</span>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-600">Email</span>
              <span className="font-medium">{user.email}</span>
            </div>

            <div className="flex items-center justify-between border-b pb-3">
              <span className="text-gray-600">Rôle</span>
              <span className="font-medium capitalize">{user.role}</span>
            </div>
          </CardContent>
        </Card>

        {/* carte de suppression de compte */}
        <Card className="border border-gray-200 shadow-sm">
          <CardContent>
            <div className="flex items-center justify-between py-4">
              <div>
                <h3 className="text-sm font-medium text-gray-900">
                  Supprimer mon compte
                </h3>
                <p className="text-xs text-gray-500">
                  Cette action est irréversible. Toutes vos données seront perdues.
                </p>
              </div>
              <button
                onClick={() => setShowDeleteModal(true)}
                className="text-sm font-medium text-red-600 hover:text-red-700 hover:underline"
              >
                Supprimer
              </button>
            </div>
          </CardContent>
        </Card>

      </div>

      {/* Modal de confirmation de suppression */}
      {showDeleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-lg max-w-md w-full p-6">
            <div className="text-center mb-6">
              <div className="mx-auto flex items-center justify-center h-12 w-12 rounded-full bg-red-100 mb-4">
                <svg className="h-6 w-6 text-red-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.732-.833-2.464 0L3.34 16.5c-.77.833.192 2.5 1.732 2.5z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-gray-900 mb-2">
                Confirmer la suppression du compte
              </h3>
              <p className="text-sm text-gray-600 mb-4">
                Cette action est définitive. Toutes vos données seront perdues.
              </p>
            </div>

            {deleteError && (
              <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
                {deleteError}
              </div>
            )}

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Tapez "SUPPRIMER" pour confirmer :
                </label>
                <input
                  type="text"
                  value={confirmationText}
                  onChange={(e) => setConfirmationText(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="SUPPRIMER"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Mot de passe actuel :
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  placeholder="Votre mot de passe"
                />
              </div>
            </div>

            <div className="flex space-x-3 mt-6">
              <button
                onClick={resetDeleteModal}
                disabled={deleteLoading}
                className="flex-1 px-4 py-2 border border-gray-300 text-gray-700 rounded-md hover:bg-gray-50 transition-colors duration-200 disabled:opacity-50"
              >
                Annuler
              </button>
              <button
                onClick={handleDeleteAccount}
                disabled={deleteLoading || confirmationText !== 'SUPPRIMER' || !currentPassword}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {deleteLoading ? 'Suppression...' : 'Supprimer définitivement'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;