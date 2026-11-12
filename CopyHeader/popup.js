/**
 * CopyHeader Extension - popup.js
 * Manages variables (name/value pairs) with copy-to-clipboard and copy history.
 * Data is persisted via chrome.storage.local.
 */

const MAX_HISTORY = 50;

// ── State ────────────────────────────────────────────────────────────────────
let variables    = []; // [{ id, name, value }]
let history      = []; // [{ id, name, value, timestamp }]
let savedQueries = []; // [{ id, label, selector, prop, attrName }]

// ── DOM refs ─────────────────────────────────────────────────────────────────
const varNameInput    = document.getElementById('var-name');
const varValueInput   = document.getElementById('var-value');
const btnAdd          = document.getElementById('btn-add');
const searchInput     = document.getElementById('search-input');
const variableList    = document.getElementById('variable-list');
const emptyVars       = document.getElementById('empty-vars');
const historyList     = document.getElementById('history-list');
const emptyHistory    = document.getElementById('empty-history');
const btnClearHistory = document.getElementById('btn-clear-history');
const tabBtns         = document.querySelectorAll('.tab-btn');
const tabContents     = document.querySelectorAll('.tab-content');

// ── Storage helpers ───────────────────────────────────────────────────────────
function loadData() {
  return new Promise((resolve) => {
    chrome.storage.local.get(['variables', 'history', 'savedQueries'], (result) => {
      variables    = result.variables    || [];
      history      = result.history      || [];
      savedQueries = result.savedQueries || [];
      resolve();
    });
  });
}

function saveVariables() {
  chrome.storage.local.set({ variables });
}

function saveHistory() {
  chrome.storage.local.set({ history });
}

function saveSavedQueries() {
  chrome.storage.local.set({ savedQueries });
}

// ── Unique ID ─────────────────────────────────────────────────────────────────
function uid() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// ── Sanitise text for safe insertion as textContent ───────────────────────────
function sanitise(str) {
  return String(str).slice(0, 2000);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
tabBtns.forEach((btn) => {
  btn.addEventListener('click', () => {
    tabBtns.forEach((b) => b.classList.remove('active'));
    tabContents.forEach((c) => c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'history') renderHistory();
  });
});

// ── Render Variables ──────────────────────────────────────────────────────────
function renderVariables() {
  const query = searchInput.value.trim().toLowerCase();
  const filtered = query
    ? variables.filter(
        (v) =>
          v.name.toLowerCase().includes(query) ||
          v.value.toLowerCase().includes(query)
      )
    : variables;

  variableList.innerHTML = '';
  emptyVars.style.display = filtered.length === 0 ? 'block' : 'none';

  filtered.forEach((variable) => {
    const li = buildVarItem(variable);
    variableList.appendChild(li);
  });
}

function buildVarItem(variable) {
  const li = document.createElement('li');
  li.className = 'var-item';
  li.dataset.id = variable.id;

  // Header: name + action buttons
  const header = document.createElement('div');
  header.className = 'var-item-header';

  const nameEl = document.createElement('span');
  nameEl.className = 'var-name';
  nameEl.textContent = sanitise(variable.name);
  nameEl.title = variable.name;

  const actions = document.createElement('div');
  actions.className = 'var-actions';

  const btnCopy = makeButton('Copy', 'btn-icon btn-copy', () => copyValue(variable, btnCopy));
  const btnEdit = makeButton('Edit', 'btn-icon btn-edit', () => enterEditMode(li, variable));
  const btnDel  = makeButton('✕', 'btn-icon btn-delete', () => deleteVariable(variable.id));

  actions.append(btnCopy, btnEdit, btnDel);
  header.append(nameEl, actions);

  // Value row (read-only display)
  const valueRow = document.createElement('div');
  valueRow.className = 'var-value-row';

  const valueEl = document.createElement('span');
  valueEl.className = 'var-value';
  valueEl.textContent = sanitise(variable.value);
  valueEl.title = variable.value;
  valueRow.appendChild(valueEl);

  // Edit row (hidden by default)
  const editRow = document.createElement('div');
  editRow.className = 'var-edit-row';

  const editInput = document.createElement('input');
  editInput.type = 'text';
  editInput.value = variable.value;
  editInput.maxLength = 1000;
  editInput.placeholder = 'New value';

  const btnSave   = makeButton('Save', 'btn-icon btn-save', () => saveEdit(li, variable, editInput));
  const btnCancel = makeButton('Cancel', 'btn-icon btn-cancel', () => exitEditMode(li));

  editRow.append(editInput, btnSave, btnCancel);
  editInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') saveEdit(li, variable, editInput);
    if (e.key === 'Escape') exitEditMode(li);
  });

  li.append(header, valueRow, editRow);
  return li;
}

