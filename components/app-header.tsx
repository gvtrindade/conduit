'use client';

import { usePathname } from 'next/navigation';
import StatusLine from '@/components/status-line';
import { getPageName, isAuthRoute } from '@/lib/route-config';

export default function AppHeader() {
  const pathname = usePathname();
  const pageName = getPageName(pathname);
  const isAuth = isAuthRoute(pathname);
  const userInfo = isAuth ? 'ANON' : 'G.TRINDADE';

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <StatusLine
        status="SYS_ONLINE"
        pageName={pageName}
        info={`USR: ${userInfo}`}
      />
    </div>
  );
}
