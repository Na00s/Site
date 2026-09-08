import { createFableHero } from './sky/original-scene.js';

// Integrates the reference page's original renderer without its React application.
const host = document.querySelector('#sky-scene');
const cover = host?.closest('.cover');
const assetRoot = new URL('./sky/', import.meta.url).href;
const modeButtons = [...document.querySelectorAll('[data-sky-mode]')]
  .filter(element => element instanceof HTMLButtonElement);
const originalModes = { day: 'day', night: 'night', dawn: 'morning', morning: 'morning' };
const publicModes = { day: 'day', night: 'night', morning: 'dawn' };
let scene = null;
let observer = null;
let frameObserver = null;
let disposed = false;

const style = document.createElement('style');
style.textContent = `
  #sky-scene {
    --fx-sky: #749bd0;
    position: absolute;
    inset: 0;
    isolation: isolate;
    overflow: hidden;
    background: linear-gradient(180deg, #86a7d3 0%, var(--fx-sky) 55%, #5b7fae 100%);
  }
  #sky-scene.original-sky-night { --fx-sky: #27314b; }
  #sky-scene.original-sky-dawn { --fx-sky: #aaa9bc; }
  #sky-scene.original-sky-dusk { --fx-sky: #7a86a8; }
  #sky-scene .original-sky-canvas {
    position: absolute;
    inset: 0;
    display: block;
    width: 100%;
    height: 100%;
    opacity: 0;
    background: var(--fx-sky);
    pointer-events: auto;
    transition: opacity .6s cubic-bezier(.22,.61,.36,1);
  }
  #sky-scene .original-sky-canvas.original-sky-drawn { opacity: 1; }
  #sky-scene.original-sky-context-lost .original-sky-canvas { opacity: 0; }
  #sky-scene .original-sky-over-bird { cursor: pointer; }
  @media (prefers-reduced-motion: reduce) {
    #sky-scene .original-sky-canvas { transition: none; }
  }
`;
document.head.append(style);

function reflectMode(originalMode) {
  const mode = publicModes[originalMode] || 'day';
  if (cover) cover.dataset.skyMode = mode;
  host?.classList.toggle('original-sky-night', originalMode === 'night');
  host?.classList.toggle('original-sky-dawn', originalMode === 'morning');
  modeButtons.forEach(button => {
    const active = (originalModes[button.dataset.skyMode] || 'day') === originalMode;
    button.setAttribute('aria-pressed', String(active));
    button.classList.toggle('is-active', active);
  });
}

function setMode(mode) {
  const originalMode = originalModes[mode] || 'day';
  reflectMode(originalMode);
  scene?.setLook(originalMode);
}

function shelterRect(selector, horizontalPadding, verticalPadding) {
  const element = cover?.querySelector(selector);
  if (!element || !host) return [0, 0, 0, 0];
  const container = host.getBoundingClientRect();
  const rect = element.getBoundingClientRect();
  if (!container.width || !container.height) return [0, 0, 0, 0];
  return [
    (rect.left - container.left - horizontalPadding) / container.width,
    (rect.top - container.top - verticalPadding) / container.height,
    (rect.right - container.left + horizontalPadding) / container.width,
    (rect.bottom - container.top + verticalPadding) / container.height,
  ];
}

function shelters() {
  return [
    shelterRect('[data-sky-shelter="title"], .cover h1', 32, 18),
    shelterRect('[data-sky-shelter="index"], .cover-index', 40, 22),
    shelterRect('[data-sky-shelter="date"], .cover-date', 56, 30),
  ];
}

function updateShelters() {
  if (!disposed) scene?.setShelters(...shelters());
}

function dispose() {
  disposed = true;
  observer?.disconnect();
  frameObserver?.disconnect();
  try { scene?.dispose(); } catch (error) { console.debug('Sky cleanup:', error); }
  scene = null;
}

