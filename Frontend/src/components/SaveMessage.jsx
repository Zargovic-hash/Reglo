import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircleIcon, AlertCircleIcon } from "../icons/icon";

const SaveMessage = ({ saveMessage }) => {
  return (
    <AnimatePresence>
      {saveMessage && (
        <motion.div
          initial={{ opacity: 0, y: 50, scale: 0.9 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          exit={{ opacity: 0, y: 50, scale: 0.9 }}
          className={`fixed bottom-6 right-6 z-50 px-6 py-4 rounded-xl shadow-2xl border-0 backdrop-blur-sm ${
            saveMessage.type === 'success' 
              ? 'bg-gradient-to-r from-emerald-500 to-emerald-600 text-white' 
              : 'bg-gradient-to-r from-red-500 to-red-600 text-white'
          }`}
        >
          <div className="flex items-center space-x-3">
            {saveMessage.type === 'success' ? (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <CheckCircleIcon className="h-6 w-6" />
              </motion.div>
            ) : (
              <motion.div
                initial={{ scale: 0 }}
                animate={{ scale: 1 }}
                transition={{ delay: 0.1, type: "spring" }}
              >
                <AlertCircleIcon className="h-6 w-6" />
              </motion.div>
            )}
            <div>
              <span className="font-semibold text-sm">{saveMessage.text}</span>
              {saveMessage.type === 'success' && (
                <div className="flex items-center space-x-1 mt-1">
                  <div className="w-1 h-1 bg-white/60 rounded-full"></div>
                  <span className="text-xs text-white/80">Fermeture automatique dans 2s</span>
                </div>
              )}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SaveMessage;