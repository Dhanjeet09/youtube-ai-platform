/**
 * Shared constants used across multiple pages and components.
 * Centralised here to avoid duplication and ensure consistency.
 */
export const NICHE_ICONS = {
  Finance: '💰',
  Business: '📊',
  Technology: '💻',
  Education: '📚',
  Health: '🏥',
  RealEstate: '🏠',
  Sports: '⚽',
  WorldCup: '🏆'
}

/**
 * Navigation items with Material Symbols icon names
 */
export const NAV_ITEMS = [
  { to: '/', icon: 'space_dashboard', label: 'Dashboard' },
  { to: '/generator', icon: 'edit_note', label: 'Generator' },
  { to: '/hindi-poems', icon: 'format_quote', label: 'Hindi Poems' },
  { to: '/workflow', icon: 'play_circle', label: 'Pipeline' },
  { to: '/assets', icon: 'folder', label: 'Assets' },
  { to: '/analytics', icon: 'analytics', label: 'Analytics' },
  { to: '/monetization', icon: 'paid', label: 'Monetization' },
  { to: '/settings', icon: 'settings', label: 'Settings' },
]

/**
 * Bottom nav items (mobile) — subset for 5-tab layout
 */
export const BOTTOM_NAV_ITEMS = [
  { to: '/', icon: 'space_dashboard', label: 'Home' },
  { to: '/generator', icon: 'edit_note', label: 'Create' },
  { to: '/workflow', icon: 'play_circle', label: 'Flow' },
  { to: '/analytics', icon: 'analytics', label: 'Data' },
  { to: '/settings', icon: 'menu', label: 'Menu' },
]

/**
 * Content type icons for Script Generator
 */
export const CONTENT_TYPE_ICONS = {
  script: 'edit',
  poem: 'palette',
  story: 'menu_book',
  facts: 'lightbulb',
  rhyme: 'music_note',
  song: 'mic',
  joke: 'sentiment_very_satisfied',
  riddle: 'extension',
}
