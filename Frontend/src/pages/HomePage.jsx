import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { Pie, Bar } from 'react-chartjs-2';
import { Chart as ChartJS, ArcElement, Tooltip, Legend, CategoryScale, LinearScale, BarElement, Title } from 'chart.js';

// Enregistrement des composants Chart.js
ChartJS.register(
  ArcElement,
  Tooltip,
  Legend,
  CategoryScale,
  LinearScale,
  BarElement,
  Title
);

// --- 1. Composants utilitaires de base (Button, Card, etc.) ---

const Button = ({ children, size, variant, className, ...props }) => {
  const baseStyle = "font-semibold rounded-xl focus:outline-none focus:ring-4 focus:ring-offset-2 transition-all duration-300 transform hover:scale-[1.02] active:scale-[0.98] shadow-lg";
  const sizeStyle = {
    lg: "px-10 py-5 text-lg",
  }[size] || "px-8 py-4 text-base";
  const variantStyle = {
    primary: "bg-gradient-to-r from-blue-600 to-blue-700 text-white hover:from-blue-700 hover:to-blue-800 focus:ring-blue-500 shadow-blue-500/50",
    secondary: "bg-white text-blue-600 hover:bg-gray-50 focus:ring-blue-500 border border-blue-200 shadow-none hover:shadow-md",
    outline: "border-2 border-white text-white hover:bg-white hover:text-blue-600 focus:ring-white backdrop-blur-sm shadow-white/20 hover:shadow-white/40",
  }[variant] || "bg-gray-200 text-gray-800 hover:bg-gray-300 focus:ring-gray-400";

  return (
    <button className={`${baseStyle} ${sizeStyle} ${variantStyle} ${className}`} {...props}>
      {children}
    </button>
  );
};

const Card = ({ children, className, ...props }) => (
  <div className={`bg-white shadow-xl rounded-3xl border border-gray-100/70 backdrop-blur-sm hover:shadow-2xl transition-all duration-300 ${className}`} {...props}>
    {children}
  </div>
);

const CardHeader = ({ children, className, ...props }) => (
  <div className={`p-8 border-b border-gray-100 ${className}`} {...props}>
    {children}
  </div>
);

const CardTitle = ({ children, className, ...props }) => (
  <h3 className={`text-xl font-bold text-gray-900 ${className}`} {...props}>
    {children}
  </h3>
);

const CardContent = ({ children, className, ...props }) => (
  <div className={`p-8 ${className}`} {...props}>
    {children}
  </div>
);

// Composant pour l'état de chargement
const StatCardSkeleton = () => (
    <Card className="h-full animate-pulse">
        <CardContent className="space-y-6 text-center">
            <div className="w-16 h-16 mx-auto bg-gray-200 rounded-2xl"></div>
            <div className="space-y-2">
                <div className="h-10 w-3/4 mx-auto bg-gray-200 rounded-lg"></div>
                <div className="h-4 w-1/2 mx-auto bg-gray-200 rounded"></div>
            </div>
        </CardContent>
    </Card>
);

// --- 2. Composants d'icônes (DOIVENT être déclarés AVANT STATUS_STYLES) ---

const DocumentIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5h-7a2 2 0 01-2-2V5a2 2 0 012-2h7a2 2 0 012 2v14a2 2 0 01-2 2z" />
  </svg>
);

const CheckCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const XCircleIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
  </svg>
);

const CloudIcon = (props) => (
  <svg {...props} xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M3 15a4 4 0 004-4h10a3 3 0 003 3v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6z" />
  </svg>
);


// --- 3. Configuration des styles (PEUT MAINTENANT utiliser les icônes) ---

const STATUS_STYLES = {
  total: { icon: DocumentIcon, label: "Total de textes", iconBg: 'from-blue-600 to-indigo-700', hoverBg: 'from-blue-700 to-indigo-800' },
  conformes: { icon: CheckCircleIcon, label: "Audits Conformes", iconBg: 'from-green-500 to-emerald-600', hoverBg: 'from-green-600 to-emerald-700' },
  non_conformes: { icon: XCircleIcon, label: "Non-Conformes", iconBg: 'from-red-500 to-pink-600', hoverBg: 'from-red-600 to-pink-700' },
  non_applicables: { icon: DocumentIcon, label: "Non Applicables", iconBg: 'from-gray-500 to-slate-600', hoverBg: 'from-gray-600 to-slate-700' },
  en_attente: { icon: DocumentIcon, label: "En Attente", iconBg: 'from-amber-500 to-yellow-600', hoverBg: 'from-amber-600 to-yellow-700' },
};

