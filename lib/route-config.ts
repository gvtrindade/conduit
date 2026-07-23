const authRoutes = ['/login', '/signup', '/forgot-password', '/reset-password', '/set-callsign'];

export function isAuthRoute(pathname: string): boolean {
  return authRoutes.includes(pathname);
}

export function getPageName(pathname: string): string {
  if (pathname === '/') return 'RECEIPTS';
  if (pathname === '/items') return 'ITEMS';
  if (pathname === '/manifests') return 'MANIFESTS';
  if (pathname === '/analytics') return 'ANALYTICS';
  if (pathname === '/profile') return 'PROFILE';
  if (pathname === '/login') return 'AUTHENTICATION';
  if (pathname === '/signup') return 'REGISTRATION';
  if (pathname === '/forgot-password') return 'RECOVERY';
  if (pathname === '/reset-password') return 'KEY_RESET';
  if (pathname === '/set-callsign') return 'CALLSIGN';
  if (pathname === '/logs') return 'RECEIPTS';
  if (pathname.startsWith('/receipts/')) return 'RECEIPT_VIEWER';
  if (pathname.startsWith('/items/')) return 'ITEM_DETAIL';
  if (pathname.startsWith('/manifests/')) return 'MANIFEST_DETAIL';
  return 'CONDUIT';
}

export function getAuthActiveHref(pathname: string): string | null {
  return isAuthRoute(pathname) ? '/profile' : null;
}