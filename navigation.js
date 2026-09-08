(function () {
  'use strict';

  var toc = document.querySelector('.side-toc');
  if (!toc) return;

  var links = Array.from(toc.querySelectorAll('a[href^="#"]'));
  if (!links.length) return;

  var desktop = window.matchMedia('(min-width: 1080px)');
  var frame = 0;
  var visibleStations = [];
  var drag = { active: false, moved: false, startY: 0, pointerId: null };

  function targetFor(link) {
    var hash = link.getAttribute('href').slice(1);
    try { hash = decodeURIComponent(hash); } catch (error) {}
    return document.getElementById(hash);
  }

  function collectStations() {
    visibleStations = [];
    links.forEach(function (link, index) {
      var element = targetFor(link);
      if (!element || !element.getClientRects().length || element.closest('[hidden]')) return;
      visibleStations.push({ element: element, link: link, index: index });
    });
  }

  function refresh() {
    frame = 0;
    collectStations();

    var first = visibleStations[0];
    var footer = document.querySelector('.site-foot');
    var footerTop = footer ? footer.getBoundingClientRect().top : Infinity;
    var entered = Boolean(first) && first.element.getBoundingClientRect().top < window.innerHeight * .5;
    var showing = desktop.matches && ((entered && footerTop > 240) || drag.moved && drag.active);

    toc.style.top = Math.max(96, (window.innerHeight - toc.offsetHeight) / 2) + 'px';
    toc.classList.toggle('is-visible', showing);
    toc.inert = !showing;

    var active = first ? first.index : -1;
    var threshold = window.innerHeight * .4;
    visibleStations.forEach(function (station) {
      if (station.element.getBoundingClientRect().top <= threshold) active = station.index;
    });
    links.forEach(function (link, index) {
      var selected = index === active;
      link.classList.toggle('is-active', selected);
      if (selected) link.setAttribute('aria-current', 'location');
      else link.removeAttribute('aria-current');
    });
  }

  function scheduleRefresh() {
    if (!frame) frame = requestAnimationFrame(refresh);
  }

  function endDrag(event) {
    if (event && drag.pointerId !== null && event.pointerId !== drag.pointerId) return;
    var pointerId = drag.pointerId;
    drag.active = false;
    if (event && event.type === 'pointercancel') drag.moved = false;
    drag.pointerId = null;
    toc.classList.remove('is-dragging');
    if (pointerId !== null && toc.hasPointerCapture(pointerId)) toc.releasePointerCapture(pointerId);
    scheduleRefresh();
  }

  function scrollFromPointer(clientY) {
    collectStations();
    var bounds = toc.getBoundingClientRect();
    if (!bounds.height) return;
    var position = Math.min(1, Math.max(0, (clientY - bounds.top) / bounds.height));
    var first = visibleStations[0];
    var footer = document.querySelector('.site-foot');
    var start = first ? first.element.getBoundingClientRect().top + window.scrollY - 96 : 0;
    var end = Math.max(start, footer
      ? footer.getBoundingClientRect().top + window.scrollY - window.innerHeight
      : document.body.scrollHeight - window.innerHeight);
    window.scrollTo({ top: start + position * (end - start), behavior: 'auto' });
    scheduleRefresh();
  }

  links.forEach(function (link) {
    link.draggable = false;
    link.addEventListener('dragstart', function (event) { event.preventDefault(); });
  });

  toc.addEventListener('pointerdown', function (event) {
    if (!desktop.matches || event.button !== 0) return;
    drag = { active: true, moved: false, startY: event.clientY, pointerId: event.pointerId };
  });

  toc.addEventListener('pointermove', function (event) {
    if (!drag.active || event.pointerId !== drag.pointerId) return;
    if (!drag.moved && Math.abs(event.clientY - drag.startY) < 4) return;
    if (!drag.moved) {
      drag.moved = true;
      toc.classList.add('is-dragging', 'is-visible');
      toc.inert = false;
      toc.setPointerCapture(event.pointerId);
    }
    scrollFromPointer(event.clientY);
  });

  toc.addEventListener('pointerup', endDrag);
  toc.addEventListener('pointercancel', endDrag);
  toc.addEventListener('lostpointercapture', endDrag);
  toc.addEventListener('click', function (event) {
    if (!drag.moved) return;
    drag.moved = false;
    event.preventDefault();
    event.stopImmediatePropagation();
  }, true);

  window.addEventListener('scroll', scheduleRefresh, { passive: true });
  window.addEventListener('resize', function () {
    if (!desktop.matches && drag.active) endDrag();
    scheduleRefresh();
  });
  window.addEventListener('contentviewchange', scheduleRefresh);
  window.addEventListener('load', scheduleRefresh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(scheduleRefresh);

  toc.dataset.navigationReady = 'true';
  refresh();
})();
