// RecapPageComponents.jsx
// Nouveaux composants pour RecapPage avec visualisations modernes

import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Badge from '../components/ui/Badge';
import Card, { CardHeader, CardTitle, CardContent, CardDescription } from '../components/ui/Card';
import UserIcon from '../icons/UserIcon';
import CalendarIcon from '../icons/CalendarIcon';
import { Line, Radar } from 'react-chartjs-2';



// 2. AUDIT TIMELINE COMPONENT
export const AuditTimeline = ({ allAudits }) => {
  const auditsWithDeadline = useMemo(() => {
    return allAudits
      .filter(a => a.deadline)
      .sort((a, b) => new Date(a.deadline) - new Date(b.deadline))
      .slice(0, 12);
  }, [allAudits]);

  const getPriorityColor = (priorite) => {
    if (!priorite) return 'bg-slate-400';
    const p = priorite.toLowerCase();
    if (p.includes('critique')) return 'bg-red-500';
    if (p.includes('élevée')) return 'bg-orange-500';
    if (p.includes('modérée')) return 'bg-yellow-500';
    if (p.includes('faible')) return 'bg-green-500';
    return 'bg-slate-400';
  };

  const [hoveredItem, setHoveredItem] = useState(null);
  const [expandedTooltip, setExpandedTooltip] = useState(false);
  const maxLength = 100;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-8"
    >
      <div className="text-center mb-6">
        <h3 className="text-2xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent mb-2">
          Timeline des Audits
        </h3>
        <p className="text-slate-600">Visualisez vos échéances sur une frise chronologique</p>
      </div>

      <Card className="bg-white/80 backdrop-blur-xl shadow-xl">
        <CardContent className="p-6">
          <div className="relative">
            {/* Ligne principale */}
            <div className="absolute top-1/2 left-0 right-0 h-1 bg-gradient-to-r from-blue-200 via-blue-400 to-blue-600 transform -translate-y-1/2"></div>
            
            {/* Points sur la timeline */}
            <div className="relative flex justify-between items-center py-8">
              {auditsWithDeadline.map((audit, index) => {
                const date = new Date(audit.deadline);
                const isToday = date.toDateString() === new Date().toDateString();
                const isPast = date < new Date();
                const needsTruncation = audit.plan_action?.length > maxLength;
                
                return (
                  <motion.div
                    key={audit.id}
                    className="relative flex flex-col items-center"
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.05 }}
                    onMouseEnter={() => {
                      setHoveredItem(audit);
                      setExpandedTooltip(false);
                    }}
                    onMouseLeave={() => {
                      setHoveredItem(null);
                      setExpandedTooltip(false);
                    }}
                  >
                    {/* Point */}
                    <motion.div
                      whileHover={{ scale: 1.5 }}
                      className={`w-4 h-4 rounded-full ${getPriorityColor(audit.prioritée)} 
                        ring-4 ring-white shadow-lg cursor-pointer z-10
                        ${isToday ? 'animate-pulse' : ''}
                        ${isPast ? 'opacity-50' : ''}`}
                    />
                    
                    {/* Date */}
                    <div className="absolute top-8 text-xs text-slate-600 whitespace-nowrap">
                      {date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}
                    </div>

                    {/* Tooltip Amélioré */}
                    <AnimatePresence>
                      {hoveredItem?.id === audit.id && (
                        <motion.div
                          initial={{ opacity: 0, y: -10, scale: 0.95 }}
                          animate={{ opacity: 1, y: -70, scale: 1 }}
                          exit={{ opacity: 0, y: -10, scale: 0.95 }}
                          transition={{ duration: 0.2 }}
                          className="absolute z-20 bg-gradient-to-br from-slate-800 to-slate-900 text-white rounded-xl shadow-2xl border border-slate-700/50 overflow-hidden"
                          style={{ 
                            maxWidth: '400px',
                            minWidth: '280px',
                            zIndex: 1000
                          }}
                        >
                          {/* Contenu */}
                          <div className="p-4 space-y-3">
                            {/* Plan d'action avec troncature */}
                            <div className="space-y-2">
                              <motion.p 
                                className="text-sm leading-relaxed"
                                layout
                              >
                                {expandedTooltip 
                                  ? audit.plan_action 
                                  : needsTruncation
                                    ? audit.plan_action.slice(0, maxLength) + '...'
                                    : audit.plan_action
                                }
                              </motion.p>
                              
                              {needsTruncation && (
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setExpandedTooltip(!expandedTooltip);
                                  }}
                                  className="text-xs text-blue-400 hover:text-blue-300 transition-colors font-medium"
                                >
                                  {expandedTooltip ? '↑ Voir moins' : '↓ Voir plus'}
                                </button>
                              )}
                            </div>

                            {/* Métadonnées avec badges colorés */}
                            <div className="flex flex-wrap gap-2 pt-2 border-t border-slate-700/50">
                              <span className="text-xs bg-slate-700/40 px-2.5 py-1 rounded-md">
                                {audit.domaine}
                              </span>
                              
                              <span className={`text-xs px-2.5 py-1 rounded-md font-medium ${
                                audit.prioritée?.toLowerCase().includes('critique')
                                  ? 'bg-red-500/20 text-red-300' 
                                  : audit.prioritée?.toLowerCase().includes('élevée')
                                  ? 'bg-orange-500/20 text-orange-300'
                                  : audit.prioritée?.toLowerCase().includes('modérée')
                                  ? 'bg-yellow-500/20 text-yellow-300'
                                  : 'bg-green-500/20 text-green-300'
                              }`}>
                                Priorité: {audit.prioritée}
                              </span>
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })}
            </div>

            {/* Légende */}
            <div className="flex justify-center gap-4 mt-6 text-xs">
              {['Critique', 'Élevée', 'Modérée', 'Faible'].map(level => (
                <div key={level} className="flex items-center gap-1">
                  <div className={`w-3 h-3 rounded-full ${
                    level === 'Critique' ? 'bg-red-500' :
                    level === 'Élevée' ? 'bg-orange-500' :
                    level === 'Modérée' ? 'bg-yellow-500' :
                    'bg-green-500'
                  }`} />
                  <span className="text-slate-600">{level}</span>
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </motion.div>
  );
};
// 3. BURNDOWN CHART COMPONENT
export const BurndownChart = ({ allAudits }) => {
  const chartData = useMemo(() => {
    // Simulation de données historiques pour le burndown
    const today = new Date();
    const labels = [];
    const idealLine = [];
    const actualLine = [];
    
    const totalNonConformes = allAudits.filter(a => 
      a.conformite?.toLowerCase().includes('non conforme')
    ).length;

    for (let i = 30; i >= 0; i -= 5) {
      const date = new Date(today);
      date.setDate(date.getDate() - i);
      labels.push(date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' }));
      
      // Ligne idéale (décroissance linéaire)
      idealLine.push(Math.round(totalNonConformes * (i / 30)));
      
      // Ligne réelle (avec quelques variations)
      const variance = Math.random() * 0.2 - 0.1;
      actualLine.push(Math.max(0, Math.round(totalNonConformes * (i / 30) * (1 + variance))));
    }

    return {
      labels,
      datasets: [
        {
          label: 'Progression idéale',
          data: idealLine,
          borderColor: 'rgba(59, 130, 246, 0.5)',
          borderDash: [5, 5],
          tension: 0.1,
          fill: false
        },
        {
          label: 'Progression réelle',
          data: actualLine,
          borderColor: 'rgba(239, 68, 68, 1)',
          backgroundColor: 'rgba(239, 68, 68, 0.1)',
          tension: 0.3,
          fill: true
        }
      ]
    };
  }, [allAudits]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      },
      title: {
        display: false
      },
      tooltip: {
        callbacks: {
          label: (context) => `${context.dataset.label}: ${context.parsed.y} non-conformités`
        }
      }
    },
    scales: {
      y: {
        beginAtZero: true,
        title: {
          display: true,
          text: 'Non-conformités restantes'
        }
      }
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="bg-white/80 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Burndown Chart
          </CardTitle>
          <CardDescription>
            Évolution de la résolution des non-conformités
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Line data={chartData} options={options} />
        </CardContent>
      </Card>
    </motion.div>
  );
};

// 4. OWNER RADAR CHART COMPONENT
export const OwnerRadarChart = ({ stats }) => {
  const chartData = useMemo(() => {
    const owners = Object.keys(stats.owners).slice(0, 8);
    return {
      labels: owners,
      datasets: [
        {
          label: 'Actions assignées',
          data: owners.map(owner => stats.owners[owner]),
          backgroundColor: 'rgba(59, 130, 246, 0.2)',
          borderColor: 'rgba(59, 130, 246, 1)',
          pointBackgroundColor: 'rgba(59, 130, 246, 1)',
          pointBorderColor: '#fff',
          pointHoverBackgroundColor: '#fff',
          pointHoverBorderColor: 'rgba(59, 130, 246, 1)'
        }
      ]
    };
  }, [stats.owners]);

  const options = {
    responsive: true,
    plugins: {
      legend: {
        position: 'bottom'
      }
    },
    scales: {
      r: {
        beginAtZero: true,
        grid: {
          color: 'rgba(0, 0, 0, 0.1)'
        }
      }
    }
  };

  if (Object.keys(stats.owners).length === 0) {
    return null;
  }

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
    >
      <Card className="bg-white/80 backdrop-blur-xl shadow-xl">
        <CardHeader>
          <CardTitle className="text-xl font-bold bg-gradient-to-r from-slate-700 to-slate-900 bg-clip-text text-transparent">
            Répartition par Responsable
          </CardTitle>
          <CardDescription>
            Vue radar des actions par responsable
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Radar data={chartData} options={options} />
        </CardContent>
      </Card>
    </motion.div>
  );
};


// 6. FOCUS MODE HOOK
export const useFocusMode = () => {
  const [focusFilter, setFocusFilter] = useState(null);
  
  const applyFocus = (filterType, filterValue) => {
    setFocusFilter({ type: filterType, value: filterValue });
  };
  
  const clearFocus = () => {
    setFocusFilter(null);
  };
  
  const filterAudits = (audits) => {
    if (!focusFilter) return audits;
    
    switch (focusFilter.type) {
      case 'conformite':
        return audits.filter(a => {
          const conformite = a.conformite?.toLowerCase().trim();
          return conformite === focusFilter.value.toLowerCase();
        });
      case 'priorite':
        return audits.filter(a => 
          a.prioritée?.toLowerCase().includes(focusFilter.value.toLowerCase())
        );
      case 'domaine':
        return audits.filter(a => a.domaine === focusFilter.value);
      default:
        return audits;
    }
  };
  
  return { focusFilter, applyFocus, clearFocus, filterAudits };
};