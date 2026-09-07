import { SOURCE_ORIGIN, projects, readProject, createBackup } from './backup.js';
import { locales } from './i18n.js';
import { readPreferences } from './preferences.js';

const selector = document.querySelector('#language');
const themeToggle = document.querySelector('#theme-toggle');
const feedback = {};
const isLocal = ['localhost', '127.0.0.1', '[::1]'].includes(location.hostname);
const correctOrigin = location.origin === SOURCE_ORIGIN;
let storage;
try { storage = window.localStorage; } catch { /* Render a blocked state below. */ }
let { language, dark } = readPreferences(storage, matchMedia('(prefers-color-scheme: dark)').matches);

function render() {
  const text = locales[language];
  document.documentElement.classList.toggle('dark', dark);
  themeToggle.setAttribute('aria-checked', String(dark));
  themeToggle.setAttribute('aria-label', text.darkMode);
  themeToggle.title = text.darkMode;
  selector.value = language;
  document.documentElement.lang = text.htmlLang;
  document.title = text.title;
  document.querySelector('meta[name="description"]').content = text.intro;
  for (const id of ['title', 'intro', 'instructions', 'privacy']) document.getElementById(id).textContent = text[id];
  document.getElementById('language-label').textContent = text.language;
  const environment = document.getElementById('environment');
  environment.hidden = correctOrigin;
  environment.replaceChildren();
  if (!correctOrigin) {
    environment.append(document.createTextNode(isLocal ? text.local : text.wrongOrigin + ' '));
    if (!isLocal) {
      const link = document.createElement('a');
      link.href = `${SOURCE_ORIGIN}/gleaner/`;
      link.textContent = text.openOriginal;
      environment.append(link);
    }
  }
  for (const project of Object.keys(projects)) renderProject(project);
}

function renderProject(project) {
  const text = locales[language];
  const card = document.querySelector(`[data-project="${project}"]`);
  const snapshot = readProject(storage, project);
  card.querySelector('h2').textContent = text[project];
  const stats = card.querySelector('.stats');
  stats.replaceChildren();
  for (const group of new Set(projects[project].map(entry => entry.group))) {
    const row = document.createElement('div');
    const label = document.createElement('dt');
    const count = document.createElement('dd');
    label.textContent = text[group];
    count.textContent = snapshot.status === 'blocked' || snapshot.counts[group] === null ? '—' : new Intl.NumberFormat(text.htmlLang).format(snapshot.counts[group]);
    row.append(label, count);
    stats.append(row);
  }
  const messages = [];
  if (snapshot.status !== 'ready') messages.push(text[snapshot.status]);
  if (snapshot.invalidKeys.length) messages.push(text.damaged);
  if (feedback[project]) messages.push(text[feedback[project]]);
  card.querySelector('.state').textContent = messages.join(' ');
  const button = card.querySelector('button');
  button.textContent = text.download;
  button.setAttribute('aria-label', `${text[project]} — ${text.download}`);
  button.disabled = snapshot.status !== 'ready' || (!correctOrigin && !isLocal);
}

function download(project) {
  // Re-read on click so edits from an open sibling tab are included.
  const snapshot = readProject(storage, project);
  if (snapshot.status !== 'ready' || (!correctOrigin && !isLocal)) { renderProject(project); return; }
  let url;
  let anchor;
  try {
    const backup = createBackup(project, snapshot, location.origin);
    url = URL.createObjectURL(new Blob([JSON.stringify(backup, null, 2) + '\n'], { type: 'application/json;charset=utf-8' }));
    anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = `frozen-rabbit-${project}-backup-${backup.exportedAt.replace(/[:.]/g, '-')}.json`;
    document.body.append(anchor);
    anchor.click();
    feedback[project] = 'downloaded';
  } catch { feedback[project] = 'failed'; }
  finally {
    anchor?.remove();
    if (url) setTimeout(() => URL.revokeObjectURL(url), 30_000);
  }
  renderProject(project);
}

selector.addEventListener('change', () => {
  language = selector.value;
  render();
});
themeToggle.addEventListener('click', () => { dark = !dark; render(); });
for (const project of Object.keys(projects)) {
  document.querySelector(`[data-project="${project}"] button`).addEventListener('click', () => download(project));
}
window.addEventListener('storage', () => { for (const project of Object.keys(feedback)) delete feedback[project]; render(); });
window.addEventListener('pageshow', render);
window.addEventListener('focus', render);
render();
