import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { typography, colors } from './constants';

export const Navigation = () => {
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  return (
    <motion.nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-500"
      style={{
        background: scrolled ? 'rgba(255,252,252,0.9)' : 'transparent',
        backdropFilter: scrolled ? 'blur(20px)' : 'none',
        borderBottom: scrolled ? `1px solid ${colors.neutral[100]}` : 'none',
      }}
    >
      <div className="mx-auto max-w-7xl px-6 lg:px-8">
        <div className="flex items-center justify-between h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center">
            <span
              className="text-2xl tracking-tight"
              style={{ ...typography.logo, fontWeight: 600, color: colors.neutral[900] }}
            >
              lently
            </span>
          </Link>

          {/* Nav Links */}
          <div className="hidden lg:flex items-center gap-10">
            {['Features', 'Pricing', 'FAQ'].map((item) => (
              <a
                key={item}
                href={`#${item.toLowerCase()}`}
                className="text-sm transition-colors hover:text-red-500"
                style={{ ...typography.body, color: colors.neutral[600] }}
              >
                {item}
              </a>
            ))}
          </div>

          {/* CTA Buttons */}
          <div className="flex items-center gap-4">
            <Link
              to="/login"
              className="hidden sm:block text-sm transition-colors hover:text-red-500"
              style={{ ...typography.body, color: colors.neutral[600] }}
            >
              Sign in
            </Link>
            <Link to="/signup">
              <motion.button
                className="px-5 py-2.5 rounded-xl text-sm text-white"
                style={{
                  ...typography.display,
                  fontWeight: 600,
                  background: colors.neutral[900],
                }}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                Get Started
              </motion.button>
            </Link>
          </div>
        </div>
      </div>
    </motion.nav>
  );
};
