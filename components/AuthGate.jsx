'use client';

import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function AuthGate({ children }) {
  const [session, setSession] = useState(undefined); // undefined = still loading
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setError('Check your email to confirm your account, then sign in.');
        setMode('signin');
      }
    } catch (err) {
      setError(err.message || 'Something went wrong.');
    } finally {
      setBusy(false);
    }
  }

  if (session === undefined) {
    return (
      <div className="min-h-screen flex items-center justify-center text-white/40 text-sm">
        Loading…
      </div>
    );
  }

  if (!session) {
    return (
      <div className="min-h-screen flex items-center justify-center px-4">
        <form onSubmit={handleSubmit} className="glass w-full max-w-sm rounded-2xl p-6 shadow-2xl">
          <h1 className="text-lg font-medium mb-1">Budget Tracker</h1>
          <p className="text-white/40 text-sm mb-5">
            {mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
          </p>
          <div className="space-y-3">
            <input
              type="email"
              required
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 placeholder:text-white/30"
            />
            <input
              type="password"
              required
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-xl bg-white/5 border border-white/10 px-3 py-2 text-sm outline-none focus:border-white/25 placeholder:text-white/30"
            />
          </div>
          {error && <p className="text-red-400 text-xs mt-3">{error}</p>}
          <button
            disabled={busy}
            className="mt-4 w-full rounded-xl bg-white text-black text-sm font-medium py-2 hover:bg-white/90 disabled:opacity-50"
          >
            {busy ? 'Please wait…' : mode === 'signin' ? 'Sign in' : 'Sign up'}
          </button>
          <button
            type="button"
            onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            className="mt-3 w-full text-center text-xs text-white/40 hover:text-white/70"
          >
            {mode === 'signin' ? 'No account? Sign up' : 'Have an account? Sign in'}
          </button>
        </form>
      </div>
    );
  }

  return children(session.user);
}
