import { useState, type FormEvent } from 'react';
import { Navigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthContext';
import { isMockMode } from '../data';

export function Login() {
  const { session, signIn } = useAuth();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  if (session) return <Navigate to="/products" replace />;

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);
    try {
      await signIn(email, password);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid email or password.');
      setPassword('');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div style={{ display: 'flex', minHeight: '100vh' }}>
      <div style={{ flex: 1, background: 'var(--color-surface)', display: 'flex', flexDirection: 'column', justifyContent: 'center', padding: 72, gap: 18 }}>
        <div style={{ fontFamily: 'var(--font-heading)', fontSize: 15, letterSpacing: '.02em', color: 'var(--color-accent-700)' }}>ESTAY Furniture</div>
        <h1 style={{ fontSize: 48, maxWidth: '9ch', margin: 0 }}>Costing, kept current.</h1>
        <p style={{ maxWidth: '34ch', opacity: 0.75, fontSize: 15 }}>Live material pricing rolled straight into every table and chair you build.</p>
        <div style={{ display: 'flex', gap: 10, marginTop: 8 }}>
          <span className="tag tag-accent">Wood</span>
          <span className="tag tag-accent-2">Hardware</span>
          <span className="tag tag-neutral">Finish</span>
          <span className="tag tag-outline">Packaging</span>
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 72 }}>
        <form className="card elev-lg" style={{ width: 360, padding: '36px 32px', gap: 18 }} onSubmit={handleSubmit}>
          <h3 style={{ margin: '0 0 4px' }}>Sign in</h3>
          <div className="field">
            <label htmlFor="email">Email</label>
            <input id="email" className="input" value={email} onChange={(e) => setEmail(e.target.value)} autoComplete="username" required />
          </div>
          <div className="field">
            <label htmlFor="password">Password</label>
            <input id="password" className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn btn-primary btn-block" disabled={submitting}>
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
          {error && (
            <div className="callout">
              <span>{error}</span>
            </div>
          )}
          <p className="note" style={{ margin: '2px 0 0' }}>
            {isMockMode
              ? 'Demo mode — try maria@bomest.co / bomest123 (admin) or viewer@bomest.co / bomest123 (viewer).'
              : 'Accounts are created by an admin in the Supabase dashboard — no self sign-up.'}
          </p>
        </form>
      </div>
    </div>
  );
}
