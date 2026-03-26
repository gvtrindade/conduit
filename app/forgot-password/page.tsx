'use client';

import Link from 'next/link';

export default function ForgotPasswordPage() {
  return (
    <div className="flex-1 flex flex-col items-center justify-center min-h-screen px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="text-center mb-7">
          <div className="w-16 h-16 mx-auto mb-3 relative flex items-center justify-center">
            <div className="absolute inset-0 bg-amber/10 border-2 border-amber" style={{ clipPath: 'polygon(50% 0%, 95% 25%, 95% 75%, 50% 100%, 5% 75%, 5% 25%)', boxShadow: '0 0 24px rgba(217,140,69,0.2)' }} />
            <span className="font-heading text-lg font-bold text-amber relative z-10">C//</span>
          </div>
          <div className="font-tight text-[26px] font-bold text-cream uppercase tracking-[0.14em] leading-none">RECOVER ACCESS</div>
          <div className="font-mono text-[9px] font-bold tracking-[0.22em] uppercase text-sand mt-1">// ACCESS_KEY_RECOVERY //</div>
          <div className="w-10 h-px bg-border-custom mx-auto mt-2.5" />
        </div>

        <p className="text-sm text-sand leading-relaxed mb-5 text-center">
          Enter your comm channel to receive a recovery link. Your access key will be reset.
        </p>

        <div className="mb-4">
          <label className="font-mono text-[9px] font-bold tracking-[0.16em] uppercase text-sand block mb-1.5">// COMM_CHANNEL //</label>
          <input className="w-full bg-hull border-[1.5px] border-border-custom rounded-lg py-3.5 px-4 font-mono text-[13px] font-medium text-cream tracking-wider outline-none caret-amber focus:border-amber focus:shadow-[0_0_0_3px_rgba(217,140,69,0.12)] transition-all placeholder:text-panel2" type="email" placeholder="operator@conduit.net" />
        </div>

        <button
          className="w-full bg-amber border-2 border-[#C07830] rounded-xl py-4 font-mono text-[13px] font-bold tracking-[0.14em] uppercase text-hull cursor-pointer relative overflow-hidden hover:shadow-[0_0_40px_rgba(217,140,69,0.4)] transition-shadow"
          style={{ boxShadow: 'inset 0 -3px 0 rgba(0,0,0,0.35), 0 0 24px rgba(217,140,69,0.25)' }}
        >
          [ SEND_RECOVERY_LINK ]
        </button>

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
