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
  const callbackRows = document.querySelector('#callback-rows');
  const leadEmpty = document.querySelector('#lead-empty');
  const callEmpty = document.querySelector('#call-empty');
  const callbackEmpty = document.querySelector('#callback-empty');
  const searchInput = document.querySelector('#search-input');
  const statusFilter = document.querySelector('#status-filter');
  const categoryFilter = document.querySelector('#category-filter');
  const priorityFilter = document.querySelector('#priority-filter');
  const dateFilter = document.querySelector('#date-filter');
  const overdueFilter = document.querySelector('#overdue-filter');
  const emailFailedFilter = document.querySelector('#email-failed-filter');
  const showTestData = document.querySelector('#show-test-data');
  const resetMessage = document.querySelector('#reset-message');
  const passwordMessage = document.querySelector('#password-message');
  const states = ['New', 'Contacted', 'Qualified', 'Won', 'Lost'];
  const callbackStates = ['New', 'Contacted', 'Completed'];
  const queryParams = new URLSearchParams(window.location.search);
  const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''));
  const authMode = queryParams.get('mode');
  const authType = queryParams.get('type') || hashParams.get('type');
  const isInviteFlow = authMode === 'invite' || authType === 'invite';
  let isRecoveryFlow = authMode === 'reset' || authType === 'recovery';
  let client = null;
  let activeLocation = null;
  let deskLoadVersion = 0;
  const restaurantSelect = document.querySelector('#restaurant-select');
  let leads = [];
  let calls = [];
  let callbackRequests = [];
  let callbackNotifications = [];
  let followupActivities = [];

  function message(target, value, isError = false) {
    target.textContent = value;
    target.classList.toggle('is-error', isError);
  }

  function showPasswordSetup(value = 'Set a password to finish opening your restaurant desk.') {
    loginPanel.hidden = false;
    deskContent.hidden = true;
    loginForm.hidden = true;
    resetRequestForm.hidden = true;
    newPasswordForm.hidden = false;
    message(passwordMessage, value);
  }

  function showInviteProblem(value) {
    loginPanel.hidden = false;
    deskContent.hidden = true;
    loginForm.hidden = false;
    resetRequestForm.hidden = true;
    newPasswordForm.hidden = true;
    message(loginMessage, value, true);
  }

  function showRecoveryProblem(value) {
    loginPanel.hidden = false;
    deskContent.hidden = true;
    loginForm.hidden = true;
    newPasswordForm.hidden = true;
    resetRequestForm.hidden = false;
    message(resetMessage, value, true);
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

  function appendPhoneLink(container, label, phone) {
    const line = document.createElement('span');
    line.className = 'caller-contact';
    line.append(`${label}: `);
    if (phone) {
      const link = document.createElement('a');
      link.href = `tel:${phone.replace(/[^+\d]/g, '')}`;
      link.textContent = phone;
      line.append(link);
    } else {
      line.append('Not captured');
    }
    container.append(line);
  }

  function isOverdue(item) {
    if (!item.followup_due_at || ['Won', 'Lost', 'Completed'].includes(item.status)) return false;
    const due = new Date(`${item.followup_due_at}T23:59:59`);
    return !Number.isNaN(due.getTime()) && due < new Date();
  }

  function matchesDateFilter(createdAt) {
    if (dateFilter.value === 'all') return true;
    const created = new Date(createdAt);
    if (Number.isNaN(created.getTime())) return false;
    const now = new Date();
    if (dateFilter.value === 'today') return created.toDateString() === now.toDateString();
    const days = Number(dateFilter.value);
    return created >= new Date(now.getTime() - days * 86400000);
  }

  function notificationFor(requestId) {
    return callbackNotifications.find((notification) => notification.callback_request_id === requestId);
  }

  function matchesCommonFilters(item, type) {
    if (item.is_test && !showTestData.checked) return false;
    if (statusFilter.value !== 'all' && item.status !== statusFilter.value) return false;
    if (!matchesDateFilter(item.created_at)) return false;
    if (overdueFilter.checked && !isOverdue(item)) return false;
    const isPriority = type === 'callback' && item.manager_notification_required;
    if (priorityFilter.value === 'priority' && !isPriority) return false;
    if (priorityFilter.value === 'standard' && isPriority) return false;
    if (categoryFilter.value !== 'all') {
      if (type === 'lead' && categoryFilter.value !== 'event') return false;
      if (type === 'callback' && categoryFilter.value !== item.request_category) return false;
    }
    if (emailFailedFilter.checked) {
      if (type !== 'callback' || notificationFor(item.id)?.status !== 'failed') return false;
    }
    return true;
  }

  function appendOverdueMarker(cell, item) {
    if (!isOverdue(item)) return;
    const marker = document.createElement('span');
    marker.className = 'overdue-marker';
    marker.textContent = `Overdue · ${formatEventDate(item.followup_due_at)}`;
    cell.append(marker);
  }

  function createFollowupControls(item, type) {
    const wrap = document.createElement('div');
    wrap.className = 'followup-controls';
    const assignment = document.createElement('div');
    assignment.className = 'assignment-fields';
    const assignee = document.createElement('input');
    assignee.type = 'text';
    assignee.value = item.assigned_to || '';
    assignee.placeholder = 'Assign to';
    assignee.setAttribute('aria-label', `Assignee for ${item.caller_name || 'request'}`);
    const due = document.createElement('input');
    due.type = 'date';
    due.value = item.followup_due_at || '';
    due.setAttribute('aria-label', `Follow-up due date for ${item.caller_name || 'request'}`);
    assignee.addEventListener('change', () => updateFollowupFields(item, type, assignee, due));
    due.addEventListener('change', () => updateFollowupFields(item, type, assignee, due));
    assignment.append(assignee, due);

    const activity = document.createElement('div');
    activity.className = 'activity-entry';
    const activityType = document.createElement('select');
    activityType.setAttribute('aria-label', `Activity type for ${item.caller_name || 'request'}`);
    [['called', 'Called'], ['left_voicemail', 'Left voicemail'], ['unreachable', 'Unreachable'], ['note', 'Note']].forEach(([value, label]) => {
      const option = document.createElement('option');
      option.value = value;
      option.textContent = label;
      activityType.append(option);
    });
    const note = document.createElement('input');
    note.type = 'text';
    note.maxLength = 1000;
    note.placeholder = 'Optional note';
    note.setAttribute('aria-label', `Activity note for ${item.caller_name || 'request'}`);
    const addButton = document.createElement('button');
    addButton.type = 'button';
    addButton.className = 'mini-button';
    addButton.textContent = 'Log';
    addButton.addEventListener('click', () => logActivity(item, type, activityType, note, addButton));
    activity.append(activityType, note, addButton);
    wrap.append(assignment, activity);

    const latest = followupActivities.find((entry) => type === 'lead' ? entry.lead_id === item.id : entry.callback_request_id === item.id);
    if (latest) {
      const latestLine = document.createElement('span');
      latestLine.className = 'latest-activity';
      const when = formatDateTime(latest.created_at);
      latestLine.textContent = `${latest.activity_type.replaceAll('_', ' ')} · ${when.date}${latest.notes ? ` · ${latest.notes}` : ''}`;
      wrap.append(latestLine);
    }
    appendOverdueMarker(wrap, item);
    return wrap;
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

  function matchesSearch(values, phones = []) {
    const term = searchInput.value.normalize('NFKC').trim().toLocaleLowerCase();
    if (!term) return true;
    const text = values.filter(Boolean).join(' ').normalize('NFKC').toLocaleLowerCase();
    if (text.includes(term)) return true;
    const digits = term.replace(/\D/g, '');
    return digits.length >= 3 && /^[+()\d\s.-]+$/.test(term)
      && phones.some((phone) => String(phone || '').replace(/\D/g, '').includes(digits));
  }

  function renderLeads() {
    const callById = new Map(calls.map((call) => [call.id, call]));
    const filtered = leads.filter((lead) => {
      if (!matchesCommonFilters(lead, 'lead')) return false;
      const call = callById.get(lead.call_id);
      return matchesSearch([lead.caller_name, lead.caller_phone, call?.source_caller_phone, call?.callback_phone, lead.caller_email, lead.event_type, lead.notes, lead.status, lead.assigned_to, lead.request_id],
        [lead.caller_phone, call?.source_caller_phone, call?.callback_phone]);
    });

    leadRows.replaceChildren();
    filtered.forEach((lead) => {
      const row = document.createElement('tr');
      const caller = document.createElement('td');
      const call = callById.get(lead.call_id);
      const callerId = call?.source_caller_phone || 'Unavailable';
      const callback = call?.callback_phone || lead.caller_phone;
      appendStacked(caller, lead.caller_name || 'Caller', '', 'caller-name', 'caller-contact');
      appendPhoneLink(caller, 'Caller ID', callerId === 'Unavailable' ? null : callerId);
      if (callback && callback !== callerId) {
        appendPhoneLink(caller, 'Callback', callback);
      }
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
      statusCell.append(select, createFollowupControls(lead, 'lead'));
      row.append(statusCell);
      leadRows.append(row);
    });

    document.querySelector('#lead-count-label').textContent = `${filtered.length} event ${filtered.length === 1 ? 'inquiry' : 'inquiries'}`;
    leadEmpty.hidden = filtered.length > 0;
    document.querySelector('#new-count').textContent = String(
      callbackRequests.filter((request) => request.status === 'New' && (showTestData.checked || !request.is_test)).length
    );
  }

  function renderCalls() {
    const visibleCalls = calls.filter((call) => showTestData.checked || !call.is_test);
    const matchingCalls = visibleCalls.filter((call) => {
      const related = [...leads.filter((lead) => lead.call_id === call.id),
        ...callbackRequests.filter((request) => request.source_call_id === call.source_call_id)];
      return matchesSearch([call.source_caller_phone, call.callback_phone, call.source_call_id, call.outcome,
        ...related.flatMap((item) => [item.caller_name, item.details, item.notes])],
        [call.source_caller_phone, call.callback_phone]);
    });
    const sortedCalls = matchingCalls.sort((a, b) => new Date(b.created_at) - new Date(a.created_at)).slice(0, 12);
    callRows.replaceChildren();
    sortedCalls.forEach((call) => {
      const row = document.createElement('tr');
      const callId = document.createElement('td');
      appendPhoneLink(callId, 'Caller ID', call.source_caller_phone);
      appendPhoneLink(callId, 'Callback', call.callback_phone);
      const sourceRef = document.createElement('span');
      sourceRef.className = 'call-ref';
      sourceRef.textContent = call.source_call_id;
      callId.append(sourceRef);
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
    document.querySelector('#month-count').textContent = String(visibleCalls.filter((call) => new Date(call.created_at) >= monthStart).length);
  }

  function renderCallbackRequests() {
    const filtered = callbackRequests.filter((request) => {
      if (!matchesCommonFilters(request, 'callback')) return false;
      return matchesSearch([request.caller_name, request.source_caller_phone, request.callback_phone,
        request.request_category, request.details, request.source_call_id, request.status, request.assigned_to, request.request_id],
        [request.source_caller_phone, request.callback_phone]);
    });
    callbackRows.replaceChildren();
    filtered.forEach((request) => {
      const row = document.createElement('tr');
      const caller = document.createElement('td');
      appendStacked(caller, request.caller_name, '', 'caller-name', 'caller-contact');
      appendPhoneLink(caller, 'Caller ID', request.source_caller_phone);
      appendPhoneLink(caller, 'Callback', request.callback_phone);
      row.append(caller);

      const categoryLabels = { general: 'Callback requested', large_party: 'Large party · manager priority', complaint: 'Major complaint · manager priority', staff_manager: 'Staff request · manager priority' };
      row.append(makeCell('', categoryLabels[request.request_category] || 'Callback requested'));
      row.append(makeCell('', request.details));
      const received = formatDateTime(request.created_at);
      const receivedCell = document.createElement('td');
      appendStacked(receivedCell, received.date, received.time, 'table-date', 'table-time');
      row.append(receivedCell);

      const notificationCell = document.createElement('td');
      const notification = notificationFor(request.id);
      const notificationStatus = document.createElement('span');
      notificationStatus.className = 'notification-status';
      notificationStatus.dataset.status = notification?.status || 'unknown';
      notificationStatus.textContent = notification?.status || 'Unavailable';
      notificationCell.append(notificationStatus);
      if (notification) {
        const detail = document.createElement('span');
        detail.className = 'notification-detail';
        const attempted = formatDateTime(notification.last_attempt_at);
        detail.textContent = `${notification.attempt_count || 0} ${notification.attempt_count === 1 ? 'attempt' : 'attempts'}${notification.last_attempt_at ? ` · ${attempted.date} ${attempted.time}` : ''}`;
        notificationCell.append(detail);
        if (notification.last_error_code) {
          const error = document.createElement('span');
          error.className = 'notification-error';
          error.textContent = notification.last_error_code.replaceAll('_', ' ');
          notificationCell.append(error);
        }
        if (notification.provider_message_id) {
          const providerId = document.createElement('span');
          providerId.className = 'notification-detail';
          providerId.textContent = `Provider ID: ${notification.provider_message_id}`;
          notificationCell.append(providerId);
        }
        if (notification.status === 'failed') {
          const retry = document.createElement('button');
          retry.type = 'button';
          retry.className = 'mini-button retry-button';
          retry.textContent = 'Retry email';
          retry.addEventListener('click', () => retryCallbackNotification(request, retry));
          notificationCell.append(retry);
        }
      }
      row.append(notificationCell);

      const statusCell = document.createElement('td');
      const select = document.createElement('select');
      select.className = 'followup-select';
      select.setAttribute('aria-label', `Follow-up status for ${request.caller_name}`);
      select.dataset.status = request.status;
      callbackStates.forEach((state) => {
        const option = document.createElement('option');
        option.value = state;
        option.textContent = state;
        option.selected = state === request.status;
        select.append(option);
      });
      select.addEventListener('change', () => updateCallbackStatus(request, select));
      statusCell.append(select, createFollowupControls(request, 'callback'));
      row.append(statusCell);
      callbackRows.append(row);
    });
    callbackEmpty.hidden = filtered.length > 0;
    document.querySelector('#lead-count-label').textContent = `${leadRows.children.length} event inquiries · ${filtered.length} callbacks`;
    document.querySelector('#new-count').textContent = String(
      callbackRequests.filter((request) => request.status === 'New' && (showTestData.checked || !request.is_test)).length
    );
  }

  function renderFollowupMetrics() {
    const firstByRecord = new Map();
    followupActivities.forEach((activity) => {
      const key = activity.lead_id ? `lead:${activity.lead_id}` : `callback:${activity.callback_request_id}`;
      if (!firstByRecord.has(key) || new Date(activity.created_at) < new Date(firstByRecord.get(key).created_at)) firstByRecord.set(key, activity);
    });
    const elapsed = [];
    leads.forEach((lead) => {
      const activity = firstByRecord.get(`lead:${lead.id}`);
      if (activity) elapsed.push(new Date(activity.created_at) - new Date(lead.created_at));
    });
    callbackRequests.forEach((request) => {
      const activity = firstByRecord.get(`callback:${request.id}`);
      if (activity) elapsed.push(new Date(activity.created_at) - new Date(request.created_at));
    });
    const validElapsed = elapsed.filter((value) => Number.isFinite(value) && value >= 0);
    const averageMs = validElapsed.length ? validElapsed.reduce((sum, value) => sum + value, 0) / validElapsed.length : null;
    document.querySelector('#first-followup-average').textContent = averageMs == null ? '—' : averageMs < 3600000
      ? `${Math.max(1, Math.round(averageMs / 60000))}m`
      : `${Math.round(averageMs / 360000) / 10}h`;

    const won = leads.filter((lead) => lead.status === 'Won').length;
    const lost = leads.filter((lead) => lead.status === 'Lost').length;
    const completed = callbackRequests.filter((request) => request.status === 'Completed').length;
    document.querySelector('#outcome-count').textContent = String(won + completed);
    document.querySelector('#outcome-detail').textContent = `${won} won · ${completed} callbacks · ${lost} lost`;
  }

  async function updateFollowupFields(item, type, assignee, due) {
    assignee.disabled = true;
    due.disabled = true;
    const updates = { assigned_to: assignee.value.trim() || null, followup_due_at: due.value || null };
    const table = type === 'lead' ? 'leads' : 'callback_requests';
    const { error } = await client.from(table).update(updates).eq('id', item.id).eq('location_id', activeLocation.id);
    assignee.disabled = false;
    due.disabled = false;
    if (error) {
      assignee.value = item.assigned_to || '';
      due.value = item.followup_due_at || '';
      message(deskMessage, 'Could not save the follow-up assignment. Refresh and try again.', true);
      return;
    }
    Object.assign(item, updates);
    message(deskMessage, 'Follow-up assignment saved.');
    renderLeads();
    renderCallbackRequests();
  }

  async function logActivity(item, type, activityType, note, button) {
    if (activityType.value === 'note' && !note.value.trim()) {
      message(deskMessage, 'Add a note before logging a note activity.', true);
      note.focus();
      return;
    }
    button.disabled = true;
    const user = (await client.auth.getUser()).data.user;
    const record = {
      organization_id: activeLocation.organization_id,
      location_id: activeLocation.id,
      lead_id: type === 'lead' ? item.id : null,
      callback_request_id: type === 'callback' ? item.id : null,
      activity_type: activityType.value,
      notes: note.value.trim() || null,
      created_by: user?.id || null
    };
    const { data, error } = await client.from('followup_activities').insert(record).select('id,lead_id,callback_request_id,activity_type,notes,created_by,created_at').single();
    button.disabled = false;
    if (error) {
      message(deskMessage, 'Could not log that activity. Refresh and try again.', true);
      return;
    }
    followupActivities.unshift(data);
    note.value = '';
    message(deskMessage, 'Follow-up activity logged.');
    renderLeads();
    renderCallbackRequests();
    renderFollowupMetrics();
  }

  async function retryCallbackNotification(request, button) {
    button.disabled = true;
    button.textContent = 'Retrying…';
    const { data, error } = await client.functions.invoke('retry-callback-notification', { body: { request_id: request.request_id } });
    if (error || !data || data.status !== 'sent') {
      button.disabled = false;
      button.textContent = 'Retry email';
      message(deskMessage, 'The email retry failed. The callback remains saved for follow-up.', true);
      return;
    }
    message(deskMessage, 'Callback email sent.');
    await loadDesk();
  }

  async function updateCallbackStatus(request, select) {
    const oldStatus = request.status;
    const nextStatus = select.value;
    select.disabled = true;
    const { error } = await client.from('callback_requests')
      .update({ status: nextStatus })
      .eq('id', request.id)
      .eq('location_id', activeLocation.id);
    select.disabled = false;
    if (error) {
      select.value = oldStatus;
      select.dataset.status = oldStatus;
      message(deskMessage, 'Could not update this callback. Refresh and try again.', true);
      return;
    }
    request.status = nextStatus;
    select.dataset.status = nextStatus;
    message(deskMessage, `Callback follow-up status saved as ${nextStatus}.`);
    renderCallbackRequests();
    renderFollowupMetrics();
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
    renderFollowupMetrics();
  }

  async function loadDesk(locationId = activeLocation?.id) {
    const loadVersion = ++deskLoadVersion;
    restaurantSelect.disabled = true;
    deskContent.hidden = true;
    message(deskMessage, 'Loading the restaurant desk…');
    const user = (await client.auth.getUser()).data.user;
    if (!user) throw new Error('Please sign in again.');
    const locationStorageKey = `hostess-location:${user.id}`;
    if (!locationId) {
      try { locationId = window.localStorage.getItem(locationStorageKey); } catch {}
    }
    const organizations = await fetchAllRows(() => client.from('organizations').select('id,name').order('id'));
    const locations = await fetchAllRows(() => client.from('locations')
      .select('id,organization_id,name,timezone,is_test').order('name').order('id'));
    if (loadVersion !== deskLoadVersion) return;
    if (!locations.length) throw new Error('No restaurant workspace is assigned to this account.');
    if (!locations.some((location) => location.id === locationId)) {
      const { data: recent } = await client.from('callback_requests').select('location_id')
        .eq('is_test', false).order('created_at', { ascending: false }).limit(1);
      locationId = recent?.[0]?.location_id;
    }
    if (loadVersion !== deskLoadVersion) return;
    const organizationNames = new Map(organizations.map((organization) => [organization.id, organization.name]));
    restaurantSelect.replaceChildren();
    locations.forEach((location) => {
      const option = document.createElement('option');
      option.value = location.id;
      option.textContent = `${organizationNames.get(location.organization_id) || 'Restaurant'} — ${location.name}`;
      restaurantSelect.append(option);
    });
    activeLocation = locations.find((location) => location.id === locationId) || locations[0];
    restaurantSelect.value = activeLocation.id;
    try { window.localStorage.setItem(locationStorageKey, activeLocation.id); } catch {}
    document.querySelector('#restaurant-picker').hidden = false;
    const selectedLocationId = activeLocation.id;
    document.querySelector('#location-name').textContent = activeLocation.name;
    document.querySelector('#test-workspace-notice').hidden = !activeLocation.is_test;
    document.querySelector('#account-email').textContent = (await client.auth.getUser()).data.user?.email || '';
    const loadedRows = await Promise.all([
      fetchAllRows(() => client.from('leads')
        .select('id,request_id,call_id,caller_phone,caller_name,caller_email,event_type,event_date,event_time,party_size,budget_amount,budget_currency,notes,status,assigned_to,followup_due_at,is_test,created_at')
        .eq('location_id', selectedLocationId)
        .order('created_at', { ascending: false })),
      fetchAllRows(() => client.from('calls')
        .select('id,source_call_id,source_caller_phone,callback_phone,started_at,duration_seconds,outcome,transfer_state,is_test,created_at')
        .eq('location_id', selectedLocationId)
        .order('created_at', { ascending: false })),
      fetchAllRows(() => client.from('callback_requests')
        .select('id,request_id,source_call_id,source_caller_phone,caller_name,callback_phone,details,request_category,manager_notification_required,status,assigned_to,followup_due_at,is_test,created_at')
        .eq('location_id', selectedLocationId)
        .order('created_at', { ascending: false })),
      fetchAllRows(() => client.from('callback_notifications')
        .select('id,callback_request_id,status,attempt_count,last_attempt_at,last_error_code,provider_message_id,created_at')
        .eq('location_id', selectedLocationId)
        .order('created_at', { ascending: false })),
      fetchAllRows(() => client.from('followup_activities')
      .select('id,lead_id,callback_request_id,activity_type,notes,created_by,created_at')
        .eq('location_id', selectedLocationId)
        .order('created_at', { ascending: false }))
    ]);
    if (loadVersion !== deskLoadVersion) return;
    [leads, calls, callbackRequests, callbackNotifications, followupActivities] = loadedRows;
    restaurantSelect.disabled = false;
    renderLeads();
    renderCallbackRequests();
    renderCalls();
    renderFollowupMetrics();
    message(deskMessage, `${leads.length} inquiries, ${callbackRequests.length} callback requests, and ${calls.length} calls loaded.`);
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
    const headers = ['request_id', 'created_at', 'caller_name', 'caller_id', 'callback_phone', 'caller_email', 'event_type', 'event_date', 'event_time', 'party_size', 'budget_amount', 'budget_currency', 'lead_status', 'assigned_to', 'followup_due_at', 'call_outcome', 'transfer_state', 'notes'];
    const lines = [headers.map(csvValue).join(',')];
    leads.filter((lead) => showTestData.checked || !lead.is_test).forEach((lead) => {
      const call = callById.get(lead.call_id) || {};
      const values = [lead.request_id, lead.created_at, lead.caller_name, call.source_caller_phone, call.callback_phone || lead.caller_phone, lead.caller_email, lead.event_type, lead.event_date, lead.event_time, lead.party_size, lead.budget_amount, lead.budget_currency, lead.status, lead.assigned_to, lead.followup_due_at, call.outcome, call.transfer_state, lead.notes];
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
    ++deskLoadVersion;
    activeLocation = null;
    leads = []; calls = []; callbackRequests = []; callbackNotifications = []; followupActivities = [];
    restaurantSelect.replaceChildren();
    document.querySelector('#restaurant-picker').hidden = true;
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

  function clearFilters() {
    searchInput.value = '';
    statusFilter.value = categoryFilter.value = priorityFilter.value = dateFilter.value = 'all';
    overdueFilter.checked = emailFailedFilter.checked = false;
  }
  document.querySelector('#clear-filters').addEventListener('click', () => {
    clearFilters();
    renderLeads(); renderCallbackRequests(); renderCalls();
    message(deskMessage, `Showing all non-filtered records for ${activeLocation?.name || 'this restaurant'}.`);
  });

  restaurantSelect.addEventListener('change', async () => {
    clearFilters();
    try {
      await loadDesk(restaurantSelect.value);
    } catch {
      deskContent.hidden = false;
      leads = []; calls = []; callbackRequests = []; callbackNotifications = []; followupActivities = [];
      renderLeads(); renderCallbackRequests(); renderCalls(); renderFollowupMetrics();
      restaurantSelect.disabled = false;
      message(deskMessage, 'Could not load this restaurant. Choose a restaurant or refresh to try again.', true);
    }
  });

  document.querySelector('#refresh-data').addEventListener('click', async () => {
    try {
      await loadDesk();
    } catch {
      message(deskMessage, 'Could not refresh the restaurant desk. Check your connection and try again.', true);
    }
  });
  searchInput.addEventListener('input', () => { renderLeads(); renderCallbackRequests(); renderCalls(); });
  statusFilter.addEventListener('change', () => { renderLeads(); renderCallbackRequests(); });
  [categoryFilter, priorityFilter, dateFilter, overdueFilter, emailFailedFilter].forEach((control) => {
    control.addEventListener('change', () => { renderLeads(); renderCallbackRequests(); });
  });
  showTestData.addEventListener('change', () => {
    renderLeads();
    renderCallbackRequests();
    renderCalls();
  });
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
    } catch (error) {
      const status = error?.status || error?.statusCode;
      if (status === 429 || /rate limit|too many requests/i.test(error?.message || '')) {
        message(resetMessage, 'A reset link was requested recently. Wait a few minutes, then try again. If you already received a link, use the newest email.', true);
      } else if (/smtp|email provider|sending email/i.test(error?.message || '')) {
        message(resetMessage, 'Password reset email delivery is unavailable right now. Contact your Hostess operator for a secure setup link.', true);
      } else {
        message(resetMessage, 'Could not send a reset link right now. Check your connection or contact your Hostess operator for a secure setup link.', true);
      }
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
      const currentUser = (await client.auth.getUser()).data.user;
      const { error } = await client.auth.updateUser({
        password,
        data: { ...(currentUser?.user_metadata || {}), must_set_password: false }
      });
      if (error) throw error;
      isRecoveryFlow = false;
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
      if (event === 'PASSWORD_RECOVERY') isRecoveryFlow = true;
      if (event === 'PASSWORD_RECOVERY' || (event === 'SIGNED_IN' && (isInviteFlow || isRecoveryFlow))) {
        showPasswordSetup(isInviteFlow
          ? 'You’re invited to the Hostess desk. Choose a password to continue.'
          : 'Choose a new password to continue.');
      }
    });
    client.auth.getSession().then(async ({ data, error }) => {
      if (error) {
        if (isRecoveryFlow) showRecoveryProblem('This reset link could not be opened. Enter your email below to request a fresh link.');
        else if (isInviteFlow) showInviteProblem('This invitation link could not be opened. Request a fresh invitation from your Hostess operator.');
        return;
      }
      if (data.session) {
        const user = (await client.auth.getUser()).data.user;
        const mustSetPassword = user?.user_metadata?.must_set_password === true;
        if (isInviteFlow || isRecoveryFlow || mustSetPassword) {
          showPasswordSetup(isInviteFlow
            ? 'You’re invited to the Hostess desk. Choose a password to continue.'
            : mustSetPassword
              ? 'Choose a password to finish setting up your Hostess desk.'
              : 'Choose a new password to continue.');
          return;
        }
        try {
          await loadDesk();
        } catch (loadError) {
          await client.auth.signOut();
          message(loginMessage, loadError.message || 'This account cannot open a restaurant workspace.', true);
        }
      } else if (isRecoveryFlow) {
        showRecoveryProblem('This password-reset link has expired or has already been used. Enter your email below to request a fresh link, then open the newest email.');
      } else if (isInviteFlow) {
        showInviteProblem(isInviteFlow
          ? 'Your invitation link is missing or expired. Request a fresh invitation from your Hostess operator.'
          : 'Your password-reset link is missing or expired. Request a new reset link below.');
      }
    });
  } else if (isInviteFlow || isRecoveryFlow) {
    showInviteProblem('The desk is not connected yet. Refresh the page or contact your Hostess operator.');
  }
})();
