import React from 'react';
import { motion } from 'framer-motion';
import Card, { CardHeader, CardTitle, CardContent } from './ui/Card';
import DocumentIcon from '../icons/DocumentIcon';

const AuditDetailsTable = ({ audits, title }) => {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.95 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: 0.1 }}
    >
      <Card className="shadow-lg bg-white rounded-2xl mt-4">
        <CardHeader>
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent className="p-6 md:p-8">
          {audits.length === 0 ? (
            <div className="text-center text-gray-500 italic py-8">
              <DocumentIcon className="h-12 w-12 mx-auto mb-4 text-gray-300" />
              <p>Aucun audit dans cette catégorie.</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Titre</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Exigence</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Propriétaire</th>
                    <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Plan d'action</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  {audits.map((audit) => (
                    <tr key={audit.id}>
                      <td className="px-4 py-2 whitespace-nowrap text-sm font-medium text-gray-900">{audit.titre}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{audit.exigence}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{audit.owner}</td>
                      <td className="px-4 py-2 whitespace-nowrap text-sm text-gray-600">{audit.plan_action}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </CardContent>
      </Card>
    </motion.div>
  );
};

export default AuditDetailsTable;