function makeButton(text, className, onClick) {
  const btn = document.createElement('button');
  btn.className = className;
  btn.textContent = text;
  btn.addEventListener('click', onClick);
  return btn;
}

// ── Copy to clipboard ─────────────────────────────────────────────────────────
async function copyValue(variable, btnEl) {
  try {
    await navigator.clipboard.writeText(variable.value);
    pushHistory(variable);
    btnEl.textContent = '✓ Copied';
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.textContent = 'Copy';
      btnEl.classList.remove('copied');
    }, 1500);
  } catch {
    // Fallback for browsers where clipboard API is restricted in popup
    const ta = document.createElement('textarea');
    ta.value = variable.value;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
    pushHistory(variable);
    btnEl.textContent = '✓ Copied';
    btnEl.classList.add('copied');
    setTimeout(() => {
      btnEl.textContent = 'Copy';
      btnEl.classList.remove('copied');
    }, 1500);
  }
}

// ── Edit mode ─────────────────────────────────────────────────────────────────
function enterEditMode(li, variable) {
  li.classList.add('editing');
  const editInput = li.querySelector('.var-edit-row input');
  editInput.value = variable.value;
  editInput.focus();
  editInput.select();
}

function exitEditMode(li) {
  li.classList.remove('editing');
}

function saveEdit(li, variable, editInput) {
  const newValue = editInput.value.trim();
  if (newValue === '') {
    editInput.focus();
    return;
  }
  variable.value = newValue;
  saveVariables();
  exitEditMode(li);
  renderVariables();
}

// ── Add variable ──────────────────────────────────────────────────────────────
function addVariable() {
  const name  = varNameInput.value.trim();
  const value = varValueInput.value.trim();

  if (!name || !value) {
    const target = !name ? varNameInput : varValueInput;
    target.focus();
    target.style.borderColor = '#ef4444';
    setTimeout(() => (target.style.borderColor = ''), 1000);
    return;
  }

  variables.push({ id: uid(), name: sanitise(name), value: sanitise(value) });
  saveVariables();
  varNameInput.value  = '';
  varValueInput.value = '';
  varNameInput.focus();
  renderVariables();
}

// ── Delete variable ───────────────────────────────────────────────────────────
function deleteVariable(id) {
  variables = variables.filter((v) => v.id !== id);
  saveVariables();
  renderVariables();
}

// ── Render History ────────────────────────────────────────────────────────────
function renderHistory() {
  historyList.innerHTML = '';
  emptyHistory.style.display = history.length === 0 ? 'block' : 'none';

  [...history].reverse().forEach((entry) => {
    const li = document.createElement('li');
    li.className = 'history-item';

    const info = document.createElement('div');
    info.className = 'history-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'history-name';
    nameEl.textContent = sanitise(entry.name);

    const valEl = document.createElement('div');
    valEl.className = 'history-value';
    valEl.textContent = sanitise(entry.value);
    valEl.title = entry.value;

    info.append(nameEl, valEl);

    const timeEl = document.createElement('div');
    timeEl.className = 'history-time';
    timeEl.textContent = formatTime(entry.timestamp);
    timeEl.title = new Date(entry.timestamp).toLocaleString();

    li.append(info, timeEl);
    historyList.appendChild(li);
  });
}

