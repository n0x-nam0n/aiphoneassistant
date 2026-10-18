(() => {
  const form = document.querySelector('#password-form');
  const status = document.querySelector('#reset-status');
  const button = document.querySelector('#save-password');
  const config = window.SWITCHBOARD_CONFIG || {};
  const tokenHash = new URLSearchParams(window.location.hash.slice(1)).get('token_hash');
  // Remove the secret from browser history. Do not verify or consume it until
  // the caller explicitly submits a new password; link previews cannot use it.
  window.history.replaceState(null, document.title, window.location.pathname);
  const client = window.supabase && config.publishableKey
    ? window.supabase.createClient(config.projectUrl || 'https://frhohipnsqzariwppaxx.supabase.co', config.publishableKey,
      { auth: { persistSession: false, detectSessionInUrl: false, autoRefreshToken: false } })
    : null;
  let verified = false;
  function fail(value) { status.textContent = value; status.classList.add('is-error'); }
  if (!client || !tokenHash) {
    button.disabled = true;
    fail(!tokenHash ? 'This page needs your private reset link. Open the newest link provided for your account.' : 'Password setup could not load. Refresh and try again.');
  }
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.querySelector('#password').value;
    if (password.length < 12) return fail('Choose a password with at least 12 characters.');
    if (password !== document.querySelector('#confirmation').value) return fail('The passwords do not match.');
    if (!client || !tokenHash) return;
    button.disabled = true;
    status.textContent = 'Saving your password…';
    status.classList.remove('is-error');
    try {
      if (!verified) {
        const { error } = await client.auth.verifyOtp({ token_hash: tokenHash, type: 'recovery' });
        if (error) { fail('This reset link has expired or was already used. Request a fresh private reset link.'); return; }
        verified = true;
      }
      const { error } = await client.auth.updateUser({ password, data: { must_set_password: false } });
      if (error) { fail('The password could not be saved. Choose a different password and try again.'); return; }
      await client.auth.signOut();
      form.reset();
      form.hidden = true;
      document.querySelector('#reset-success').hidden = false;
    } catch {
      fail('Could not connect. Check your connection and press Save password again.');
    } finally {
      button.disabled = false;
    }
  });
})();
