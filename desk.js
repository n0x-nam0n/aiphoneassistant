(() => {
  const config = window.SWITCHBOARD_CONFIG || {};
  const supabaseUrl = config.projectUrl || 'https://frhohipnsqzariwppaxx.supabase.co';
  const publishableKey = config.publishableKey || '';
  const loginPanel = document.querySelector('#login-panel');
  const deskContent = document.querySelector('#desk-content');
  const loginForm = document.querySelector('#login-form');
  const resetRequestForm = document.querySelector('#reset-request-form');
  const newPasswordForm = document.querySelector('#new-password-form');
  const loginMessage = document.querySelector('#login-message');
  const loginSubmit = document.querySelector('#login-submit');
  const signOutButton = document.querySelector('#sign-out');
  const deskMessage = document.querySelector('#desk-message');
  const leadRows = document.querySelector('#lead-rows');
  const callRows = document.querySelector('#call-rows');
  const leadEmpty = document.querySelector('#lead-empty');
  const callEmpty = document.querySelector('#call-empty');
  const searchInput = document.querySelector('#search-input');
  const statusFilter = document.querySelector('#status-filter');
  const resetMessage = document.querySelector('#reset-message');
  const passwordMessage = document.querySelector('#password-message');
  const states = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
  const authMode = new URLSearchParams(window.location.search).get('mode');
  let client = null;
  let activeLocation = null;
  let leads = [];
  let calls = [];

  function message(target, value, isError = false) {
    target.textContent = value;
    target.classList.toggle('is-error', isError);
  }

  function makeCell(className, text) {
    const cell = document.createElement('td');
    if (className) cell.className = className;
    cell.textContent = text;
    return cell;
  }

  function formatDateTime(value) {
    if (!value) return { date: 'Date unavailable', time: '' };
    const date = new Date(value);
    if (Number.isNaN(date.getTime())) return { date: 'Date unavailable', time: '' };
    let base = {};
    if (activeLocation?.timezone) {
      try {
        new Intl.DateTimeFormat(undefined, { timeZone: activeLocation.timezone });
        base = { timeZone: activeLocation.timezone };
      } catch {
        message(deskMessage, 'The restaurant time zone needs correction. Dates are shown in your browser time zone.', true);
      }
    }
    return {
      date: new Intl.DateTimeFormat(undefined, { ...base, month: 'short', day: 'numeric', year: 'numeric' }).format(date),
      time: new Intl.DateTimeFormat(undefined, { ...base, hour: 'numeric', minute: '2-digit' }).format(date)
    };
  }

  function formatEventDate(value) {
    if (!value) return 'Date not set';
    const parts = value.split('-').map(Number);
    if (parts.length !== 3 || parts.some((part) => !Number.isInteger(part))) return 'Date not set';
    const date = new Date(Date.UTC(parts[0], parts[1] - 1, parts[2]));
    if (Number.isNaN(date.getTime())) return 'Date not set';
    return new Intl.DateTimeFormat(undefined, { timeZone: 'UTC', month: 'short', day: 'numeric', year: 'numeric' }).format(date);
  }

  function appendStacked(cell, primary, secondary, primaryClass = '', secondaryClass = '') {
    const first = document.createElement('span');
    first.className = primaryClass;
    first.textContent = primary || 'Not provided';
    const second = document.createElement('span');
    second.className = secondaryClass;
    second.textContent = secondary || '';
    cell.append(first, second);
  }

  async function fetchAllRows(buildQuery) {
    const pageSize = 500;
    const rows = [];
    for (let from = 0; ; from += pageSize) {
      const { data, error } = await buildQuery().range(from, from + pageSize - 1);
      if (error) throw error;
      rows.push(...(data || []));
      if (!data || data.length < pageSize) return rows;
    }
  }

  function formatBudget(amount, currency) {
    if (amount == null) return 'Not provided';
    const value = Number(amount);
    if (!Number.isFinite(value)) return 'Not provided';
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency: currency || 'USD', maximumFractionDigits: 0
      }).format(value);
    } catch {
      return `${currency || ''} ${value.toLocaleString()}`.trim();
    }
  }

  function renderLeads() {
    const term = searchInput.value.trim().toLocaleLowerCase();
    const selectedStatus = statusFilter.value;
    const filtered = leads.filter((lead) => {
      const matchesStatus = selectedStatus === 'all' || lead.status === selectedStatus;
      const searchText = [lead.caller_name, lead.caller_phone, lead.caller_email, lead.event_type, lead.notes].join(' ').toLocaleLowerCase();
      return matchesStatus && searchText.includes(term);
    });

    leadRows.replaceChildren();
    filtered.forEach((lead) => {
      const row = document.createElement('tr');
      const caller = document.createElement('td');
      appendStacked(caller, lead.caller_name || 'Caller', lead.caller_phone, 'caller-name', 'caller-contact');
      if (lead.caller_email) {
        const email = document.createElement('span');
        email.className = 'caller-contact';
        email.textContent = lead.caller_email;
        caller.append(email);
      }
      row.append(caller);

      const event = document.createElement('td');
      const requestedWhen = [formatEventDate(lead.event_date), lead.event_time].filter((part) => part && part !== 'Date not set').join(' · ');
      appendStacked(event, lead.event_type || 'Event inquiry', requestedWhen || 'Date not set', 'event-name', 'event-sub');
      if (lead.notes) {
        const notes = document.createElement('span');
        notes.className = 'event-sub';
        notes.textContent = lead.notes;
        event.append(notes);
      }
      row.append(event);

      row.append(makeCell('', lead.party_size ? `${lead.party_size} guests` : 'Not provided'));
      row.append(makeCell('budget', formatBudget(lead.budget_amount, lead.budget_currency)));

      const received = formatDateTime(lead.created_at);
      const receivedCell = document.createElement('td');
      appendStacked(receivedCell, received.date, received.time, 'table-date', 'table-time');
      row.append(receivedCell);

      const statusCell = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'followup-select';
      select.setAttribute('aria-label', `Follow-up status for ${lead.caller_name || lead.caller_phone}`);
      select.dataset.status = lead.status;
      states.forEach((state) => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        option.selected = state === lead.status;
        select.append(option);
      });
      select.addEventListener('change', () => updateLeadStatus(lead, select));
      statusCell.append(select);
      row.append(statusCell);
      leadRows.append(row);
    });

    document.querySelector('#lead-count-label').textContent = `${filtered.length} ${filtered.length === 1 ? 'inquiry' : 'inquiries'}`;
    leadEmpty.hidden = filtered.length > 0;
    document.querySelector('#new-count').textContent = String(leads.filter((lead) => lead.status === 'New').length);
  }

  function renderCalls() {
    const sortedCalls = [...calls].sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);
    callRows.replaceChildren();
    sortedCalls.forEach((call) => {
      const row = document.createElement('tr');
      const callId = document.createElement('td');
      callId.className = 'call-ref';
      callId.textContent = call.source_call_id;
      row.append(callId);

      const outcome = document.createElement('td');
      const label = document.createElement('span');
      label.className = 'outcome';
      label.dataset.outcome = call.outcome;
      label.textContent = call.outcome.replaceAll('_', ' ');
      outcome.append(label);
      row.append(outcome);

      const duration = call.duration_seconds == null ? '—' : `${Math.floor(call.duration_seconds / 60)}m ${call.duration_seconds % 60}s`;
      row.append(makeCell('', duration));
      row.append(makeCell('', call.transfer_state.replaceAll('_', ' ')));
      const when = formatDateTime(call.started_at || call.created_at);
      const whenCell = document.createElement('td');
      appendStacked(whenCell, when.date, when.time, 'table-date', 'table-time');
      row.append(whenCell);
      callRows.append(row);
    });
    callEmpty.hidden = sortedCalls.length > 0;
    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    document.querySelector('#month-count').textContent = String(calls.filter((call) => new Date(call.created_at) >= monthStart).length);
  }

  async function updateLeadStatus(lead, select) {
    const oldStatus = lead.status;
    const nextStatus = select.value;
    select.disabled = true;
    const { error } = await client.from('leads')
      .update({ status: nextStatus })
      .eq('id', lead.id)
      .eq('location_id', activeLocation.id);
    select.disabled = false;
    if (error) {
      select.value = oldStatus;
      select.dataset.status = oldStatus;
      message(deskMessage, 'Could not update this inquiry. Refresh and try again.', true);
      return;
    }
    lead.status = nextStatus;
    select.dataset.status = nextStatus;
    message(deskMessage, `Follow-up status saved as ${nextStatus}.`);
    renderLeads();
  }

  async function loadDesk() {
    message(deskMessage, 'Loading the restaurant desk…');
    const { data: organizations, error: orgError } = await client.from('organizations').select('id,name');
    if (orgError) throw orgError;
    if (!organizations?.length) throw new Error('No restaurant workspace is assigned to this account.');

    const organizationIds = organizations.map((organization) => organization.id);
    const { data: locations, error: locationError } = await client.from('locations')
      .select('id,organization_id,name,timezone')
      .in('organization_id', organizationIds);
    if (locationError) throw locationError;
    if (locations?.length !== 1) throw new Error('This account must be assigned to exactly one restaurant location. Contact your Hostess operator.');

    activeLocation = locations[0];
    document.querySelector('#location-name').textContent = activeLocation.name;
    document.querySelector('#account-email').textContent = (await client.auth.getUser()).data.user?.email || '';
    [leads, calls] = await Promise.all([
      fetchAllRows(() => client.from('leads')
        .select('id,request_id,call_id,caller_phone,caller_name,caller_email,event_type,event_date,event_time,party_size,budget_amount,budget_currency,notes,status,created_at')
        .eq('location_id', activeLocation.id)
        .order('created_at', { ascending: false })),
      fetchAllRows(() => client.from('calls')
        .select('id,source_call_id,started_at,duration_seconds,outcome,transfer_state,created_at')
        .eq('location_id', activeLocation.id)
        .order('created_at', { ascending: false }))
    ]);
    renderLeads();
    renderCalls();
    message(deskMessage, `${leads.length} inquiries and ${calls.length} calls loaded.`);
    loginPanel.hidden = true;
    deskContent.hidden = false;
    signOutButton.hidden = false;
  }

  function csvValue(value) {
    let normalized = String(value ?? '');
    if (/^[\u0000-\u0020]*[=+\-@]/.test(normalized)) normalized = `'${normalized}`;
    const safe = normalized.replaceAll('"', '""');
    return `"${safe}"`;
  }

  function exportCsv() {
    const callById = new Map(calls.map((call) => [call.id, call]));
    const headers = ['request_id', 'created_at', 'caller_name', 'caller_phone', 'caller_email', 'event_type', 'event_date', 'event_time', 'party_size', 'budget_amount', 'budget_currency', 'lead_status', 'call_outcome', 'transfer_state', 'notes'];
    const lines = [headers.map(csvValue).join(',')];
    leads.forEach((lead) => {
      const call = callById.get(lead.call_id) || {};
      const values = [lead.request_id, lead.created_at, lead.caller_name, lead.caller_phone, lead.caller_email, lead.event_type, lead.event_date, lead.event_time, lead.party_size, lead.budget_amount, lead.budget_currency, lead.status, call.outcome, call.transfer_state, lead.notes];
      lines.push(values.map(csvValue).join(','));
    });
    const blob = new Blob([`\uFEFF${lines.join('\r\n')}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `hostess-inquiries-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.append(link);
    link.click();
    link.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  loginForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) {
      message(loginMessage, 'The desk is not connected yet. Contact your Hostess operator.', true);
      return;
    }
    loginSubmit.disabled = true;
    message(loginMessage, 'Signing in…');
    const form = new FormData(loginForm);
    try {
      const { error } = await client.auth.signInWithPassword({
        email: form.get('email'),
        password: form.get('password')
      });
      if (error) throw error;
    } catch {
      loginSubmit.disabled = false;
      message(loginMessage, 'Sign-in failed. Check your details or contact your Hostess operator.', true);
      return;
    }
    loginSubmit.disabled = false;
    try {
      await loadDesk();
    } catch (loadError) {
      message(loginMessage, loadError.message || 'This account cannot open a restaurant workspace.', true);
      await client.auth.signOut();
    }
  });

  signOutButton.addEventListener('click', async () => {
    await client.auth.signOut();
    activeLocation = null;
    deskContent.hidden = true;
    loginPanel.hidden = false;
    loginForm.hidden = false;
    resetRequestForm.hidden = true;
    newPasswordForm.hidden = true;
    signOutButton.hidden = true;
    document.querySelector('#location-name').textContent = 'Sign in to continue';
    document.querySelector('#account-email').textContent = '';
    message(loginMessage, 'You are signed out.');
  });

  document.querySelector('#refresh-data').addEventListener('click', async () => {
    try {
      await loadDesk();
    } catch {
      message(deskMessage, 'Could not refresh the restaurant desk. Check your connection and try again.', true);
    }
  });
  searchInput.addEventListener('input', renderLeads);
  statusFilter.addEventListener('change', renderLeads);
  document.querySelector('#export-csv').addEventListener('click', exportCsv);

  document.querySelector('#show-reset').addEventListener('click', () => {
    document.querySelector('#reset-email').value = document.querySelector('#login-email').value;
    loginForm.hidden = true;
    resetRequestForm.hidden = false;
  });
  document.querySelector('#back-to-login').addEventListener('click', () => {
    resetRequestForm.hidden = true;
    loginForm.hidden = false;
  });

  resetRequestForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!client) {
      message(resetMessage, 'The desk is not connected yet. Contact your Hostess operator.', true);
      return;
    }
    const button = document.querySelector('#reset-submit');
    button.disabled = true;
    const redirectTo = new URL('desk.html?mode=reset', window.location.href).toString();
    try {
      const { error } = await client.auth.resetPasswordForEmail(document.querySelector('#reset-email').value, { redirectTo });
      if (error) throw error;
      message(resetMessage, 'If an account is registered for that email, a reset link is on its way.');
    } catch {
      message(resetMessage, 'Could not request a reset link. Check the email and try again.', true);
    } finally {
      button.disabled = false;
    }
  });

  newPasswordForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    const password = document.querySelector('#new-password').value;
    const confirmation = document.querySelector('#confirm-password').value;
    if (password !== confirmation) {
      message(passwordMessage, 'The passwords do not match.', true);
      return;
    }
    const button = document.querySelector('#password-submit');
    button.disabled = true;
    try {
      const { error } = await client.auth.updateUser({ password });
      if (error) throw error;
      window.history.replaceState(null, document.title, window.location.pathname);
      message(passwordMessage, 'Password saved. Opening your restaurant desk…');
      await loadDesk();
    } catch {
      message(passwordMessage, 'Could not save that password. Request a new reset link and try again.', true);
    } finally {
      button.disabled = false;
    }
  });

  if (window.supabase && publishableKey && !publishableKey.includes('replace_me')) {
    client = window.supabase.createClient(supabaseUrl, publishableKey);
    client.auth.onAuthStateChange((event) => {
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && authMode === 'invite')) {
        loginPanel.hidden = false;
        deskContent.hidden = true;
        loginForm.hidden = true;
        resetRequestForm.hidden = true;
        newPasswordForm.hidden = false;
      }
    });
    client.auth.getSession().then(async ({ data, error }) => {
      if (!error && data.session) {
        if (authMode === 'invite') {
          loginPanel.hidden = false;
          loginForm.hidden = true;
          resetRequestForm.hidden = true;
          newPasswordForm.hidden = false;
          message(passwordMessage, 'Set a password to finish opening your restaurant desk.');
          return;
        }
        try {
          await loadDesk();
        } catch (loadError) {
          await client.auth.signOut();
          message(loginMessage, loadError.message || 'This account cannot open a restaurant workspace.', true);
        }
      }
    });
  }
})();