function pushHistory(variable) {
  history.push({
    id: uid(),
    name: variable.name,
    value: variable.value,
    timestamp: Date.now(),
  });
  if (history.length > MAX_HISTORY) {
    history = history.slice(history.length - MAX_HISTORY);
  }
  saveHistory();
}

function formatTime(ts) {
  const now  = Date.now();
  const diff = now - ts;
  if (diff < 60_000)  return 'just now';
  if (diff < 3_600_000) return Math.floor(diff / 60_000) + 'm ago';
  if (diff < 86_400_000) return Math.floor(diff / 3_600_000) + 'h ago';
  return new Date(ts).toLocaleDateString();
}

// ── Clear history ─────────────────────────────────────────────────────────────
btnClearHistory.addEventListener('click', () => {
  if (history.length === 0) return;
  history = [];
  saveHistory();
  renderHistory();
});

// ── Query Tab ─────────────────────────────────────────────────────────────────
const querySelector       = document.getElementById('query-selector');
const queryProp           = document.getElementById('query-prop');
const queryAttrInput      = document.getElementById('query-attr');
const queryLabelInput     = document.getElementById('query-label');
const btnRunQuery         = document.getElementById('btn-run-query');
const btnSaveQuery        = document.getElementById('btn-save-query');
const queryResultBox      = document.getElementById('query-result-box');
const queryResultLabel    = document.getElementById('query-result-label');
const queryResultValue    = document.getElementById('query-result-value');
const btnCopyResult       = document.getElementById('btn-copy-result');
const queryError          = document.getElementById('query-error');
const savedQueriesHeader  = document.getElementById('saved-queries-header');
const savedQueriesList    = document.getElementById('saved-queries-list');

queryProp.addEventListener('change', () => {
  queryAttrInput.style.display = queryProp.value === 'attr' ? 'block' : 'none';
});

btnRunQuery.addEventListener('click', runQuery);
btnSaveQuery.addEventListener('click', saveCurrentQuery);

querySelector.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') runQuery();
});

async function runQuery() {
  const selector = querySelector.value.trim();
  if (!selector) {
    querySelector.focus();
    querySelector.style.borderColor = '#ef4444';
    setTimeout(() => (querySelector.style.borderColor = ''), 1000);
    return;
  }

  const prop = queryProp.value;
  const attrName = queryAttrInput.value.trim();
  if (prop === 'attr' && !attrName) {
    queryAttrInput.style.display = 'block';
    queryAttrInput.focus();
    queryAttrInput.style.borderColor = '#ef4444';
    setTimeout(() => (queryAttrInput.style.borderColor = ''), 1000);
    return;
  }

  queryResultBox.style.display = 'none';
  queryError.style.display = 'none';

  let tabs;
  try {
    tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  } catch {
    showQueryError('Could not access the current tab.');
    return;
  }

  const tab = tabs[0];
  if (!tab || !tab.id) {
    showQueryError('No active tab found.');
    return;
  }

  try {
    const results = await chrome.scripting.executeScript({
      target: { tabId: tab.id },
      func: domQuery,
      args: [selector, prop, attrName],
    });

    const result = results[0]?.result;
    if (result && result.error) {
      showQueryError(result.error);
    } else {
      const value = result?.value ?? '';
      queryResultLabel.textContent = selector + '  →  ' + (prop === 'attr' ? attrName : prop);
      queryResultValue.textContent = value;
      queryResultBox.style.display = 'block';
      btnCopyResult.textContent = 'Copy';
      btnCopyResult.classList.remove('copied');
    }
  } catch (err) {
    showQueryError('Cannot run script on this page. Try a regular http/https page.');
  }
}

