import {useRef, useState, type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {accountsEnabled, useShortlist} from './lib/use-shortlist';

type Shortlist = ReturnType<typeof useShortlist>;

type AccountMode = 'signin' | 'signup' | 'recover';
const minimumPasswordLength = 12;

function PasswordField({password, onChange, isNew}: {
  password: string;
  onChange: (password: string) => void;
  isNew: boolean;
}) {
  const [visible, setVisible] = useState(false);
  return <>
    <label htmlFor="account-password">{isNew ? 'New password' : 'Password'}</label>
    <div className="account-password-field">
      <input id="account-password" name="password" type={visible ? 'text' : 'password'}
        autoComplete={isNew ? 'new-password' : 'current-password'} aria-describedby={isNew ? 'password-hint' : undefined}
        minLength={isNew ? minimumPasswordLength : undefined} required
        value={password} onChange={event => onChange(event.target.value)}/>
      <button type="button" className="text-button" aria-controls="account-password"
        onClick={() => setVisible(value => !value)}>{visible ? 'Hide password' : 'Show password'}</button>
    </div>
    {isNew && <p id="password-hint" className="account-field-hint">Use at least {minimumPasswordLength} characters.</p>}
  </>;
}

export default function Account({shortlist}: {shortlist: Shortlist}) {
  const {client, user, authReady, authError, importable, importGuest, busy, loading, error} = shortlist;
  const [mode, setMode] = useState<AccountMode>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [verifiedId, setVerifiedId] = useState<string | null>(null);
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [action, setAction] = useState('');
  const working = useRef(false);
  const [feedback, setFeedback] = useState('');
  const [failure, setFailure] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function perform(name: string, task: () => Promise<void>, message: string | ((error: unknown) => string)) {
    if (working.current) return;
    working.current = true;
    setAction(name);
    setFeedback('');
    setFailure('');
    try {
      await task();
    } catch (error) {
      setFailure(typeof message === 'function' ? message(error) : message);
    } finally {
      working.current = false;
      setAction('');
    }
  }

  function changeMode(next: AccountMode) {
    setMode(next);
    setSentTo('');
    setCode('');
    setPassword('');
    setVerifiedId(null);
    setFailure('');
    setFeedback('');
  }

  function signIn(event: FormEvent) {
    event.preventDefault();
    if (!client || action) return;
    void perform('signing in', async () => {
      const {error} = await client.auth.signInWithPassword({email: email.trim(), password});
      if (error) throw error;
      setPassword('');
    }, 'Could not sign in. Check your email and password, or use Set or reset password.');
  }

  function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!client || action) return;
    const address = (sentTo || user?.email || email).trim();
    void perform('sending', async () => {
      const {error} = await client.auth.signInWithOtp({
        email: address,
        options: {shouldCreateUser: mode === 'signup'},
      });
      // Give the same recovery prompt whether or not the address has an account.
      if (error && !(mode === 'recover' && ['otp_disabled', 'user_not_found'].includes(error.code ?? ''))) {
        throw error;
      }
      setSentTo(address);
      setCode('');
      setFeedback(mode === 'signup' ? 'Check your inbox for the code.' : 'If this email has an account, the code will arrive in its inbox.');
    }, 'Could not send a code. Check your address and wait a minute before trying again.');
  }

  function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!client || action) return;
    void perform('verifying', async () => {
      const {data, error} = await client.auth.verifyOtp({email: sentTo, token: code.trim(), type: 'email'});
      if (error || !data.session) throw error ?? new Error('Missing verification session');
      setVerifiedId(data.session.user.id);
      setCode('');
    }, 'That code could not be verified. Check the code or request a new one.');
  }

  function savePassword(event: FormEvent) {
    event.preventDefault();
    if (!client || action || !verifiedId) return;
    if (new TextEncoder().encode(password).length > 72) {
      setFailure('Use a shorter password. Passwords can contain up to 72 bytes.');
      return;
    }
    void perform('saving password', async () => {
      const {data: {session}} = await client.auth.getSession();
      if (session?.user.id !== verifiedId) {
        changeMode('recover');
        setFailure('Your session changed. Request a new code to set your password.');
        return;
      }
      const {error} = await client.auth.updateUser({password});
      if (error) throw error;
      changeMode('signin');
      setFeedback('Password saved. Use it the next time you sign in.');
    }, error => {
      const code = (error as {code?: string} | null)?.code;
      if (code === 'weak_password') return 'Choose a stronger password and try again.';
      if (code === 'same_password') return 'Choose a password different from your current one.';
      return 'Could not save your password. Try again, or go back and request a fresh code.';
    });
  }

  function signOut() {
    if (!client || action) return;
    void perform('signing out', async () => {
      const {error} = await client.auth.signOut({scope: 'local'});
      if (error) throw error;
      setEmail('');
      setConfirmDelete(false);
      setFeedback('You are signed out.');
    }, 'Could not sign out. Please try again.');
  }

  function deleteAccount() {
    if (!client || !confirmDelete || action) return;
    void perform('deleting', async () => {
      const {error} = await client.functions.invoke('delete-cao-account');
      if (error) throw error;
      await client.auth.signOut({scope: 'local'});
      setConfirmDelete(false);
      setEmail('');
      setFeedback('Your account, online shortlist, and study log were deleted.');
    }, 'Could not delete your account. Please try again.');
  }

  const disabled = !!action || busy;
  const accountError = failure || authError || (user ? error : '');
  return <section className="content-width account-area">
    <div className="calculator-form account-panel">
      {!accountsEnabled ? <p>Online accounts are coming soon. You can save courses in this browser today.</p>
        : !client ? <p role="status">{authError ? 'Your browser shortlist is available.' : 'Connecting to accounts…'}</p>
        : !authReady ? <p role="status">Checking your session…</p>
        : user && mode === 'signin' ? <>
          <h2>Your account</h2>
          <p>Signed in as <strong>{user.email}</strong>. Your saved courses and study log sync across devices.</p>
          <div className="account-actions">
            <a className="primary-button" href="#/saved">View saved courses<ArrowRight size={16}/></a>
            <a className="outline-button" href="#/study">Open study tracker<ArrowRight size={16}/></a>
            <button className="outline-button" disabled={disabled} onClick={signOut}>Sign out</button>
          </div>
          {importable.length > 0 && <div className="account-section">
            <h3>Courses saved in this browser</h3>
            <p>Add {importable.length} {importable.length === 1 ? 'course' : 'courses'} from this browser to your account.</p>
            <button className="outline-button" disabled={disabled || loading} onClick={() => {
              void perform('importing', async () => {
                if (!await importGuest()) throw new Error('Import failed');
                setFeedback('Your courses were added to your account.');
              }, 'Could not import your courses. Please try again.');
            }}>Import saved courses</button>
          </div>}
          <div className="account-section">
            <h3>Password</h3>
            <button type="button" className="outline-button" disabled={disabled} onClick={() => changeMode('recover')}>Set or change password</button>
          </div>
          <div className="account-section">
            <h3>Delete account</h3>
            <p>Deleting your account permanently removes your online shortlist and study sessions.</p>
            {confirmDelete ? <div className="account-actions">
              <button className="outline-button account-delete" disabled={disabled} onClick={deleteAccount}>Permanently delete account</button>
              <button className="text-button" disabled={disabled} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div> : <button className="text-button account-delete" disabled={disabled} onClick={() => setConfirmDelete(true)}>Delete my account</button>}
          </div>
        </> : <>
          {verifiedId && verifiedId === user?.id ? <>
            <h2>Choose a password</h2>
            <p>Use it to sign in to <strong>{sentTo}</strong>.</p>
            <form className="account-form" onSubmit={savePassword}>
              <input type="hidden" name="username" value={sentTo} autoComplete="username"/>
              <PasswordField key="new" password={password} onChange={setPassword} isNew/>
              <button className="primary-button" type="submit" disabled={disabled}>Save password<ArrowRight size={16}/></button>
            </form>
            <button type="button" className="text-button" disabled={disabled} onClick={() => changeMode('signin')}>Back to account</button>
          </> : sentTo ? <>
            <h2>Enter your email code</h2>
            <p>Email address <strong>{sentTo}</strong></p>
            <form className="account-form" onSubmit={verifyCode}>
              <label htmlFor="account-code">Verification code</label>
              <input id="account-code" name="code" value={code} onChange={event => setCode(event.target.value)}
                inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required/>
              <button className="primary-button" type="submit" disabled={disabled}>Verify code<ArrowRight size={16}/></button>
            </form>
            <div className="account-actions">
              <form onSubmit={sendCode}><button className="text-button" disabled={disabled}>Resend code</button></form>
              <button type="button" className="text-button" disabled={disabled} onClick={() => changeMode(mode)}>Back</button>
            </div>
          </> : <>
            <h2>{mode === 'signup' ? 'Create an account' : mode === 'recover' ? 'Set or reset password' : 'Sign in'}</h2>
            {mode !== 'signin' && <p>Verify your email with a code, then choose a password.</p>}
            <form className="account-form" onSubmit={mode === 'signin' ? signIn : sendCode}>
              <label htmlFor="account-email">Email address</label>
              <input id="account-email" name="email" type="email" autoComplete={mode === 'signin' ? 'username' : 'email'}
                maxLength={254} value={user?.email ?? email} readOnly={!!user}
                onChange={event => setEmail(event.target.value)} required/>
              {mode === 'signin' && <PasswordField key="current" password={password} onChange={setPassword} isNew={false}/>}
              <button className="primary-button" type="submit" disabled={disabled}>
                {mode === 'signin' ? 'Sign in' : 'Email me a code'}<ArrowRight size={16}/>
              </button>
            </form>
            <div className="account-actions">
              {mode === 'signin' ? <>
                <button type="button" className="text-button" disabled={disabled} onClick={() => changeMode('signup')}>Create an account</button>
                <button type="button" className="text-button" disabled={disabled} onClick={() => changeMode('recover')}>Set or reset password</button>
              </> : <button type="button" className="text-button" disabled={disabled} onClick={() => changeMode('signin')}>
                {user ? 'Back to account' : 'Back to sign in'}
              </button>}
            </div>
          </>}
          <a className="text-button account-privacy" href="/privacy.html">Account privacy</a>
        </>}
      {action && <p role="status">Working…</p>}
      {feedback && <p role="status">{feedback}</p>}
      {accountError && <p className="error-text" role="alert">{accountError}</p>}
      {(!accountsEnabled || authError) && <a className="outline-button" href="#/saved">Open saved courses<ArrowRight size={16}/></a>}
    </div>
  </section>;
}
