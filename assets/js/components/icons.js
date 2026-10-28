/**
 * Icon set.
 *
 * One line weight, one corner treatment, one 24-unit grid. Anything that
 * needs a different weight is not an icon.
 */

const PATHS = {
  /* The mark: ticks rising off a baseline. A scale that goes up. */
  scale:      '<path d="M3 18h18"/><path d="M7 18v-3M12 18v-6M17 18v-9"/>',
  search:     '<circle cx="11" cy="11" r="7"/><path d="M20 20l-3.6-3.6"/>',
  pin:        '<path d="M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0z"/><circle cx="12" cy="10" r="2.5"/>',
  bookmark:   '<path d="M19 21l-7-5-7 5V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2z"/>',
  sun:        '<circle cx="12" cy="12" r="4.2"/><path d="M12 2v2M12 20v2M4.9 4.9l1.4 1.4M17.7 17.7l1.4 1.4M2 12h2M20 12h2M4.9 19.1l1.4-1.4M17.7 6.3l1.4-1.4"/>',
  moon:       '<path d="M21 12.8A9 9 0 1 1 11.2 3a7 7 0 0 0 9.8 9.8z"/>',
  menu:       '<path d="M3 6h18M3 12h18M3 18h18"/>',
  close:      '<path d="M18 6L6 18M6 6l12 12"/>',
  right:      '<path d="M9 5l7 7-7 7"/>',
  left:       '<path d="M15 5l-7 7 7 7"/>',
  down:       '<path d="M5 9l7 7 7-7"/>',
  check:      '<path d="M20 6L9 17l-5-5"/>',
  plus:       '<path d="M12 5v14M5 12h14"/>',
  trash:      '<path d="M4 7h16M9 7V5a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2M6 7l1 13a1 1 0 0 0 1 1h8a1 1 0 0 0 1-1l1-13"/>',
  external:   '<path d="M14 4h6v6M20 4l-9 9M18 14v5a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h5"/>',
  briefcase:  '<rect x="3" y="7" width="18" height="13" rx="2"/><path d="M8 7V5a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2M3 12h18"/>',
  building:   '<path d="M4 21V5a1 1 0 0 1 1-1h9a1 1 0 0 1 1 1v16M15 21V10h4a1 1 0 0 1 1 1v10M3 21h18M8 8h3M8 12h3M8 16h3"/>',
  user:       '<circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/>',
  bell:       '<path d="M18 15V10a6 6 0 1 0-12 0v5l-2 3h16zM10 21h4"/>',
  sliders:    '<path d="M4 6h10M18 6h2M4 12h4M12 12h8M4 18h10M18 18h2"/><circle cx="16" cy="6" r="2"/><circle cx="10" cy="12" r="2"/><circle cx="16" cy="18" r="2"/>',
  share:      '<circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><path d="M8.6 13.5l6.8 4M15.4 6.5l-6.8 4"/>',
  chart:      '<path d="M4 20V10M10 20V4M16 20v-7M22 20H2"/>',
  target:     '<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="4.5"/><circle cx="12" cy="12" r="1"/>',
  calendar:   '<rect x="3" y="5" width="18" height="16" rx="2"/><path d="M3 10h18M8 3v4M16 3v4"/>',
  doc:        '<path d="M14 3H7a1 1 0 0 0-1 1v16a1 1 0 0 0 1 1h10a1 1 0 0 0 1-1V7zM14 3v4h4M9 13h6M9 17h4"/>',
  send:       '<path d="M21 3L10.5 13.5M21 3l-6.5 18-4-8-8-4z"/>',
  edit:       '<path d="M4 20h4L19 9a2.1 2.1 0 0 0-3-3L5 17z"/>',
  logout:     '<path d="M15 4h3a1 1 0 0 1 1 1v14a1 1 0 0 1-1 1h-3M10 16l-4-4 4-4M6 12h9"/>'
};

/**
 * @param {keyof PATHS} name
 * @param {number} size
 */
export const icon = (name, size = 16) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="none" stroke="currentColor"
       stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${PATHS[name] || ''}
  </svg>`;

/** The bookmark, filled when the role is saved. */
export const bookmarkIcon = (filled, size = 16) => `
  <svg width="${size}" height="${size}" viewBox="0 0 24 24" fill="${filled ? 'currentColor' : 'none'}"
       stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
    ${PATHS.bookmark}
  </svg>`;
