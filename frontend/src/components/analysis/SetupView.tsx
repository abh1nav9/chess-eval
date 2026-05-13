import { useState } from 'react';
import { Card } from '@/components/ui/Card';
import { PGNInput } from '@/components/analysis/PGNInput';
import { FenSetupPanel } from '@/components/analysis/FenSetupPanel';
import { ChessComImport } from '@/components/analysis/ChessComImport';
import { LichessImport } from '@/components/analysis/LichessImport';
import { FileText, Hash, Sparkles, UserCircle, Globe } from 'lucide-react';
import { motion } from 'framer-motion';

export function SetupView() {
  const [inputMode, setInputMode] = useState<'pgn' | 'chesscom' | 'fen' | 'lichess'>('pgn');

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] max-w-2xl mx-auto w-full px-4">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-12"
      >
        <h1 className="text-4xl font-bold text-[var(--color-text-primary)] tracking-tight mb-4">
          Chess Game Analysis
        </h1>
        <p className="text-[var(--color-text-muted)] text-lg max-w-md mx-auto">
          Paste a PGN, upload a PGN file, or pull recent games from a public Chess.com or Lichess profile for engine insights and move
          classifications. Paste a FEN string for a position to analyze.
        </p>
      </motion.div>

      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="w-full"
      >
        <Card padding="lg" className="linear-card">
          <div className="flex gap-2 mb-6 p-1 bg-[var(--color-bg-hover)] rounded-[var(--radius-md)] border border-[var(--color-border-subtle)]">
            <button
              type="button"
              onClick={() => setInputMode('pgn')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                inputMode === 'pgn'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <FileText size={16} />
              PGN
            </button>
            <button
              type="button"
              onClick={() => setInputMode('chesscom')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                inputMode === 'chesscom'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <UserCircle size={16} />
              Chess.com
            </button>
            <button
              type="button"
              onClick={() => setInputMode('lichess')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                inputMode === 'lichess'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Globe size={16} />
              Lichess
            </button>
            <button
              type="button"
              onClick={() => setInputMode('fen')}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 text-sm font-medium rounded-[var(--radius-sm)] transition-all cursor-pointer ${
                inputMode === 'fen'
                  ? 'bg-[var(--color-accent)] text-[var(--color-accent-fg)] shadow-lg'
                  : 'text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)]'
              }`}
            >
              <Hash size={16} />
              FEN
            </button>
          </div>

          <div className="min-h-[300px]">
            {inputMode === 'pgn' ? (
              <PGNInput />
            ) : inputMode === 'chesscom' ? (
              <ChessComImport />
            ) : inputMode === 'lichess' ? (
              <LichessImport />
            ) : (
              <FenSetupPanel />
            )}
          </div>
        </Card>

        <div className="mt-8 flex items-center justify-center gap-6 text-[var(--color-text-muted)]">
          <div className="flex items-center gap-2 text-xs">
            <Sparkles size={14} className="text-[var(--color-accent)]" />
            <span>Stockfish 18</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <FileText size={14} className="text-[var(--color-accent)]" />
            <span>Move Classification</span>
          </div>
          <div className="flex items-center gap-2 text-xs">
            <Hash size={14} className="text-[var(--color-accent)]" />
            <span>Interactive Eval Graph</span>
          </div>
        </div>
      </motion.div>
    </div>
  );
}
