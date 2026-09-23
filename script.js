const panels = document.querySelectorAll('[data-view-panel]');
const navItems = document.querySelectorAll('[data-view]');
const toast = document.querySelector('#toast');
const detail = document.querySelector('#call-detail');
const splash = document.querySelector('#splash-screen');
const appShell = document.querySelector('.app-shell');
const contactModal = document.querySelector('#contact-modal');
const contactForm = document.querySelector('#contact-form');
const formStatus = document.querySelector('#form-status');
const supabaseUrl = 'https://frhohipnsqzariwppaxx.supabase.co';
const publishableKey = window.SWITCHBOARD_CONFIG?.publishableKey || '';

function showView(view) {
  panels.forEach((panel) => panel.classList.toggle('is-visible', panel.dataset.viewPanel === view));
  navItems.forEach((item) => item.classList.toggle('is-active', item.dataset.view === view));
}

function openCall() {
  detail.classList.add('is-open');
  detail.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
}

function closeCall() {
  detail.classList.remove('is-open');
  detail.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}

navItems.forEach((item) => item.addEventListener('click', () => showView(item.dataset.view)));
document.querySelectorAll('[data-view-target]').forEach((item) => item.addEventListener('click', () => showView(item.dataset.viewTarget)));
document.querySelectorAll('[data-open-call]').forEach((row) => row.addEventListener('click', openCall));
document.querySelectorAll('[data-close-call]').forEach((item) => item.addEventListener('click', closeCall));
document.querySelector('#view-guardrails').addEventListener('click', () => {
  showView('automations');
  notify('Guardrails are part of the active intake policy.');
});
document.querySelector('#run-test').addEventListener('click', () => notify('Test call queued in staging.'));
document.querySelector('#filter-pending').addEventListener('click', (event) => {
  event.currentTarget.textContent = event.currentTarget.textContent.includes('pending') ? 'Show all calls' : 'Show pending only';
  notify('Inbox filter updated.');
});
document.querySelector('#enter-demo').addEventListener('click', () => {
  splash.classList.add('is-dismissed');
  appShell.classList.add('is-entered');
  window.scrollTo(0, 0);
});
document.querySelector('#open-contact').addEventListener('click', () => {
  contactModal.classList.add('is-open');
  contactModal.setAttribute('aria-hidden', 'false');
  document.body.style.overflow = 'hidden';
});
document.querySelectorAll('[data-close-contact]').forEach((item) => item.addEventListener('click', () => {
  contactModal.classList.remove('is-open');
  contactModal.setAttribute('aria-hidden', 'true');
  document.body.style.overflow = '';
}));
contactForm.addEventListener('submit', async (event) => {
  event.preventDefault();
  const submit = contactForm.querySelector('button[type="submit"]');
  const payload = Object.fromEntries(new FormData(contactForm).entries());
  submit.disabled = true;
  formStatus.classList.remove('error');
  formStatus.textContent = 'Sending your note…';
  try {
    if (publishableKey && window.supabase) {
      const client = window.supabase.createClient(supabaseUrl, publishableKey);
      const { error } = await client.from('contact_submissions').insert(payload);
      if (error) throw error;
      formStatus.textContent = 'Received — we’ll be in touch soon.';
    } else {
      const existing = JSON.parse(localStorage.getItem('switchboard-contact-demo') || '[]');
      existing.push({ ...payload, created_at: new Date().toISOString() });
      localStorage.setItem('switchboard-contact-demo', JSON.stringify(existing));
      formStatus.textContent = 'Saved in demo mode — add the publishable key to send it to Supabase.';
    }
    contactForm.reset();
  } catch (error) {
    formStatus.classList.add('error');
    formStatus.textContent = 'Could not send yet. Please try again.';
    console.error('Contact submission failed', error);
  } finally {
    submit.disabled = false;
  }
});
document.addEventListener('keydown', (event) => { if (event.key === 'Escape') closeCall(); });

let toastTimer;
function notify(message) {
  toast.textContent = message;
  toast.classList.add('is-visible');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.classList.remove('is-visible'), 2600);
}
