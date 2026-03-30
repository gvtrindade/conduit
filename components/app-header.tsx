'use client';

import { usePathname, useRouter } from 'next/navigation';
import { useSession, signOut } from '@/lib/auth-client';
import StatusLine from '@/components/status-line';
import { getPageName, isAuthRoute } from '@/lib/route-config';
import { useStatus } from '@powersync/react';

export default function AppHeader() {
  const pathname = usePathname();
  const router = useRouter();
  const pageName = getPageName(pathname);
  const isAuth = isAuthRoute(pathname);
  const { data: session, isPending } = useSession();
  const status = useStatus();

  const handleSignOut = async () => {
    await signOut();
    router.push('/login');
  };

  const userInfo = isPending 
    ? 'LOADING...' 
    : session?.user 
      ? session.user.name || session.user.email.split('@')[0].toUpperCase()
      : (isAuth ? 'ANON' : 'NO_SESSION');

  return (
    <div className="fixed top-0 left-0 right-0 z-[60]">
      <StatusLine
        status={status.connected ? "CONNECTED" : "OFFLINE"}
        pageName={pageName}
        info={`USR: ${userInfo}`}
        action={session ? { label: 'LOGOUT', onClick: handleSignOut } : undefined}
      />
    </div>
  );
}