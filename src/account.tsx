import {useState, type FormEvent} from 'react';
import {ArrowRight} from 'lucide-react';
import {accountsEnabled, useShortlist} from './lib/use-shortlist';

type Shortlist = ReturnType<typeof useShortlist>;

export default function Account({shortlist}: {shortlist: Shortlist}) {
  const {client, user, authError, importable, importGuest, busy, loading, error} = shortlist;
  const [email, setEmail] = useState('');
  const [sentTo, setSentTo] = useState('');
  const [code, setCode] = useState('');
  const [action, setAction] = useState('');
  const [feedback, setFeedback] = useState('');
  const [failure, setFailure] = useState('');
  const [confirmDelete, setConfirmDelete] = useState(false);

  async function perform(name: string, task: () => Promise<void>, message: string) {
    setAction(name);
    setFeedback('');
    setFailure('');
    try {
      await task();
    } catch {
      setFailure(message);
    } finally {
      setAction('');
    }
  }

  function sendCode(event: FormEvent) {
    event.preventDefault();
    if (!client || action) return;
    const address = (sentTo || email).trim();
    void perform('sending', async () => {
      const {error} = await client.auth.signInWithOtp({email: address});
      if (error) throw error;
      setSentTo(address);
      setCode('');
      setFeedback('Check your inbox for a sign-in code.');
    }, 'Could not send a code. Check your address and wait a minute before trying again.');
  }

  function verifyCode(event: FormEvent) {
    event.preventDefault();
    if (!client || action) return;
    void perform('verifying', async () => {
      const {error} = await client.auth.verifyOtp({email: sentTo, token: code.trim(), type: 'email'});
      if (error) throw error;
      setSentTo('');
      setCode('');
      setFeedback('');
    }, 'That code could not be verified. Check the code or request a new one.');
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
        : loading && !user ? <p role="status">Checking your session…</p>
        : user ? <>
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
            <h3>Delete account</h3>
            <p>Deleting your account permanently removes your online shortlist and study sessions.</p>
            {confirmDelete ? <div className="account-actions">
              <button className="outline-button account-delete" disabled={disabled} onClick={deleteAccount}>Permanently delete account</button>
              <button className="text-button" disabled={disabled} onClick={() => setConfirmDelete(false)}>Cancel</button>
            </div> : <button className="text-button account-delete" disabled={disabled} onClick={() => setConfirmDelete(true)}>Delete my account</button>}
          </div>
        </> : <>
          <h2>{sentTo ? 'Enter your code' : 'Sign in or create an account'}</h2>
          <p>{sentTo ? <>We sent a code to <strong>{sentTo}</strong>.</> : 'Get a one-time code by email to save your shortlist across devices.'}</p>
          {sentTo ? <>
            <form className="account-form" onSubmit={verifyCode}>
              <label htmlFor="account-code">Sign-in code</label>
              <input id="account-code" name="code" value={code} onChange={e => setCode(e.target.value)}
                inputMode="numeric" autoComplete="one-time-code" pattern="[0-9]{6,10}" maxLength={10} required/>
              <button className="primary-button" type="submit" disabled={disabled}>Verify code<ArrowRight size={16}/></button>
            </form>
            <div className="account-actions">
              <form onSubmit={sendCode}><button className="text-button" disabled={disabled}>Resend code</button></form>
              <button className="text-button" disabled={disabled} onClick={() => {
                setSentTo('');
                setCode('');
                setFailure('');
                setFeedback('');
              }}>Change email</button>
            </div>
          </> : <form className="account-form" onSubmit={sendCode}>
            <label htmlFor="account-email">Email address</label>
            <input id="account-email" name="email" type="email" autoComplete="email"
              maxLength={254} value={email} onChange={e => setEmail(e.target.value)} required/>
            <button className="primary-button" type="submit" disabled={disabled}>Email me a code<ArrowRight size={16}/></button>
          </form>}
          <a className="text-button account-privacy" href="/privacy.html">Account privacy</a>
        </>}
      {action && <p role="status">Working…</p>}
      {feedback && <p role="status">{feedback}</p>}
      {accountError && <p className="error-text" role="alert">{accountError}</p>}
      {(!accountsEnabled || authError) && <a className="outline-button" href="#/saved">Open saved courses<ArrowRight size={16}/></a>}
    </div>
  </section>;
}
