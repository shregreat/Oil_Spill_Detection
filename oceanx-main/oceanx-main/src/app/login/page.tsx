'use client';

import { useState, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Anchor, Lock, Mail, Radar, Satellite, Ship, Waves } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { InlineNotice } from '@/components/ui/States';
import { authService, DEMO_CREDENTIALS } from '@/services';
import { APP_NAME, APP_TAGLINE, PS_REFERENCE } from '@/lib/constants';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState(DEMO_CREDENTIALS.email);
  const [password, setPassword] = useState(DEMO_CREDENTIALS.password);
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'success'>('idle');
  const [message, setMessage] = useState('');

  const submit = async (event: FormEvent) => {
    event.preventDefault();
    setStatus('loading');
    setMessage('');
    try {
      const session = await authService.login(email, password);
      authService.persist(session);
      setStatus('success');
      setMessage(`Authenticated as ${session.user.name}. Opening command centre…`);
      router.push('/dashboard');
    } catch (error) {
      setStatus('error');
      setMessage(error instanceof Error ? error.message : 'Sign-in failed');
    }
  };

  return (
    <main className="grid min-h-screen lg:grid-cols-2">
      {/* Brand / mission panel */}
      <section className="relative hidden overflow-hidden border-r border-line/70 bg-deep/60 p-10 lg:flex lg:flex-col lg:justify-between">
        <div className="absolute inset-0 grid-backdrop opacity-60" aria-hidden />
        <div className="absolute -right-24 top-1/3 h-96 w-96 rounded-full bg-radar" aria-hidden />

        <div className="relative">
          <span className="inline-flex items-center gap-2 rounded-full border border-accent/40 bg-accent/10 px-3 py-1 text-[11px] font-semibold tracking-wider text-accent">
            <Radar className="h-3.5 w-3.5" />
            {PS_REFERENCE}
          </span>
          <h1 className="mt-6 max-w-md text-3xl font-semibold leading-tight tracking-tight text-ink">
            Satellite oil spill detection with AIS vessel attribution
          </h1>
          <p className="mt-3 max-w-md text-sm leading-relaxed text-muted">
            Detect slicks in SAR imagery, reconstruct their drift history, and rank the vessels most likely responsible
            for the discharge.
          </p>
        </div>

        <ul className="relative mt-10 space-y-3">
          {[
            { icon: Satellite, title: 'SAR detection', detail: 'Sentinel-1 ingestion with AI slick segmentation' },
            { icon: Waves, title: 'Drift modelling', detail: 'Hindcast to origin, forecast to +72 hours' },
            { icon: Ship, title: 'Vessel attribution', detail: 'AIS correlation with behavioural anomaly scoring' }
          ].map((item, i) => (
            <motion.li
              key={item.title}
              initial={{ opacity: 0, x: -12 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 + i * 0.1, duration: 0.4 }}
              className="flex items-start gap-3 rounded-xl border border-line/70 bg-panel/60 p-3"
            >
              <span className="grid h-9 w-9 shrink-0 place-items-center rounded-lg border border-line bg-deep text-accent">
                <item.icon className="h-4 w-4" />
              </span>
              <div>
                <p className="text-xs font-semibold text-ink">{item.title}</p>
                <p className="mt-0.5 text-[11px] text-muted">{item.detail}</p>
              </div>
            </motion.li>
          ))}
        </ul>
      </section>

      {/* Sign-in */}
      <section className="flex items-center justify-center p-6">
        <motion.div
          initial={{ opacity: 0, y: 14 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="w-full max-w-sm"
        >
          <div className="mb-6 flex items-center gap-3">
            <span className="grid h-11 w-11 place-items-center rounded-xl border border-accent/40 bg-accent/10">
              <Anchor className="h-5 w-5 text-accent" />
            </span>
            <div>
              <p className="text-lg font-semibold tracking-tight text-ink">{APP_NAME}</p>
              <p className="text-[11px] uppercase tracking-[0.14em] text-muted">{APP_TAGLINE}</p>
            </div>
          </div>

          <form onSubmit={submit} className="panel space-y-4 p-5">
            <div>
              <label htmlFor="email" className="label-xs">
                Operator email
              </label>
              <div className="relative mt-1.5">
                <Mail className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  id="email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="input pl-9"
                  autoComplete="username"
                />
              </div>
            </div>

            <div>
              <label htmlFor="password" className="label-xs">
                Password
              </label>
              <div className="relative mt-1.5">
                <Lock className="pointer-events-none absolute left-3 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-muted" />
                <input
                  id="password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="input pl-9"
                  autoComplete="current-password"
                />
              </div>
            </div>

            {message && (
              <InlineNotice tone={status === 'error' ? 'error' : 'success'}>{message}</InlineNotice>
            )}

            <Button type="submit" variant="primary" size="lg" loading={status === 'loading'} className="w-full">
              {status === 'loading' ? 'Authenticating' : 'Sign in to command centre'}
            </Button>

            <p className="rounded-lg border border-line/70 bg-deep/50 p-3 text-[11px] leading-relaxed text-muted">
              Frontend demo build. Any registered operator email with a password of at least six characters is accepted.
              Prefilled: <span className="font-mono text-ink">{DEMO_CREDENTIALS.email}</span>
            </p>
          </form>
        </motion.div>
      </section>
    </main>
  );
}
