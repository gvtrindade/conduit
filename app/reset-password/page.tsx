'use client';

import { useState, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { authClient } from '@/lib/auth-client';
import { Logo } from '@/components/logo';

function ResetForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const token = searchParams.get('token');

  const [showPw, setShowPw] = useState(false);
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError('ACCESS KEY MUST BE AT LEAST 8 CHARACTERS');
      return;
    }

    if (password !== confirm) {
      setError('ACCESS KEY MISMATCH - RETYPE CAREFULLY');
      return;
    }

    if (!token) {
      setError('INVALID OR EXPIRED RECOVERY TOKEN');
      return;
    }

    setLoading(true);

    const { error: resetError } = await authClient.resetPassword(
      {
        newPassword: password,
        token,
      },
      {
        onError: () => {
          setError('INVALID OR EXPIRED RECOVERY TOKEN');
          setLoading(false);
        },
      }
    );

    if (resetError) {
      setError('INVALID OR EXPIRED RECOVERY TOKEN');
      setLoading(false);
      return;
    }

    setDone(true);
    setLoading(false);
  };

  if (done) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
          <Logo color="green" />
            <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">KEY RESET</div>
            <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-green mt-1">// ACCESS_KEY_UPDATED //</div>
            <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
          </div>

          <p className="text-sm text-sand leading-relaxed mb-5 text-center">
            Your access key has been successfully reset. Use your new credentials to authenticate.
          </p>

          <button
            onClick={() => router.push('/login')}
            className="w-full bg-green border-2 border-[#5A9A7A] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull cursor-pointer relative overflow-hidden hover:shadow-[0_0_40px_rgba(120,168,144,0.4)] transition-shadow"
            style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(120,168,144,0.25)' }}
          >
            [ PROCEED_TO_AUTHENTICATION ]
          </button>

          <div className="text-center pt-4 mt-4 border-t border-border-custom">
            <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2">CONDUIT v2.4.1 // SECURE CHANNEL</p>
          </div>
        </div>
      </div>
    );
  }

  if (!token) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-red-900/50 border-2 border-red-500" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', boxShadow: '0 0 24px rgba(239,68,68,0.2)' }} />
              <span className="font-heading text-lg font-bold text-red-400 relative z-10">!</span>
            </div>
            <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">INVALID TOKEN</div>
            <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-red-400 mt-1">// RECOVERY_LINK_INVALID //</div>
            <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
          </div>

          <p className="text-sm text-sand leading-relaxed mb-5 text-center">
            This recovery link is invalid or has expired. Request a new recovery link to reset your access key.
          </p>

          <Link href="/forgot-password" className="w-full block bg-amber border-2 border-[#C07830] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull text-center no-underline relative overflow-hidden hover:shadow-[0_0_40px_rgba(217,140,69,0.4)] transition-shadow" style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(217,140,69,0.25)' }}>
            [ REQUEST_NEW_RECOVERY_LINK ]
          </Link>

          <div className="text-center pt-4 mt-4 border-t border-border-custom">
            <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2">CONDUIT v2.4.1 // SECURE CHANNEL</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <Logo color="green" />
          <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">RESET KEY</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-sand mt-1">// NEW_ACCESS_KEY_SETUP //</div>
          <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
        </div>

        <form onSubmit={handleSubmit}>
          <div className="space-y-3">
            <div>
              <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// NEW_ACCESS_KEY //</label>
              <div className="relative">
                <input
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 pr-16 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-green focus:border-green focus:shadow-[0_0_0_3px_rgba(120,168,144,0.12)] transition-all placeholder:text-panel2"
                  type={showPw ? 'text' : 'password'}
                  placeholder="••••••••••••"
                  autoComplete="new-password"
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
            <div>
              <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// CONFIRM_KEY //</label>
              <input
                value={confirm}
                onChange={(e) => setConfirm(e.target.value)}
                className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-green focus:border-green focus:shadow-[0_0_0_3px_rgba(120,168,144,0.12)] transition-all placeholder:text-panel2"
                type="password"
                placeholder="••••••••••••"
                autoComplete="new-password"
              />
            </div>
          </div>

          {error && (
            <div className="mt-3 p-2 bg-red-900/50 border border-red-500 rounded-lg">
              <p className="font-mono text-[10px] text-red-400 text-center uppercase tracking-wider">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-green border-2 border-[#5A9A7A] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull cursor-pointer mt-5 relative overflow-hidden hover:shadow-[0_0_40px_rgba(120,168,144,0.4)] transition-shadow disabled:opacity-75"
            style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(120,168,144,0.25)' }}
          >
            {loading ? '[ RESETTING... ]' : '[ CONFIRM_KEY_RESET ]'}
          </button>
        </form>

        <div className="text-center mt-5">
          <Link href="/login" className="font-mono text-[10px] tracking-wider text-blue no-underline hover:text-cream transition-colors">← BACK TO AUTHENTICATION</Link>
        </div>

        <div className="text-center pt-4 mt-4 border-t border-border-custom">
          <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2">CONDUIT v2.4.1 // SECURE CHANNEL</p>
        </div>
      </div>
    </div>
  );
}

export default function ResetPasswordPage() {
  return (
    <Suspense>
      <ResetForm />
    </Suspense>
  );
}
