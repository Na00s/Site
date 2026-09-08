/*
 * Reference chart behavior: 700ms line draw, 300ms point fade beginning
 * at 70% of the draw, 80ms series stagger, and 25% viewport visibility.
 * Geometry-following interaction is shared by paper, article, and project figures.
 */
(function () {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var DRAW = 700;
  var FADE = 300;
  var STAGGER = 80;
  var EASE = 'cubic-bezier(.165,.84,.44,1)';
  var reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  var states = [];
  var frame = 0;
  var previousTime = 0;
  var visibilityObserver = null;

  function clamp(value, low, high) {
    return Math.min(high, Math.max(low, value));
  }

  function svgElement(tag, attributes) {
    var element = document.createElementNS(NS, tag);
    Object.entries(attributes || {}).forEach(function (entry) {
      element.setAttribute(entry[0], String(entry[1]));
    });
    return element;
  }

  function visibleFraction(element) {
    if (document.hidden || element.closest('[hidden]')) return 0;
    var rect = element.getBoundingClientRect();
    if (!rect.width || !rect.height) return 0;
    var width = Math.max(0, Math.min(innerWidth, rect.right) - Math.max(0, rect.left));
    var height = Math.max(0, Math.min(innerHeight, rect.bottom) - Math.max(0, rect.top));
    return (width * height) / (rect.width * rect.height);
  }

  function setActive(state, active) {
    state.active = active;
    state.element.dataset.figureActive = String(active);
    state.animations.forEach(function (animation) {
      if (animation.playState === 'finished') return;
      if (active && !reduced.matches) animation.play();
      else animation.pause();
    });
    if (active && !state.revealed) reveal(state);
    schedule();
  }

  function rememberAnimation(state, animation) {
    state.animations.push(animation);
    if (!state.active) animation.pause();
    animation.finished.catch(function () {});
  }

  function reveal(state) {
    state.animations.forEach(function (animation) { animation.cancel(); });
    state.animations = [];
    state.revealed = true;
    state.progress = 0;
    state.revealUntil = performance.now() + DRAW + STAGGER * 2;
    state.element.dataset.figureRevealed = 'true';
    state.replays += 1;
    if (reduced.matches) {
      state.revealUntil = 0;
      renderTrace(state);
      return;
    }
    state.lines.forEach(function (item, index) {
      rememberAnimation(state, item.element.animate([
        { strokeDasharray: item.length + ' ' + item.length, strokeDashoffset: item.length },
        { strokeDasharray: item.length + ' ' + item.length, strokeDashoffset: 0 },
      ], { duration: DRAW, delay: Math.min(index, 2) * STAGGER, easing: EASE, fill: 'both' }));
    });
    state.nodes.forEach(function (node, index) {
      rememberAnimation(state, node.animate([
        { opacity: 0 }, { opacity: 1 },
      ], { duration: FADE, delay: DRAW * .7 + (index % 3) * STAGGER, easing: EASE, fill: 'both' }));
    });
    schedule();
  }

  function pointOnRoute(state, progress) {
    var distance = clamp(progress, 0, .999999) * state.routeLength;
    var index = 0;
    for (; index < state.routes.length - 1; index++) {
      if (distance <= state.routes[index].length) break;
      distance -= state.routes[index].length;
    }
    var route = state.routes[index];
    return { route: route, index: index, distance: distance,
      point: route.element.getPointAtLength(clamp(distance, 0, route.length)) };
  }

  function renderTrace(state) {
    if (!state.routes.length) return;
    var current = pointOnRoute(state, state.progress);
    state.cursor.setAttribute('transform', 'translate(' + current.point.x + ' ' + current.point.y + ')');
    state.routes.forEach(function (route, index) {
      route.trace.style.opacity = index === current.index ? '.85' : '0';
      route.trace.style.strokeDashoffset = String(-(current.distance - route.length * .1));
    });
    state.nodeHighlights.forEach(function (node, index) {
      var phase = state.progress * (state.nodeHighlights.length + 1) - index;
      var pulse = Math.max(0, 1 - Math.abs(phase - .5) / .8);
      node.style.opacity = String(.8 * pulse);
    });
    state.element.dataset.figureProgress = state.progress.toFixed(4);
  }

  function shouldAnimate(state) {
    return state.active && !document.hidden && !reduced.matches;
  }

  function schedule() {
    if (!frame && states.some(shouldAnimate)) frame = requestAnimationFrame(tick);
  }

  function tick(time) {
    frame = 0;
    var delta = previousTime ? Math.min(100, time - previousTime) : 0;
    previousTime = time;
    states.forEach(function (state) {
      if (!shouldAnimate(state)) return;
      if (time < state.revealUntil) {
        state.motion.style.opacity = '0';
        return;
      }
      state.motion.style.opacity = '';
      if (!state.pointerInside && !state.keyboardFocus && time > state.holdUntil) {
        state.progress = (state.progress + delta / 4800) % 1;
      }
      renderTrace(state);
    });
    schedule();
  }

  function nearestProgress(state, event) {
    var matrix = state.svg.getScreenCTM();
    if (!matrix) return state.progress;
    var point = new DOMPoint(event.clientX, event.clientY).matrixTransform(matrix.inverse());
    var bestDistance = Infinity;
    var bestProgress = 0;
    state.samples.forEach(function (sample) {
      var distance = Math.pow(sample.x - point.x, 2) + Math.pow(sample.y - point.y, 2);
      if (distance < bestDistance) { bestDistance = distance; bestProgress = sample.progress; }
    });
    return bestProgress;
  }

  function interact(state, progress) {
    state.progress = clamp(progress, 0, .9999);
    state.revealUntil = 0;
    state.holdUntil = performance.now() + 1400;
    state.element.dataset.figureInteracting = 'true';
    state.motion.style.opacity = '';
    renderTrace(state);
    schedule();
  }

  document.querySelectorAll('.pub-fig').forEach(function (element, figureIndex) {
    var svg = element.querySelector('svg');
    if (!svg || element.classList.contains('figures-interactive')) return;
    var originalShapes = Array.from(svg.querySelectorAll('path,rect,circle,line,polyline,polygon,ellipse'));
    var lines = originalShapes.filter(function (shape) {
      return !shape.classList.contains('hot-fill') && typeof shape.getTotalLength === 'function';
    }).map(function (shape) {
      return { element: shape, length: shape.getTotalLength() };
    }).filter(function (item) { return item.length > 0; });
    var routeShapes = lines.filter(function (item) { return item.element.classList.contains('hot'); });
    if (!routeShapes.length) routeShapes = lines.slice(0, 1);
    if (!routeShapes.length) return;
    var nodes = originalShapes.filter(function (shape) {
      return shape.tagName.toLowerCase() === 'circle' || shape.tagName.toLowerCase() === 'rect';
    });
    var motion = svgElement('g', { class: 'figure-motion-layer', 'aria-hidden': 'true' });
    var nodeHighlights = nodes.map(function (node) {
      var clone = node.cloneNode(false);
      clone.removeAttribute('id');
      clone.setAttribute('class', 'figure-node-highlight');
      motion.appendChild(clone);
      return clone;
    });
    var routes = routeShapes.map(function (item) {
      var trace = item.element.cloneNode(false);
      trace.removeAttribute('id');
      trace.setAttribute('class', 'figure-trace');
      trace.style.strokeDasharray = (item.length * .1) + ' ' + (item.length * .9);
      motion.appendChild(trace);
      return { element: item.element, length: item.length, trace: trace };
    });
    var cursor = svgElement('g', { class: 'figure-cursor' });
    cursor.appendChild(svgElement('circle', { class: 'figure-tracer-halo', r: 5.5 }));
    cursor.appendChild(svgElement('circle', { class: 'figure-tracer-dot', r: 2.5 }));
    motion.appendChild(cursor);
    svg.appendChild(motion);
    svg.setAttribute('aria-hidden', 'true');
    element.removeAttribute('aria-hidden');
    element.classList.add('figures-interactive');
    element.setAttribute('role', 'button');
    element.setAttribute('tabindex', '0');
    var heading = element.closest('.pub,.article-row,.project')?.querySelector('h3')?.textContent.trim() || 'this entry';
    var description = element.dataset.figureLabel || 'illustration';
    element.setAttribute('aria-label', 'Animate ' + description + ' for ' + heading);
    element.setAttribute('aria-keyshortcuts', 'Enter Space ArrowLeft ArrowRight Home End');
    element.dataset.figureActive = 'false';
    element.dataset.figureInteracting = 'false';
    var state = {
      element: element, svg: svg, lines: lines, nodes: nodes, routes: routes,
      routeLength: routes.reduce(function (sum, route) { return sum + route.length; }, 0),
      nodeHighlights: nodeHighlights, motion: motion, cursor: cursor, animations: [],
      active: false, revealed: false, pointerInside: false, keyboardFocus: false,
      progress: (figureIndex * .12) % 1, holdUntil: 0, revealUntil: 0, replays: 0, samples: [],
    };
    for (var sampleIndex = 0; sampleIndex <= 180; sampleIndex++) {
      var progress = sampleIndex / 181;
      var point = pointOnRoute(state, progress).point;
      state.samples.push({ x: point.x, y: point.y, progress: progress });
    }
    states.push(state);
    renderTrace(state);
    element.addEventListener('pointerenter', function (event) {
      if (event.pointerType === 'mouse') state.pointerInside = true;
      interact(state, nearestProgress(state, event));
    });
    element.addEventListener('pointermove', function (event) {
      interact(state, nearestProgress(state, event));
    });
    element.addEventListener('pointerleave', function () {
      state.pointerInside = false;
      if (!state.keyboardFocus) element.dataset.figureInteracting = 'false';
      schedule();
    });
    element.addEventListener('pointerdown', function (event) {
      if (event.button !== 0) return;
      interact(state, nearestProgress(state, event));
    });
    element.addEventListener('focus', function () {
      state.keyboardFocus = true;
      interact(state, state.progress);
    });
    element.addEventListener('blur', function () {
      state.keyboardFocus = false;
      if (!state.pointerInside) element.dataset.figureInteracting = 'false';
      schedule();
    });
    element.addEventListener('click', function () {
      reveal(state);
      if (reduced.matches) interact(state, state.progress);
    });
    element.addEventListener('keydown', function (event) {
      if (event.key === 'Enter' || event.key === ' ') {
        event.preventDefault();
        reveal(state);
        if (reduced.matches) interact(state, state.progress);
        return;
      }
      var next = state.progress;
      if (event.key === 'ArrowRight' || event.key === 'ArrowDown') next += .045;
      else if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') next -= .045;
      else if (event.key === 'Home') next = 0;
      else if (event.key === 'End') next = .9999;
      else return;
      event.preventDefault();
      interact(state, next);
    });
  });

  function refreshVisibility() {
    states.forEach(function (state) { setActive(state, visibleFraction(state.element) >= .25); });
  }

  if ('IntersectionObserver' in window) {
    visibilityObserver = new IntersectionObserver(function (entries) {
      entries.forEach(function (entry) {
        var state = states.find(function (item) { return item.element === entry.target; });
        if (state) setActive(state, entry.isIntersecting && entry.intersectionRatio >= .25 && !document.hidden);
      });
    }, { threshold: [0, .25] });
    states.forEach(function (state) { visibilityObserver.observe(state.element); });
  } else window.addEventListener('scroll', refreshVisibility, { passive: true });
  window.addEventListener('resize', refreshVisibility, { passive: true });
  window.addEventListener('contentviewchange', function () {
    refreshVisibility();
    requestAnimationFrame(refreshVisibility);
  });
  document.addEventListener('visibilitychange', function () {
    previousTime = 0;
    refreshVisibility();
  });
  reduced.addEventListener('change', function () {
    states.forEach(function (state) {
      state.animations.forEach(function (animation) { animation.cancel(); });
      state.animations = [];
      state.revealUntil = 0;
      state.motion.style.opacity = '';
    });
    previousTime = 0;
    refreshVisibility();
  });
  window.__figurePreview = {
    replay: function (index) { if (states[index]) reveal(states[index]); },
    get reducedMotion() { return reduced.matches; },
    get figures() {
      return states.map(function (state) {
        return { kind: state.element.dataset.figure || 'paper', active: state.active, progress: state.progress, replays: state.replays,
          routeLength: state.routeLength, animating: shouldAnimate(state),
          traces: state.routes.length, originalPaths: state.lines.map(function (line) {
            return line.element.getAttribute('d');
          }) };
      });
    },
  };
  refreshVisibility();
})();