// This function runs inside the page — keep it self-contained, no closures.
function domQuery(selector, prop, attrName) {
  try {
    const el = document.querySelector(selector);
    if (!el) return { error: 'No element matched: ' + selector };
    if (prop === 'attr') {
      return { value: el.getAttribute(attrName) ?? '' };
    }
    const val = el[prop];
    return { value: val == null ? '' : String(val) };
  } catch (e) {
    return { error: String(e) };
  }
}

function showQueryError(msg) {
  queryError.textContent = msg;
  queryError.style.display = 'block';
  queryResultBox.style.display = 'none';
}

// ── Saved Queries ─────────────────────────────────────────────────────────────
function saveCurrentQuery() {
  const selector = querySelector.value.trim();
  if (!selector) {
    querySelector.focus();
    querySelector.style.borderColor = '#ef4444';
    setTimeout(() => (querySelector.style.borderColor = ''), 1000);
    return;
  }
  const prop     = queryProp.value;
  const attrName = queryAttrInput.value.trim();
  const rawLabel = queryLabelInput.value.trim();
  const label    = rawLabel || selector;

  savedQueries.push({ id: uid(), label: sanitise(label), selector: sanitise(selector), prop, attrName: sanitise(attrName) });
  saveSavedQueries();
  queryLabelInput.value = '';
  renderSavedQueries();
}

function renderSavedQueries() {
  savedQueriesList.innerHTML = '';
  savedQueriesHeader.style.display = savedQueries.length === 0 ? 'none' : 'flex';

  savedQueries.forEach((q) => {
    const li = document.createElement('li');
    li.className = 'saved-query-item';

    const info = document.createElement('div');
    info.className = 'saved-query-info';

    const nameEl = document.createElement('div');
    nameEl.className = 'saved-query-name';
    nameEl.textContent = q.label;
    nameEl.title = q.label;

    const selEl = document.createElement('div');
    selEl.className = 'saved-query-selector';
    selEl.textContent = q.selector;
    selEl.title = q.selector;

    info.append(nameEl, selEl);

    const badge = document.createElement('span');
    badge.className = 'saved-query-prop-badge';
    badge.textContent = q.prop === 'attr' ? q.attrName || 'attr' : q.prop;

    const delBtn = document.createElement('button');
    delBtn.className = 'saved-query-del';
    delBtn.textContent = '✕';
    delBtn.title = 'Remove';
    delBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      savedQueries = savedQueries.filter((x) => x.id !== q.id);
      saveSavedQueries();
      renderSavedQueries();
    });

    li.append(info, badge, delBtn);

    // Click row to load into form and run
    li.addEventListener('click', () => {
      querySelector.value = q.selector;
      queryProp.value = q.prop;
      queryAttrInput.style.display = q.prop === 'attr' ? 'block' : 'none';
      queryAttrInput.value = q.attrName || '';
      queryLabelInput.value = '';
      runQuery();
    });

    savedQueriesList.appendChild(li);
  });
}

btnCopyResult.addEventListener('click', async () => {
  const text = queryResultValue.textContent;
  if (!text) return;
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const ta = document.createElement('textarea');
    ta.value = text;
    ta.style.position = 'fixed';
    ta.style.opacity = '0';
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  }
  // Also push to history with selector as "name"
  pushHistory({ name: querySelector.value.trim(), value: text });
  btnCopyResult.textContent = '✓ Copied';
  btnCopyResult.classList.add('copied');
  setTimeout(() => {
    btnCopyResult.textContent = 'Copy';
    btnCopyResult.classList.remove('copied');
  }, 1500);
});

// ── Event listeners ───────────────────────────────────────────────────────────
btnAdd.addEventListener('click', addVariable);

varValueInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') addVariable();
});

varNameInput.addEventListener('keydown', (e) => {
  if (e.key === 'Enter') varValueInput.focus();
});

searchInput.addEventListener('input', renderVariables);

// ── Init ──────────────────────────────────────────────────────────────────────
loadData().then(() => {
  renderVariables();
  renderSavedQueries();
});