// Nouveau composant modulaire pour les cartes de statistiques
const StatCard = ({ itemKey, value }) => {
    const { icon: Icon, label, iconBg, hoverBg } = STATUS_STYLES[itemKey];

    return (
        <Card 
            className="group hover:scale-[1.02] transition-all duration-300 cursor-pointer overflow-hidden relative card-interactive"
        >
            <div className={`absolute inset-0 bg-gradient-to-br ${hoverBg} opacity-0 group-hover:opacity-5 transition-opacity duration-300`}></div>
            <CardContent className="space-y-6 text-center relative z-10">
                <div className={`w-16 h-16 mx-auto rounded-2xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-xl shadow-gray-200/50`}>
                    <Icon className="h-8 w-8 text-white drop-shadow-sm" />
                </div>
                <div className="space-y-2">
                    <p className={`text-4xl sm:text-5xl font-extrabold bg-gradient-to-br ${iconBg} bg-clip-text text-transparent`}>
                        {value}
                    </p>
                    <p className="text-sm font-semibold text-gray-600 tracking-wide">
                        {label}
                    </p>
                </div>
            </CardContent>
        </Card>
    );
};

// --- 4. Composant principal de la page (Logique inchangée) ---

const HomePage = () => {
  const { user, token } = useAuth();
  const [stats, setStats] = useState({
    total: 0,
    conformes: 0,
    non_conformes: 0,
    non_applicables: 0,
    en_attente: 0,
    conformiteRate: 0,
    completionRate: 0,
  });
  const [isLoading, setIsLoading] = useState(true); // État de chargement

  const API_BASE = process.env.REACT_APP_API_URL || 'http://localhost:3001/api';

  useEffect(() => {
    const fetchStats = async () => {
      if (!token) {
        setIsLoading(false); 
        return;
      }

      setIsLoading(true); 

      try {
        const response = await fetch(`${API_BASE}/reglementation`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (response.ok) {
          const regulations = await response.json();
          const total = regulations.length;

          let conformes = 0;
          let non_conformes = 0;
          let non_applicables = 0;
          let en_attente = 0;
          
          const normalizeValue = (value) => value?.toString().trim().toLowerCase() || "";
          
          regulations.forEach(r => {
            const normalizedConformite = normalizeValue(r.conformite);
            switch (normalizedConformite) {
              case "conforme":
                conformes++;
                break;
              case "non conforme":
              case "nonconforme":
                non_conformes++;
                break;
              case "non applicable":
              case "nonapplicable":
                non_applicables++;
                break;
              default:
                en_attente++;
                break;
            }
          });

          const totalAudited = conformes + non_conformes + non_applicables;
          const conformiteRate = totalAudited > 0 ? ((conformes + non_applicables) / totalAudited * 100).toFixed(1) : 0;
          const completionRate = total > 0 ? ((totalAudited / total) * 100).toFixed(1) : 0;
          
          setStats({
            total,
            conformes,
            non_conformes,
            non_applicables,
            en_attente,
            conformiteRate,
            completionRate,
          });
        }
      } catch (error) {
        console.error("Erreur de l'API:", error);
      } finally {
        setIsLoading(false); 
      }
    };

    fetchStats();
  }, [token]);

  // Données pour les graphiques avec couleurs améliorées
  const conformityData = {
    labels: ['Conformes', 'Non conformes', 'Non applicables', 'En attente'],
    datasets: [{
      data: [stats.conformes, stats.non_conformes, stats.non_applicables, stats.en_attente],
      backgroundColor: [
        'rgba(16, 185, 129, 0.9)', 
        'rgba(239, 68, 68, 0.9)', 
        'rgba(107, 114, 128, 0.9)',
        'rgba(245, 158, 11, 0.9)'
      ],
      borderColor: [
        'rgba(16, 185, 129, 1)',
        'rgba(239, 68, 68, 1)',
        'rgba(107, 114, 128, 1)',
        'rgba(245, 158, 11, 1)'
      ],
      borderWidth: 2,
    }]
  };

  const containerVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: {
      opacity: 1,
      y: 0,
      transition: {
        delayChildren: 0.2,
        staggerChildren: 0.1
      }
    }
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1
    }
  };

  return (
    <div className="min-h-screen bg-gray-50/50 backdrop-blur-3xl"> 
      <div className="max-w-7xl mx-auto py-12 sm:py-16 lg:py-20 px-4 sm:px-6 lg:px-8">
        
        {/* Section héro améliorée */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={containerVariants}
          className="text-center relative py-12 sm:py-16"
        >
          {/* Éléments décoratifs en arrière-plan */}
          <div className="absolute inset-0 overflow-hidden pointer-events-none">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-blue-100 rounded-full opacity-30 animate-pulse-slow blur-xl"></div>
            <div className="absolute top-20 -right-10 w-52 h-52 bg-indigo-100 rounded-full opacity-30 animate-pulse-slow delay-1000 blur-xl"></div>
          </div>

          <motion.div
            variants={itemVariants}
            className="flex justify-center mb-8 relative z-10"
          >
            <div className="w-24 h-24 sm:w-32 sm:h-32 bg-gradient-to-br from-blue-600 to-indigo-700 rounded-3xl flex items-center justify-center shadow-2xl shadow-blue-500/40 transform hover:rotate-3 transition-transform duration-300">
              <CloudIcon className="h-12 w-12 sm:h-16 sm:w-16 text-white drop-shadow-lg" />
            </div>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="text-4xl sm:text-6xl md:text-7xl lg:text-8xl font-extrabold tracking-tight text-gray-900 relative z-10 text-balance leading-tight"
          >
            Bienvenue sur{' '}
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
             Reglo+
            </span>
          </motion.h1>
          
          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-4xl mx-auto text-lg sm:text-xl md:text-2xl text-gray-600 leading-relaxed relative z-10 text-pretty font-medium"
          >
            Une plateforme intelligente qui simplifie et centralise l'audit et la gestion de votre conformité réglementaire en matière de santé & sécurité au travail, gestion des risques industriels et environnementale majeurs.
            Gagnez du temps, réduisez les risques et assurez une conformité continue.
          </motion.p>

          <motion.p
            variants={itemVariants}
            className="mt-4 max-w-2xl mx-auto text-sm text-gray-400 font-semibold tracking-wider uppercase relative z-10"
          >
            Développé par le bureau d'étude Smart Safety Services-             <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
             3S
            </span>
          </motion.p>

        </motion.div>

        {/* Section des statistiques améliorée */}
        {user && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="mt-24"
          >
            <div className="text-center mb-12">
              <h2 className="text-3xl md:text-4xl font-bold bg-gradient-to-r from-gray-900 to-gray-700 bg-clip-text text-transparent mb-4">
                Vos performances en un coup d'œil
              </h2>
              <div className="w-24 h-1 bg-gradient-to-r from-blue-500 to-indigo-500 mx-auto rounded-full"></div>
            </div>
            
            {isLoading ? (
              // Affichage du Skeleton Loader
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
                {[...Array(5)].map((_, i) => <StatCardSkeleton key={i} />)}
              </div>
            ) : (
              // Affichage des cartes de stats
              <div className="grid grid-cols-2 lg:grid-cols-5 gap-6 lg:gap-8">
                {/* Carte de Complétion (Colonne 1) */}
                <motion.div
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.9, duration: 0.5 }}
                >
                    <Card className="h-full border-2 border-indigo-100 bg-indigo-50/50">
                        <CardContent className="space-y-4 text-center">
                            <CardTitle className="text-indigo-700">Taux de Complétion</CardTitle>
                            <div className="text-6xl font-extrabold text-indigo-600">
                                {stats.completionRate}%
                            </div>
                            <p className="text-sm font-semibold text-gray-500">Audits effectués / Total</p>
                        </CardContent>
                    </Card>
                </motion.div>

                {/* Autres Stats (Colonnes 2 à 5) */}
                {[
                  { key: 'conformes', value: stats.conformes },
                  { key: 'non_conformes', value: stats.non_conformes },
                  { key: 'non_applicables', value: stats.non_applicables },
                  { key: 'en_attente', value: stats.en_attente },
                ].map((item, index) => (
                  <motion.div
                    key={item.key}
                    initial={{ opacity: 0, y: 20, scale: 0.9 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={{ delay: 0.9 + (index + 1) * 0.1, duration: 0.5 }}
                  >
                    <StatCard itemKey={item.key} value={item.value} />
                  </motion.div>
                ))}
              </div>
            )}
          </motion.div>
        )}

        {/* Section graphiques améliorée */}
        {user && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1.2, duration: 0.6 }}
            className="mt-24"
          >
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-12">
              <motion.div
                initial={{ opacity: 0, x: -50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.4, duration: 0.6 }}
              >
                <Card className="h-full">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-indigo-600">
                      Répartition par Conformité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex items-center justify-center p-4 md:p-8">
                    <div className="h-64 sm:h-80 w-full flex items-center justify-center">
                      <Pie 
                        data={conformityData} 
                        options={{
                          responsive: true,
                          maintainAspectRatio: false,
                          plugins: {
                            legend: {
                              position: 'bottom',
                              labels: { padding: 20, usePointStyle: true }
                            },
                            tooltip: {
                                callbacks: {
                                    label: (context) => {
                                        let label = context.label || '';
                                        if (label) label += ': ';
                                        if (context.parsed !== null) label += context.parsed;
                                        return label;
                                    }
                                }
                            }
                          },
                        }}
                      />
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
              
              <motion.div
                initial={{ opacity: 0, x: 50 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 1.5, duration: 0.6 }}
              >
                <Card className="h-full flex flex-col">
                  <CardHeader className="text-center">
                    <CardTitle className="text-2xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-green-600 to-blue-600">
                      Taux de Conformité Audité
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="flex-1 flex flex-col justify-center space-y-8 p-4 md:p-8">
                    <div className="text-center">
                      <div className="text-7xl font-extrabold bg-clip-text text-transparent bg-gradient-to-r from-green-500 to-teal-600 mb-2 drop-shadow-lg">
                        {stats.conformiteRate}%
                      </div>
                      <p className="text-gray-600 font-semibold text-lg">Conformité (Conformes + Non applicables) sur total audité</p>
                    </div>
                    
                    <div className="space-y-4">
                      <div className="flex justify-between items-center">
                        <span className="text-base font-semibold text-gray-700">Performance actuelle</span>
                        <span className="text-base font-bold text-green-600">{stats.conformiteRate}%</span>
                      </div>
                      <div className="relative">
                        <div className="overflow-hidden h-6 rounded-full bg-gray-200">
                          <motion.div
                            style={{ width: `${stats.conformiteRate}%` }}
                            initial={{ width: '0%' }}
                            animate={{ width: `${stats.conformiteRate}%` }}
                            transition={{ duration: 2, ease: "easeInOut" }}
                            className="h-full bg-gradient-to-r from-green-500 to-teal-600 rounded-full shadow-lg relative overflow-hidden"
                          >
                            <div className="absolute inset-0 bg-white opacity-20 animate-pulse"></div>
                          </motion.div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            </div>
          </motion.div>
        )}
        
        {/* Call to action amélioré */}
        <motion.div
          initial={{ opacity: 0, y: 60 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.6, duration: 0.8 }}
          className="relative mt-20 sm:mt-32 overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-700 via-indigo-700 to-blue-800 rounded-3xl shadow-2xl shadow-blue-500/50"></div>
          
          {/* Éléments décoratifs */}
          <div className="absolute top-0 left-0 w-full h-full overflow-hidden rounded-3xl">
            <div className="absolute -top-10 -left-10 w-40 h-40 bg-white opacity-10 rounded-full"></div>
            <div className="absolute -bottom-10 -right-10 w-60 h-60 bg-white opacity-5 rounded-full"></div>
          </div>
          
          <div className="relative z-10 p-8 sm:p-12 lg:p-16 text-center text-white">
            <motion.h2 
              className="text-3xl sm:text-4xl md:text-5xl font-extrabold mb-4 sm:mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 1.8 }}
            >
              Prêt à transformer votre entreprise ?
            </motion.h2>
            <motion.p 
              className="text-indigo-100 text-lg sm:text-xl mb-8 sm:mb-10 max-w-3xl mx-auto leading-relaxed"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.0 }}
            >
              Rejoignez les entreprises qui font confiance à notre plateforme pour leur conformité réglementaire.
              <br />
              <span className="text-white font-extrabold tracking-wide">Commencez dès aujourd'hui</span> et prenez le contrôle.
            </motion.p>
            <motion.div 
              className="flex flex-col sm:flex-row gap-4 sm:gap-6 justify-center"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 2.2 }}
            >
              <Link to="/reglementation">
                <Button 
                  size="lg" 
                  variant="secondary" 
                  className="text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 font-bold hover:shadow-2xl w-full sm:w-auto"
                >
                  🚀 Commencer l'Audit
                </Button>
              </Link>
              <Link to="/recap">
                <Button 
                  size="lg" 
                  variant="outline" 
                  className="text-lg sm:text-xl px-8 sm:px-12 py-4 sm:py-5 font-bold hover:shadow-2xl w-full sm:w-auto"
                >
                  📊 Voir le Tableau de Bord
                </Button>
              </Link>
            </motion.div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default HomePage;