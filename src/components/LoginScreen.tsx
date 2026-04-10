import { useState } from 'react';
import { SupabaseService } from '../supabaseClient';

export default function LoginScreen({ onLogin }: { onLogin: () => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [signupSuccess, setSignupSuccess] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');
    setSignupSuccess(false);
    try {
      if (mode === 'login') {
        await SupabaseService.signIn(email, password);
        onLogin();
      } else {
        const data = await SupabaseService.signUp(email, password);
        if (data.user && !data.session) {
          setSignupSuccess(true);
        } else {
          onLogin();
        }
      }
    } catch (err: any) {
      const msg = err?.message || String(err);
      if (msg.includes('Invalid login credentials')) {
        setError('Ungültige Anmeldedaten');
      } else if (msg.includes('User already registered')) {
        setError('Diese E-Mail ist bereits registriert');
      } else if (msg.includes('Password should be at least')) {
        setError('Passwort muss mindestens 6 Zeichen lang sein');
      } else if (msg.includes('Unable to validate email')) {
        setError('Ungültige E-Mail-Adresse');
      } else {
        setError(msg);
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="login-container">
      <div className="login-box">
        <div className="login-header">
          <div className="login-logo"><span>SM</span></div>
          <h1>Social Agent</h1>
          <p>{mode === 'login' ? 'Melde dich an, um fortzufahren' : 'Neues Konto erstellen'}</p>
        </div>
        {signupSuccess ? (
          <div className="signup-success">
            <p>Registrierung erfolgreich! Bitte prüfe deine E-Mails und bestätige dein Konto.</p>
            <button className="login-button" onClick={() => { setMode('login'); setSignupSuccess(false); }}>
              Zum Login
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="input-group">
              <label>E-Mail</label>
              <input type="email" value={email} onChange={e => setEmail(e.target.value)} placeholder="name@example.com" required />
            </div>
            <div className="input-group">
              <label>Passwort</label>
              <input type="password" value={password} onChange={e => setPassword(e.target.value)} placeholder="••••••••" required />
            </div>
            {error && <div className="error-message">{error}</div>}
            <button type="submit" className="login-button" disabled={isLoading}>
              {isLoading ? (mode === 'login' ? 'Anmeldung läuft...' : 'Registrierung läuft...') : (mode === 'login' ? 'Anmelden' : 'Registrieren')}
            </button>
          </form>
        )}
        <div className="login-footer">
          {mode === 'login' ? (
            <p>Noch kein Konto? <button className="link-button" onClick={() => { setMode('signup'); setError(''); }}>Registrieren</button></p>
          ) : (
            <p>Bereits registriert? <button className="link-button" onClick={() => { setMode('login'); setError(''); }}>Anmelden</button></p>
          )}
        </div>
      </div>
    </div>
  );
}
