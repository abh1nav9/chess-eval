import type { ReactNode } from 'react';
import { motion } from 'framer-motion';

interface PageShellProps {
  children: ReactNode;
  className?: string;
  maxWidth?: string;
}

export function PageShell({ children, className = '' }: PageShellProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
      className={`w-full flex-1 flex flex-col ${className}`}
    >
      {children}
    </motion.div>
  );
}
