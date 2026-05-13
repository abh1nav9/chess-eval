export type BoardThemeId = 'classic' | 'brown' | 'gray' | 'blue' | 'pink';

export const BOARD_THEMES: Record<
  BoardThemeId,
  { label: string; dark: string; light: string }
> = {
  classic: { label: 'Classic', dark: '#739552', light: '#ebecd0' },
  brown: { label: 'Brown', dark: '#b58863', light: '#f0d9b5' },
  gray: { label: 'Gray', dark: '#727272', light: '#c5c5c5' },
  blue: { label: 'Blue', dark: '#4a6fa5', light: '#d6e4ff' },
  pink: { label: 'Pink', dark: '#c05684', light: '#fde7f1' },
};
