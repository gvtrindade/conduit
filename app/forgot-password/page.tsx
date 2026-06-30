'use client';

import { useState } from 'react';
import Link from 'next/link';
import { authClient } from '@/lib/auth-client';
import { Logo } from '@/components/logo';

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [sent, setSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    const { error: reqError } = await authClient.requestPasswordReset(
      {
        email,
        redirectTo: `${window.location.origin}/reset-password`,
      },
      {
        onError: () => {
          setError('TRANSMISSION FAILED - TRY AGAIN');
          setLoading(false);
        },
      }
    );

    if (reqError) {
      setError('TRANSMISSION FAILED - TRY AGAIN');
      setLoading(false);
      return;
    }

    setSent(true);
    setLoading(false);
  };

  if (sent) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
        <div className="w-full max-w-sm">
          <div className="text-center mb-7">
            <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
              <div className="absolute inset-0 bg-green/10 border-2 border-green" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', boxShadow: '0 0 24px rgba(34,197,94,0.2)' }} />
              <span className="font-heading text-lg font-bold text-green relative z-10">✓</span>
            </div>
            <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">TRANSMISSION SENT</div>
            <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-green mt-1">// RECOVERY_LINK_DISPATCHED //</div>
            <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
          </div>

          <p className="text-sm text-sand leading-relaxed mb-5 text-center">
            If this comm channel is registered in our system, a recovery link has been dispatched.
            Check your inbox and follow the instructions to reset your access key.
          </p>

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

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <Logo color="amber" />
          <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">RECOVER ACCESS</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-sand mt-1">// ACCESS_KEY_RECOVERY //</div>
          <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
        </div>

        <p className="text-sm text-sand leading-relaxed mb-5 text-center">
          Enter your comm channel to receive a recovery link. Your access key will be reset.
        </p>

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// COMM_CHANNEL //</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-amber focus:border-amber focus:shadow-[0_0_0_3px_rgba(217,140,69,0.12)] transition-all placeholder:text-panel2"
              type="email"
              placeholder="operator@conduit.net"
              autoComplete="email"
            />
          </div>

          {error && (
            <div className="mb-3 p-2 bg-red-900/50 border border-red-500 rounded-lg">
              <p className="font-mono text-[10px] text-red-400 text-center uppercase tracking-wider">{error}</p>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-amber border-2 border-[#C07830] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull cursor-pointer relative overflow-hidden hover:shadow-[0_0_40px_rgba(217,140,69,0.4)] transition-shadow disabled:opacity-75"
            style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(217,140,69,0.25)' }}
          >
            {loading ? '[ TRANSMITTING... ]' : '[ SEND_RECOVERY_LINK ]'}
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
