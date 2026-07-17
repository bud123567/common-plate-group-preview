const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

if (header && menuButton && nav) {
  const mobileNavigation = window.matchMedia('(max-width: 800px)');
  menuButton.setAttribute('aria-haspopup', 'true');
  if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', 'Primary navigation');
  if (document.body.classList.contains('home')) nav.querySelector('a[href="index.html"]')?.setAttribute('aria-current', 'page');

  const setMenu = (isOpen, restoreFocus = false) => {
    header.classList.toggle('nav-open', isOpen);
    document.body.classList.toggle('menu-open', isOpen && mobileNavigation.matches);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    if (isOpen) window.requestAnimationFrame(() => nav.querySelector('a')?.focus());
    if (!isOpen && restoreFocus) menuButton.focus();
  };

  const closeMenu = (restoreFocus = false) => setMenu(false, restoreFocus);

  menuButton.addEventListener('click', () => {
    setMenu(!header.classList.contains('nav-open'));
  });

  nav.querySelectorAll('a').forEach((link) => link.addEventListener('click', closeMenu));
  document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape' && header.classList.contains('nav-open')) closeMenu(true);
  });
  document.addEventListener('click', (event) => {
    if (!header.contains(event.target)) closeMenu();
  });
  mobileNavigation.addEventListener?.('change', (event) => {
    if (!event.matches) closeMenu();
  });
}

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});

const heroScroll = document.querySelector('.hero-scroll');
const heroCopy = document.querySelector('.hero-copy');
const heroVideo = document.querySelector('.top-hero video');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroScroll && heroCopy) {
  let ticking = false;

  const updateHero = () => {
    const rect = heroScroll.getBoundingClientRect();
    const distance = Math.max(window.innerHeight * 0.55, 1);
    const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
    const fade = Math.max(1 - progress * 1.55, 0);

    heroCopy.style.opacity = String(fade);
    heroCopy.style.transform = reduceMotion.matches ? 'none' : `translateY(${-progress * 55}px)`;
    if (heroVideo && !reduceMotion.matches) {
      heroVideo.style.transform = `scale(${1 + progress * 0.035})`;
    }
    ticking = false;
  };

  const requestUpdate = () => {
    if (!ticking) {
      window.requestAnimationFrame(updateHero);
      ticking = true;
    }
  };

  updateHero();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
}

const photoCollage = document.querySelector('[data-photo-collage]');

if (photoCollage) {
  const layers = Array.from(photoCollage.querySelectorAll('[data-scroll-layer]'));
  const collageCopy = photoCollage.querySelector('[data-collage-copy]');
  const collageClosing = photoCollage.querySelector('[data-collage-closing]');
  let collageTicking = false;

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const interpolate = (start, end, progress) => start + (end - start) * progress;
  const easeOutCubic = (progress) => 1 - ((1 - progress) ** 3);

  const clearCollageStyles = () => {
    photoCollage.classList.remove('is-scroll-ready');
    layers.forEach((layer) => {
      layer.style.removeProperty('opacity');
      layer.style.removeProperty('transform');
    });
    collageCopy?.style.removeProperty('opacity');
    collageCopy?.style.removeProperty('transform');
    collageClosing?.style.removeProperty('opacity');
    collageClosing?.style.removeProperty('transform');
  };

  const updateCollage = () => {
    if (reduceMotion.matches) {
      collageTicking = false;
      return;
    }

    const rect = photoCollage.getBoundingClientRect();
    const scrollDistance = Math.max(rect.height - window.innerHeight, 1);
    const progress = clamp(-rect.top / scrollDistance);

    layers.forEach((layer) => {
      const start = Number(layer.dataset.start ?? 0);
      const end = Number(layer.dataset.end ?? 1);
      const layerProgress = clamp((progress - start) / Math.max(end - start, 0.01));
      const easedProgress = easeOutCubic(layerProgress);
      const fromY = Number(layer.dataset.fromY ?? 0);
      const toY = Number(layer.dataset.toY ?? 0);
      const fromScale = Number(layer.dataset.fromScale ?? 1);
      const toScale = Number(layer.dataset.toScale ?? 1);
      const fromRotate = Number(layer.dataset.fromRotate ?? 0);
      const toRotate = Number(layer.dataset.toRotate ?? 0);
      const y = interpolate(fromY, toY, easedProgress);
      const scale = interpolate(fromScale, toScale, easedProgress);
      const rotate = interpolate(fromRotate, toRotate, easedProgress);

      layer.style.opacity = String(clamp(layerProgress * 5));
      layer.style.transform = `translate3d(0, ${y}vh, 0) rotate(${rotate}deg) scale(${scale})`;
    });

    if (collageCopy) {
      const copyProgress = easeOutCubic(clamp(progress / 0.3));
      collageCopy.style.opacity = String(1 - copyProgress);
      collageCopy.style.transform = `translate3d(0, ${-copyProgress * 3}rem, 0)`;
    }

    if (collageClosing) {
      const closingProgress = easeOutCubic(clamp((progress - 0.82) / 0.14));
      collageClosing.style.opacity = String(closingProgress);
      collageClosing.style.transform = `translate3d(0, ${(1 - closingProgress) * 2.5}rem, 0)`;
    }

    collageTicking = false;
  };

  const requestCollageUpdate = () => {
    if (!collageTicking && !reduceMotion.matches) {
      window.requestAnimationFrame(updateCollage);
      collageTicking = true;
    }
  };

  const syncCollageMotion = () => {
    if (reduceMotion.matches) {
      clearCollageStyles();
      return;
    }

    photoCollage.classList.add('is-scroll-ready');
    requestCollageUpdate();
  };

  syncCollageMotion();
  window.addEventListener('scroll', requestCollageUpdate, { passive: true });
  window.addEventListener('resize', requestCollageUpdate);
  reduceMotion.addEventListener?.('change', syncCollageMotion);
}


const alignInitialAnchor = () => {
  if (!window.location.hash) return;

  const target = document.getElementById(decodeURIComponent(window.location.hash.slice(1)));
  if (!target) return;

  const root = document.documentElement;
  const previousScrollBehavior = root.style.scrollBehavior;
  root.style.scrollBehavior = 'auto';
  target.scrollIntoView({ block: 'start' });
  root.style.scrollBehavior = previousScrollBehavior;
};

if (document.readyState === 'complete') {
  window.requestAnimationFrame(alignInitialAnchor);
} else {
  window.addEventListener('load', () => window.requestAnimationFrame(alignInitialAnchor), { once: true });
}
