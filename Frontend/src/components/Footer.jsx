import React from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import { CheckIcon } from "@heroicons/react/24/solid";

const Footer = () => {
  const currentYear = new Date().getFullYear();

  const footerLinks = [
    { name: "Accueil", href: "/" },
    { name: "Tableau de bord", href: "/recap" },
    { name: "À propos", href: "/about" },
    { name: "Contact", href: "/contact" },
  ];

  return (
    <motion.footer
      className="bg-white border-t border-gray-200"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.4 }}
    >
      <div className="max-w-7xl mx-auto px-6 py-6">
        {/* Contenu principal */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-4">
 <Link to="/" className="flex items-center space-x-3 group">
              <motion.div 
                className="w-10 h-10 bg-gradient-to-br from-primary-600 to-accent-600 rounded-xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-300"
                whileHover={{ rotate: 5 }}
                transition={{ duration: 0.2 }}
              >
              <CheckIcon className="h-6 w-6 text-white" />              
              </motion.div>
              <div className="hidden sm:block">
                <h1 className="text-xl font-bold gradient-text">
                  Reglo+
                </h1>
                <p className="text-xs text-gray-500 -mt-1">
                  Audit Réglementaire
                </p>
              </div>
            </Link>
          <div className="text-sm text-gray-500">
            &copy; {currentYear} Reglo+. Tous droits réservés.
          </div>

          {/* Liens */}
          <nav className="flex gap-6 text-sm">
            {footerLinks.map((link) => (
              <Link
                key={link.name}
                to={link.href}
                className="text-gray-500 hover:text-gray-800 transition-colors"
              >
                {link.name}
              </Link>
            ))}
          </nav>
        </div>
      </div>
    </motion.footer>
  );
};

export default Footer;