function replaceScene(factory = createFableHero, extraOptions = {}) {
  if (!host) return;
  observer?.disconnect();
  frameObserver?.disconnect();
  try { scene?.dispose(); } catch (error) { console.debug('Sky cleanup:', error); }
  host.querySelectorAll('.original-sky-canvas').forEach(canvas => canvas.remove());
  host.removeAttribute('data-ready');
  host.removeAttribute('data-fallback');
  host.classList.remove('original-sky-context-lost', 'original-sky-unsupported');
  scene = null;
  disposed = false;
  const initialMode = originalModes[extraOptions.look || cover?.dataset.skyMode] || 'day';
  reflectMode(initialMode);
  try {
    scene = factory(host, {
      assets: assetRoot,
      looks: false,
      look: initialMode,
      classes: {
        host: 'original-sky',
        canvas: 'original-sky-canvas',
        drawn: 'original-sky-drawn',
        overBird: 'original-sky-over-bird',
        looks: 'original-sky-looks',
        look: 'original-sky-look',
        on: 'is-active',
        night: 'original-sky-night',
        dusk: 'original-sky-dusk',
        morning: 'original-sky-dawn',
        unsupported: 'original-sky-unsupported',
      },
      shelters: shelters(),
      onLook: reflectMode,
      onUnsupported: () => { host.dataset.skyStatus = 'fallback'; host.setAttribute('data-fallback', ''); },
      ...extraOptions,
      look: initialMode,
    });
    host.dataset.skyStatus = scene ? 'rendering' : 'fallback';
    if (!scene) host.setAttribute('data-fallback', '');
    const canvas = host.querySelector('.original-sky-canvas');
    if (canvas) {
      const markReady = () => {
        if (canvas.classList.contains('original-sky-drawn')) {
          host.setAttribute('data-ready', '');
          host.removeAttribute('data-fallback');
          host.dataset.skyStatus = 'ready';
          frameObserver.disconnect();
        }
      };
      frameObserver = new MutationObserver(markReady);
      frameObserver.observe(canvas, { attributes: true, attributeFilter: ['class'] });
      markReady();
    }
    canvas?.addEventListener('webglcontextlost', event => {
      event.preventDefault();
      host.classList.add('original-sky-context-lost');
      host.dataset.skyStatus = 'fallback';
      host.removeAttribute('data-ready');
      host.setAttribute('data-fallback', '');
    });
    canvas?.addEventListener('webglcontextrestored', () => {
      host.classList.remove('original-sky-context-lost');
      host.dataset.skyStatus = 'rendering';
      host.setAttribute('data-ready', '');
      host.removeAttribute('data-fallback');
      updateShelters();
    });
    if (scene && 'ResizeObserver' in window) {
      observer = new ResizeObserver(updateShelters);
      observer.observe(host);
      cover?.querySelectorAll('[data-sky-shelter]').forEach(element => observer.observe(element));
    }
    document.fonts.ready.then(updateShelters);
  } catch (error) {
    host.querySelector('.original-sky-canvas')?.remove();
    host.classList.add('original-sky-unsupported');
    host.dataset.skyStatus = 'fallback';
    host.setAttribute('data-fallback', '');
    console.debug('Sky renderer unavailable; using the reference gradient.', error);
  }
}

if (host) {
  modeButtons.forEach(button => {
    button.addEventListener('click', () => setMode(button.dataset.skyMode));
  });
  window.addEventListener('pagehide', event => { if (!event.persisted) dispose(); }, { once: true });
  // A small public integration hook also makes renderer verification deterministic.
  window.skyScene = window.__skyPreview = {
    setMode,
    replaceScene,
    updateShelters,
    dispose,
    get renderer() { return scene; },
    get ready() { return host.hasAttribute('data-ready'); },
    get mode() { return cover?.dataset.skyMode || 'day'; },
    get fallback() { return host.hasAttribute('data-fallback'); },
  };
  replaceScene();
}
