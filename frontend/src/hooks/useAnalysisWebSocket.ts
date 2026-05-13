import { useEffect, useRef, useCallback } from 'react';
import { useAnalysisStore } from '@/store/analysisStore';
import { useGameStore } from '@/store/gameStore';
import type { PGNAnalysisResult } from '@/types';
import { gameSoundCoordinator } from '@/audio/GameSoundCoordinator';

const WS_BASE = import.meta.env.VITE_WS_URL ??
  `${window.location.protocol === 'https:' ? 'wss' : 'ws'}://${window.location.host}`;

const MAX_RECONNECT_DELAY = 16_000;
const INITIAL_RECONNECT_DELAY = 1_000;

export function useAnalysisWebSocket(analysisId: string | null) {
  const { setProgress, setPGNResult, setError } = useAnalysisStore();
  const { loadGame } = useGameStore();
  const socketRef = useRef<WebSocket | null>(null);
  const reconnectDelay = useRef(INITIAL_RECONNECT_DELAY);
  const reconnectTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const doneRef = useRef(false);

  const cleanup = useCallback(() => {
    if (reconnectTimer.current) {
      clearTimeout(reconnectTimer.current);
      reconnectTimer.current = null;
    }
    if (socketRef.current) {
      socketRef.current.onclose = null;
      socketRef.current.onmessage = null;
      socketRef.current.onerror = null;
      if (socketRef.current.readyState === WebSocket.OPEN) {
        socketRef.current.close();
      }
      socketRef.current = null;
    }
  }, []);

  const connect = useCallback(() => {
    if (!analysisId || doneRef.current) return;

    cleanup();

    const wsUrl = `${WS_BASE}/api/v1/ws/analysis/${analysisId}`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onmessage = (event) => {
      reconnectDelay.current = INITIAL_RECONNECT_DELAY;
      try {
        const data = JSON.parse(event.data) as Record<string, unknown>;

        if (data.type === 'progress') {
          const totalMoves = typeof data.total_moves === 'number' ? data.total_moves : 0;
          const moveIndex = typeof data.move_index === 'number' ? data.move_index : 0;
          const rawPct = typeof data.percentage === 'number' ? data.percentage : 0;
          const percentage = Math.min(100, Math.max(0, rawPct));
          const lastMove = data.last_move as { move?: string } | undefined;
          const currentSan =
            typeof data.current_san === 'string'
              ? data.current_san
              : typeof lastMove?.move === 'string'
                ? lastMove.move
                : null;
          const statusMessage = typeof data.status === 'string' ? data.status : null;

          setProgress({
            percentage,
            currentMove: totalMoves > 0 ? moveIndex + 1 : 0,
            totalMoves,
            currentSan,
            statusMessage,
          });
        } else if (data.type === 'completed') {
          doneRef.current = true;
          const result = data.result as PGNAnalysisResult;
          setPGNResult(result);
          if (result.pgn) {
            loadGame(result.pgn);
            gameSoundCoordinator.onPgnAnalysisReady(result.pgn);
          }
          socket.close();
        } else if (data.type === 'failed') {
          doneRef.current = true;
          setError(typeof data.error === 'string' ? data.error : 'Analysis failed');
          socket.close();
        }
      } catch {
        // Silently ignore parse errors
      }
    };

    socket.onclose = (e) => {
      if (doneRef.current) return;
      if (!e.wasClean && reconnectDelay.current < MAX_RECONNECT_DELAY) {
        reconnectTimer.current = setTimeout(() => {
          reconnectDelay.current = Math.min(reconnectDelay.current * 2, MAX_RECONNECT_DELAY);
          connect();
        }, reconnectDelay.current);
      }
    };

    socket.onerror = () => {
      // onerror is always followed by onclose — reconnect handled there
    };
  }, [analysisId, setProgress, setPGNResult, setError, loadGame, cleanup]);

  useEffect(() => {
    doneRef.current = false;
    reconnectDelay.current = INITIAL_RECONNECT_DELAY;
    connect();
    return cleanup;
  }, [connect, cleanup]);

  return socketRef.current;
}
