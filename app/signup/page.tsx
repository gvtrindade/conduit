'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { authClient } from '@/lib/auth-client';

export default function SignupPage() {
  const router = useRouter();
  const [showPw, setShowPw] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [callsign, setCallsign] = useState('');
  const [callsignAvailable, setCallsignAvailable] = useState<boolean | null>(null);
  const [checkingCallsign, setCheckingCallsign] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!callsign.trim()) {
      setCallsignAvailable(null);
      setCheckingCallsign(false);
      return;
    }
    const timer = setTimeout(async () => {
      setCheckingCallsign(true);
      try {
        const res = await fetch(`/api/users/check-callsign?callsign=${encodeURIComponent(callsign.trim())}`);
        const data = await res.json();
        setCallsignAvailable(data.available);
      } catch {
        setCallsignAvailable(null);
      } finally {
        setCheckingCallsign(false);
      }
    }, 400);
    return () => clearTimeout(timer);
  }, [callsign]);
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (password !== confirmPassword) {
      setError('ACCESS KEYS DO NOT MATCH');
      return;
    }

    if (password.length < 8) {
      setError('ACCESS KEY MUST BE AT LEAST 8 CHARACTERS');
      return;
    }

    if (!callsign.trim()) {
      setError('CALLSIGN IS REQUIRED');
      return;
    }

    if (callsignAvailable === false) {
      setError('CALLSIGN ALREADY TAKEN');
      return;
    }

    setLoading(true);

    try {
      const { error: signUpError } = await authClient.signUp.email({
        email,
        password,
        name: name,
        callsign: callsign.trim(),
      } as Parameters<typeof authClient.signUp.email>[0] & Record<string, string>);

      if (signUpError) {
        setError((signUpError.message || 'Unknown error').toUpperCase());
        return;
      }

      router.push('/login');
    } catch (err) {
      setError('TRANSMISSION FAILED - TRY AGAIN');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-blue/10 border-2 border-blue" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', boxShadow: '0 0 24px rgba(91,138,158,0.2)' }} />
            <span className="font-heading text-lg font-bold text-blue relative z-10">C//</span>
          </div>
          <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">REQUEST CLEARANCE</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-sand mt-1">// NEW_OPERATOR_REGISTRATION //</div>
          <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
        </div>

        <div className="space-y-3">
          <div>
            <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// NAME //</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value.toUpperCase())}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-blue focus:border-blue focus:shadow-[0_0_0_3px_rgba(91,138,158,0.12)] transition-all placeholder:text-panel2"
              placeholder="CAPT_PROVISIONS"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// CALLSIGN //</label>
            <div className="relative">
              <input
                value={callsign}
                onChange={(e) => setCallsign(e.target.value.toUpperCase())}
                className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 pr-16 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-blue focus:border-blue focus:shadow-[0_0_0_3px_rgba(91,138,158,0.12)] transition-all placeholder:text-panel2"
                placeholder="ALPHA_1"
              />
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2">
                {checkingCallsign && (
                  <span className="font-mono text-[9px] text-sand">SCAN...</span>
                )}
                {!checkingCallsign && callsignAvailable === true && (
                  <span className="font-mono text-[9px] text-green">AVAILABLE</span>
                )}
                {!checkingCallsign && callsignAvailable === false && (
                  <span className="font-mono text-[9px] text-red">TAKEN</span>
                )}
              </div>
            </div>
          </div>
          <div>
            <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// COMM_CHANNEL //</label>
            <input
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-blue focus:border-blue focus:shadow-[0_0_0_3px_rgba(91,138,158,0.12)] transition-all placeholder:text-panel2"
              type="email"
              placeholder="operator@conduit.net"
            />
          </div>
          <div>
            <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// ACCESS_KEY //</label>
            <div className="relative">
              <input
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 pr-16 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-blue focus:border-blue focus:shadow-[0_0_0_3px_rgba(91,138,158,0.12)] transition-all placeholder:text-panel2"
                type={showPw ? 'text' : 'password'}
                placeholder="••••••••••••"
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
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-blue focus:border-blue focus:shadow-[0_0_0_3px_rgba(91,138,158,0.12)] transition-all placeholder:text-panel2"
              type="password"
              placeholder="••••••••••••"
            />
          </div>
        </div>

        {error && (
          <div className="mt-4 p-3 bg-red-900/50 border border-red-500 rounded-lg">
            <p className="font-mono text-[11px] text-red-400 text-center uppercase tracking-wider">{error}</p>
          </div>
        )}

        <button
          onClick={handleSubmit}
          disabled={loading}
          className="w-full bg-blue border-2 border-[#4A7A8D] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-cream cursor-pointer mt-5 relative overflow-hidden hover:shadow-[0_0_40px_rgba(91,138,158,0.4)] transition-shadow disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(91,138,158,0.25)' }}
        >
          {loading ? '[ PROCESSING... ]' : '[ SUBMIT_CLEARANCE_REQUEST ]'}
        </button>

        <div className="text-center mt-5">
          <p className="font-mono text-[10px] tracking-wider text-sand">
            ALREADY CLEARED?{' '}
            <Link href="/login" className="text-blue no-underline font-bold hover:text-cream transition-colors">AUTHENTICATE →</Link>
          </p>
        </div>

        <div className="text-center pt-4 mt-4 border-t border-border-custom">
          <p className="font-mono text-[8px] tracking-[0.1em] uppercase text-panel2">CONDUIT v2.4.1 // SECURE CHANNEL</p>
        </div>
      </div>
    </div>
  );
}