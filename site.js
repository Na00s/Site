(function () {
  'use strict';
  var root = document.documentElement;
  var header = document.querySelector('.site-head');
  var menu = document.querySelector('.menu-toggle');
  var cover = document.querySelector('.cover');
  var toggle = document.querySelector('.theme-toggle');
  var nav = document.querySelector('.site-nav');
  var previousScroll = window.scrollY;
  var scheduled = false;

  if (toggle) toggle.addEventListener('click', function () {
    var next = root.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
    root.setAttribute('data-theme', next);
    try { localStorage.setItem('reference-theme', next); } catch (e) {}
  });

  function closeMenu() {
    header.classList.remove('menu-open');
    menu.setAttribute('aria-expanded', 'false');
  }
  if (menu) menu.addEventListener('click', function () {
    var open = menu.getAttribute('aria-expanded') !== 'true';
    menu.setAttribute('aria-expanded', String(open));
    header.classList.toggle('menu-open', open);
    header.classList.remove('is-hidden');
    if (open && nav) nav.querySelector('a').focus();
  });
  if (nav) nav.querySelectorAll('a').forEach(function (link) {
    link.addEventListener('click', closeMenu);
  });
  document.addEventListener('keydown', function (event) {
    if (event.key === 'Escape' && header.classList.contains('menu-open')) {
      closeMenu();
      menu.focus();
    }
  });
  window.addEventListener('resize', function () {
    if (window.innerWidth >= 900) closeMenu();
  });

  function updateScroll() {
    var scroll = window.scrollY;
    var delta = scroll - previousScroll;
    if (!header.classList.contains('menu-open')) {
      if (scroll < 25 || delta < -3) header.classList.remove('is-hidden');
      else if (delta > 3 && scroll > 100) header.classList.add('is-hidden');
    }
    previousScroll = scroll;
    scheduled = false;
  }
  window.addEventListener('scroll', function () {
    if (!scheduled) {
      scheduled = true;
      requestAnimationFrame(updateScroll);
    }
  }, { passive: true });
  updateScroll();

  document.querySelectorAll('button[data-sky-mode]').forEach(function (button) {
    button.addEventListener('click', function () {
      var mode = button.getAttribute('data-sky-mode');
      cover.setAttribute('data-sky-mode', mode);
      document.querySelectorAll('button[data-sky-mode]').forEach(function (other) {
        other.setAttribute('aria-pressed', String(other === button));
      });
    });
  });
})();
