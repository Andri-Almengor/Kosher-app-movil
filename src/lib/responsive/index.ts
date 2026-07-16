export const BREAKPOINTS = {
  phone: 0,
  tablet: 768,
  laptop: 1024,
  desktop: 1440,
} as const;

export function getScreenTier(width: number) {
  if (width >= BREAKPOINTS.desktop) return 'desktop';
  if (width >= BREAKPOINTS.laptop) return 'laptop';
  if (width >= BREAKPOINTS.tablet) return 'tablet';
  return 'phone';
}

export function getContentMaxWidth(width: number) {
  if (width >= BREAKPOINTS.desktop) return 1440;
  if (width >= BREAKPOINTS.laptop) return 1200;
  if (width >= BREAKPOINTS.tablet) return 960;
  return width;
}

export function getHorizontalPadding(width: number) {
  if (width >= BREAKPOINTS.desktop) return 32;
  if (width >= BREAKPOINTS.laptop) return 28;
  if (width >= BREAKPOINTS.tablet) return 22;
  return 14;
}

export function getGridColumns(width: number, kind: 'cards' | 'products' | 'feed' = 'cards') {
  if (kind === 'products') {
    if (width >= BREAKPOINTS.desktop) return 5;
    if (width >= BREAKPOINTS.laptop) return 4;
    if (width >= BREAKPOINTS.tablet) return 3;
    return 2;
  }
  if (kind === 'feed') {
    if (width >= BREAKPOINTS.laptop) return 2;
    return 1;
  }
  if (width >= BREAKPOINTS.desktop) return 3;
  if (width >= BREAKPOINTS.tablet) return 2;
  return 1;
}

export function getReadableWidth(width: number, variant: 'narrow' | 'regular' | 'wide' = 'regular') {
  const base = variant === 'narrow' ? 760 : variant === 'wide' ? 1280 : 1080;
  return Math.min(base, getContentMaxWidth(width));
}
