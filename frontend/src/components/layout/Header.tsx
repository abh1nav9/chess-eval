import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { Crown, BarChart3, Home } from 'lucide-react';

export function Header() {
  const location = useLocation();

  const navItems: any[] = [];

  return (
    <header className="h-14 border-b border-[var(--color-border-subtle)] bg-[var(--color-bg-primary)]/60 backdrop-blur-xl sticky top-0 z-40">
      <div className="h-full max-w-[1200px] mx-auto px-6 flex items-center justify-between">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 group">
          <div className="w-8 h-8 rounded-[var(--radius-md)] bg-[var(--color-accent)] flex items-center justify-center shadow-sm">
            <Crown size={18} className="text-[var(--color-accent-fg)]" />
          </div>
          <span className="text-base font-bold text-[var(--color-text-primary)] tracking-tight">
            ChessEval
          </span>
        </Link>

        {/* Navigation */}
        <nav className="flex items-center gap-1">
          {navItems.map((item) => {
            const isActive = location.pathname === item.path;
            return (
              <Link
                key={item.path}
                to={item.path}
                className={`
                  relative flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium
                  rounded-[var(--radius-sm)] transition-colors duration-200
                  ${isActive
                    ? 'text-[var(--color-text-primary)]'
                    : 'text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'
                  }
                `}
              >
                {item.icon}
                {item.label}
                {isActive && (
                  <motion.div
                    layoutId="nav-indicator"
                    className="absolute inset-0 bg-[var(--color-bg-hover)] rounded-[var(--radius-sm)] -z-10"
                    transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                  />
                )}
              </Link>
            );
          })}
        </nav>

        {/* Right side */}
        <div className="flex items-center gap-2">
          <div className="w-2 h-2 rounded-full bg-[var(--color-eval-positive)] animate-pulse" />
          <span className="text-xs text-[var(--color-text-muted)]">Engine Ready</span>
        </div>
      </div>
    </header>
  );
}
