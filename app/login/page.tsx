'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { disconnectDb, reconnectDb } from '@/components/providers/SystemProvider';

export default function LoginPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [operatorId, setOperatorId] = useState('');
  const [accessKey, setAccessKey] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);


    const { error: signInError } = await authClient.signIn.email(
      {
        email: operatorId,
        password: accessKey,
      },
      {
        onSuccess: async () => {
          disconnectDb();
          reconnectDb();
          router.push('/');
        },
        onError: async () => {
          setError('INVALID CREDENTIALS - ACCESS DENIED');
          setLoading(false);
        }
      }
    );

    if (signInError) {
      setError('TRANSMISSION ERROR - TRY AGAIN');
      setLoading(false);
    }
  };

  const handleGoogleSignIn = () => {
    authClient.signIn.social({
      provider: "google",
    });
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-amber/10 border-2 border-amber" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', boxShadow: '0 0 24px rgba(217,140,69,0.2)' }} />
            <span className="font-heading text-lg font-bold text-amber relative z-10">C//</span>
          </div>
          <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">CONDUIT</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-sand mt-1">// GROCERY INTELLIGENCE SYSTEM //</div>
          <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
        </div>

        {/* Operator ID */}
        <div className="mb-1">
          <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// OPERATOR_ID //</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-sand pointer-events-none">@</span>
            <input
              value={operatorId}
              onChange={(e) => setOperatorId(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 pl-10 pr-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-amber focus:border-amber focus:shadow-[0_0_0_3px_rgba(217,140,69,0.12)] transition-all placeholder:text-panel2"
              placeholder="CAPT_PROVISIONS"
              autoComplete="off"
            />
          </div>
        </div>

        {/* Access Key */}
        <div className="mb-1">
          <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// ACCESS_KEY //</label>
          <div className="relative">
            <span className="absolute left-3.5 top-1/2 -translate-y-1/2 font-mono text-sm text-sand pointer-events-none">#</span>
            <input
              value={accessKey}
              onChange={(e) => setAccessKey(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 pl-10 pr-16 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-amber focus:border-amber focus:shadow-[0_0_0_3px_rgba(217,140,69,0.12)] transition-all placeholder:text-panel2"
              type={showPw ? 'text' : 'password'}
              placeholder="••••••••••••"
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(!showPw)}
              className="absolute right-3.5 top-1/2 -translate-y-1/2 font-mono text-[10px] text-sand tracking-wider uppercase cursor-pointer hover:text-cream transition-colors bg-transparent border-none"
            >
              {showPw ? 'HIDE' : 'SHOW'}
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="font-mono text-[10px] text-red-400 text-center uppercase tracking-wider">{error}</p>
          </div>
        )}

        {/* Forgot */}
        <div className="flex justify-end mb-5 -mt-1">
          <Link href="/forgot-password" className="font-mono text-[9px] tracking-[0.1em] uppercase text-blue no-underline hover:text-cream transition-colors">RECOVER_ACCESS_KEY →</Link>
        </div>

        {/* Auth Button */}
        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-amber border-2 border-[#C07830] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull cursor-pointer relative overflow-hidden hover:shadow-[0_0_40px_rgba(217,140,69,0.4)] transition-shadow disabled:opacity-75"
          style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(217,140,69,0.25)' }}
        >
          {loading ? '[ AUTHENTICATING... ]' : '[ AUTHENTICATE_OPERATOR ]'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-3.5">
          <div className="flex-1 h-px bg-border-custom" />
          <span className="font-mono text-[9px] tracking-[0.14em] uppercase text-sand">OR</span>
          <div className="flex-1 h-px bg-border-custom" />
        </div>

        {/* Alt Auth */}
        <div className="flex gap-2.5 mb-7">
          <button 
            onClick={handleGoogleSignIn}
           className="flex-1 bg-panel border-[1.5px] border-border-custom rounded-xl py-3 font-mono text-[10px] font-bold tracking-[0.08em] uppercase text-sand cursor-pointer text-center hover:border-blue hover:text-cream transition-all flex items-center justify-center gap-2">
            <svg className="w-5 h-5" viewBox="0 0 24 24">
              <path
                fill="#4285F4"
                d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
              />
              <path
                fill="#34A853"
                d="M12 23c2.97 0 5.46-.98 7.28-2.63l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
              />
              <path
                fill="#FBBC05"
                d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
              />
              <path
                fill="#EA4335"
                d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
              />
            </svg>
            Continue with Google
          </button>
        </div>

        {/* Register */}
        <div className="text-center">
          <p className="font-mono text-[10px] tracking-wider text-sand">
            NO CREDENTIALS ON FILE?{' '}
            <Link href="/signup" className="text-blue no-underline font-bold hover:text-cream transition-colors">REQUEST_CLEARANCE →</Link>
          </p>
        </div>

        {/* Footer */}
        <div className="text-center pt-4 mt-4 border-t border-border-custom">
          <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2">CONDUIT v2.4.1 // SECURE CHANNEL</p>
          <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2 mt-0.5">ALL ACCESS ATTEMPTS ARE LOGGED</p>
        </div>
      </div>
    </div>
  );
}