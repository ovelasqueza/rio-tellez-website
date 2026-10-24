/** IDs de sección compartidos por ambos idiomas (el selector de idioma conserva el #hash). */
export const sections = [
  { id: 'origen', label: 'origin', short: 'origin', icon: 'material-symbols:nature-outline' },
  { id: 'rutas', label: 'routes', short: 'routesShort', icon: 'material-symbols:hiking' },
  { id: 'galeria', label: 'gallery', short: 'gallery', icon: 'material-symbols:photo-library-outline' },
  { id: 'cafe', label: 'coffee', short: 'coffee', icon: 'material-symbols:local-cafe-outline' },
  { id: 'como-llegar', label: 'arrive', short: 'arriveShort', icon: 'material-symbols:pin-drop-outline' },
  { id: 'reservas', label: 'booking', short: 'booking', icon: 'material-symbols:calendar-month-outline' },
] as const;
