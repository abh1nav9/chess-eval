import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/boardChrome.css'
import App from './app/App'

// Apply persisted theme before first paint to avoid flash
const stored = localStorage.getItem('chess-eval-ui');
if (stored) {
  try {
    const { state } = JSON.parse(stored);
    const theme = state?.theme || 'light';
    const boardTheme = state?.boardTheme || 'classic';
    document.documentElement.setAttribute('data-theme', theme);
    document.documentElement.style.colorScheme = theme;
    document.documentElement.setAttribute('data-board-theme', boardTheme);
  } catch {
    document.documentElement.setAttribute('data-theme', 'light');
    document.documentElement.style.colorScheme = 'light';
    document.documentElement.setAttribute('data-board-theme', 'classic');
  }
} else {
  document.documentElement.setAttribute('data-theme', 'light');
  document.documentElement.style.colorScheme = 'light';
  document.documentElement.setAttribute('data-board-theme', 'classic');
}

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
