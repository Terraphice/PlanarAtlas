const VERSION_ENDPOINT = './version.json';
const PRIVACY_ENDPOINT = './PRIVACY.md';

function formatBuildTimestamp(value) {
  if (!value) return 'Build: —';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return 'Build: —';
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, '0');
  const day = String(date.getUTCDate()).padStart(2, '0');
  const hours = String(date.getUTCHours()).padStart(2, '0');
  const minutes = String(date.getUTCMinutes()).padStart(2, '0');
  return `Build: ${year}-${month}-${day} ${hours}:${minutes} UTC`;
}

function normalizeVersion(value) {
  if (typeof value !== 'string' || !value.trim()) return 'V0.0.0';
  return value.trim().startsWith('V') ? value.trim() : `V${value.trim()}`;
}

function normalizeCommit(value) {
  if (typeof value !== 'string' || !value.trim()) return 'Commit: —';
  return `Commit: ${value.trim().slice(0, 8)}`;
}

function renderMarkdown(markdown) {
  if (typeof marked !== 'undefined' && typeof DOMPurify !== 'undefined') {
    return DOMPurify.sanitize(marked.parse(markdown));
  }
  return markdown
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/\n/g, '<br>');
}

export function initFooter() {
  const versionEl = document.getElementById('site-version');
  const buildEl = document.getElementById('site-build');
  const commitEl = document.getElementById('site-commit');
  const privacyTrigger = document.getElementById('privacy-policy-trigger');
  const privacyModal = document.getElementById('privacy-modal');
  const privacyBackdrop = document.getElementById('privacy-modal-backdrop');
  const privacyBody = document.getElementById('privacy-modal-body');
  const privacyClose = document.getElementById('privacy-modal-close');
  const settingsContactLink = document.getElementById('settings-contact-developer');
  const footerContactLink = document.getElementById('footer-contact-link');

  if (footerContactLink && settingsContactLink?.getAttribute('href')) {
    footerContactLink.setAttribute('href', settingsContactLink.getAttribute('href'));
  }

  fetch(VERSION_ENDPOINT, { cache: 'no-store' })
    .then((response) => response.ok ? response.json() : Promise.reject())
    .then((data) => {
      if (versionEl) versionEl.textContent = normalizeVersion(data.version);
      if (buildEl) buildEl.textContent = formatBuildTimestamp(data.buildTimestamp || data.builtAt || data.commitTimestamp);
      if (commitEl) commitEl.textContent = normalizeCommit(data.commit || data.sha);
    })
    .catch(() => {
      if (versionEl) versionEl.textContent = 'V0.0.0';
      if (buildEl) buildEl.textContent = 'Build: —';
      if (commitEl) commitEl.textContent = 'Commit: —';
    });

  fetch(PRIVACY_ENDPOINT, { cache: 'no-store' })
    .then((response) => response.ok ? response.text() : Promise.reject())
    .then((markdown) => {
      if (privacyBody) privacyBody.innerHTML = renderMarkdown(markdown);
    })
    .catch(() => {
      if (privacyBody) privacyBody.textContent = 'PLACEHOLDER';
    });

  if (!privacyModal || !privacyTrigger || !privacyClose || !privacyBackdrop) return;

  function openPrivacyModal() {
    privacyModal.classList.remove('hidden');
    privacyModal.setAttribute('aria-hidden', 'false');
    document.body.classList.add('privacy-modal-open');
    privacyClose.focus();
  }

  function closePrivacyModal() {
    privacyModal.classList.add('hidden');
    privacyModal.setAttribute('aria-hidden', 'true');
    document.body.classList.remove('privacy-modal-open');
  }

  privacyTrigger.addEventListener('click', openPrivacyModal);
  privacyClose.addEventListener('click', closePrivacyModal);
  privacyBackdrop.addEventListener('click', closePrivacyModal);
  privacyModal.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') closePrivacyModal();
  });
}
