// Glassmorphism style constants
// backdropFilter is a web CSS property — React Native Web passes it through as-is.
// On native it is silently ignored (fallback to backgroundColor opacity).

export const Glass = {
  // Standard card — used for most secondary content
  card: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.10)',
  } as any,

  // Brighter card — used for interactive / highlighted cards
  cardBright: {
    backgroundColor: 'rgba(255,255,255,0.11)',
    backdropFilter: 'blur(20px)',
    WebkitBackdropFilter: 'blur(20px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.18)',
  } as any,

  // Dark glass — hero cards, overlays
  cardDark: {
    backgroundColor: 'rgba(0,0,0,0.28)',
    backdropFilter: 'blur(30px)',
    WebkitBackdropFilter: 'blur(30px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.07)',
  } as any,

  // Input fields
  input: {
    backgroundColor: 'rgba(255,255,255,0.06)',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.12)',
  } as any,
};
