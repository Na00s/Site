// Each page has a fixed background: Mount Fuji for the homepage and its own scene for each article.
const ids = ['fuji', 'forest', 'coast', 'hills', 'tides', 'original'];
const host = document.querySelector('#sky-scene');
const cover = host?.closest('.cover');
let current = 'original';
let request = 0;
let loading = false;
let sceneModule;

function selection() {
  const article = document.body.dataset.articleBackground;
  return ids.includes(article) ? article : 'fuji';
}

async function apply(id) {
  if (!ids.includes(id)) id = 'original';
  const revision = ++request;
  if (!host || !window.__skyPreview) return 'original';
  loading = true;
  window.dispatchEvent(new CustomEvent('backgroundloading', { detail: { id } }));
  try {
    let factory;
    if (id !== 'original') {
      sceneModule ||= import('./landscapes/scene.js?v=original-feel-4');
      factory = (await sceneModule).createLandscapeHero;
    }
    if (revision !== request) return current;
    if (id !== current) {
      window.__skyPreview.replaceScene(factory, { variant: id, look: 'day' });
    }
    current = id;
    cover.dataset.background = id;
    window.dispatchEvent(new CustomEvent('backgroundchange', { detail: { id } }));
    return id;
  } catch (error) {
    if (revision === request) {
      current = 'original';
      cover.dataset.background = current;
      window.__skyPreview.replaceScene();
      window.dispatchEvent(new CustomEvent('backgrounderror', { detail: { id } }));
      console.error('Could not load landscape:', error);
    }
    return current;
  } finally {
    if (revision === request) loading = false;
  }
}

window.__backgroundPreview = {
  apply,
  get current() { return current; },
  get ready() { return !loading && !!window.__skyPreview?.ready; },
};

function initialize() {
  if (host && window.__skyPreview) apply(selection());
}
if (window.__skyPreview) initialize();
else window.addEventListener('load', initialize, { once: true });
