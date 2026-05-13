import { BOARD_THEMES, type BoardThemeId } from '@/constants/boardTheme';
import { useUIStore } from '@/store/uiStore';

export function BoardThemeSelect() {
  const boardTheme = useUIStore((s) => s.boardTheme);
  const setBoardTheme = useUIStore((s) => s.setBoardTheme);

  return (
    <div className="flex items-center gap-2 shrink-0">
      <label htmlFor="board-theme" className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wide shrink-0">
        Board
      </label>
      <select
        id="board-theme"
        value={boardTheme}
        onChange={(e) => setBoardTheme(e.target.value as BoardThemeId)}
        className="text-xs rounded border border-[var(--color-border)] bg-[var(--color-bg-primary)] text-[var(--color-text-primary)] px-2 py-1 max-w-[140px]"
      >
        {(Object.keys(BOARD_THEMES) as BoardThemeId[]).map((id) => (
          <option key={id} value={id}>
            {BOARD_THEMES[id].label}
          </option>
        ))}
      </select>
    </div>
  );
}
