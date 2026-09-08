const buttons = [...document.querySelectorAll('[data-background-id]')];
const label = document.querySelector('#selection-label');
const useButton = document.querySelector('#use-background');
const status = document.querySelector('#preview-status');
let selected = 'original';
let poll = 0;

function reflect(id) {
  const index = buttons.findIndex(button => button.dataset.backgroundId === id);
  if (index < 0) return;
  selected = id;
  buttons.forEach(button => {
    const active = button.dataset.backgroundId === id;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-selected', active);
  });
  const number = document.createElement('span');
  number.className = 'selection-number';
  number.textContent = String(index + 1).padStart(2, '0');
  label.replaceChildren(number, document.createTextNode(buttons[index].querySelector('.option-label > span:last-child').textContent));
}

function checkReady() {
  clearTimeout(poll);
  const ready = !!window.__backgroundPreview?.ready;
  useButton.disabled = !ready;
  status.setAttribute('aria-busy', String(!ready));
  if (!ready) poll = setTimeout(checkReady, 100);
}

async function choose(id) {
  reflect(id);
  const apply = window.__backgroundPreview?.apply;
  if (apply) {
    const operation = apply(id);
    checkReady();
    await operation;
    checkReady();
  }
}

buttons.forEach((button, index) => {
  button.addEventListener('click', () => choose(button.dataset.backgroundId));
  button.addEventListener('keydown', event => {
    let next;
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next = (index + 1) % buttons.length;
    else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next = (index + buttons.length - 1) % buttons.length;
    else if (event.key === 'Home') next = 0;
    else if (event.key === 'End') next = buttons.length - 1;
    else return;
    event.preventDefault();
    buttons[next].focus();
    choose(buttons[next].dataset.backgroundId);
  });
});
window.addEventListener('backgroundloading', checkReady);
window.addEventListener('backgroundchange', event => {
  reflect(event.detail.id);
  checkReady();
});
window.addEventListener('backgrounderror', () => {
  reflect('original');
  status.textContent = 'Original sky';
  checkReady();
});
useButton.addEventListener('click', async () => {
  await window.__backgroundPreview.apply(selected, { persist: true });
  location.href = '/';
});
window.addEventListener('pagehide', () => clearTimeout(poll));
const requested = new URLSearchParams(location.search).get('background');
choose(buttons.some(button => button.dataset.backgroundId === requested) ? requested : 'fuji');

// Keep the moving thumbnails light by playing them only while visible.
const motion = matchMedia('(prefers-reduced-motion: reduce)');
const videos = [...document.querySelectorAll('.thumbnail video')];
const visible = new Set();
function playVisible() {
  videos.forEach(video => {
    if (visible.has(video) && !motion.matches && !document.hidden) {
      video.muted = true;
      video.play().catch(() => {});
    } else video.pause();
  });
}
const observer = new IntersectionObserver(entries => {
  entries.forEach(entry => {
    if (entry.isIntersecting) visible.add(entry.target);
    else visible.delete(entry.target);
  });
  playVisible();
}, { threshold: 0.05 });
videos.forEach(video => {
  video.addEventListener('loadeddata', () => video.classList.add('is-ready'));
  observer.observe(video);
});
motion.addEventListener('change', playVisible);
document.addEventListener('visibilitychange', playVisible);
window.addEventListener('pagehide', event => {
  videos.forEach(video => video.pause());
  if (!event.persisted) observer.disconnect();
});
window.addEventListener('pageshow', playVisible);

// Credit the source photographs alongside their previews.
let photography = [];
function showCredit() {
  const element = document.querySelector('#photo-credit');
  const photo = photography.find(item => item.id === selected);
  element.replaceChildren();
  if (!photo) return;
  const link = document.createElement('a');
  link.href = photo.source;
  link.target = '_blank';
  link.rel = 'noopener noreferrer';
  link.textContent = photo.credit;
  element.append(document.createTextNode('Photograph by '), link);
}
fetch('/landscapes/manifest.json?v=landscape-4').then(response => {
  if (!response.ok) throw new Error('Photography credits unavailable');
  return response.json();
}).then(data => { photography = Array.isArray(data) ? data : data.scenes || data.images || []; showCredit(); }).catch(() => {});
window.addEventListener('backgroundchange', showCredit);
