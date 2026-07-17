const header = document.querySelector('.site-header');
const menuButton = document.querySelector('.menu-toggle');
const nav = document.querySelector('#main-nav');

if (header && menuButton && nav) {
  const mobileNavigation = window.matchMedia('(max-width: 800px)');
  const homeLink = nav.querySelector('a[href="index.html"]');
  menuButton.setAttribute('aria-haspopup', 'true');
  if (!nav.hasAttribute('aria-label')) nav.setAttribute('aria-label', 'Primary navigation');
  if (document.body.classList.contains('home') && homeLink) homeLink.setAttribute('aria-current', 'page');

  const setMenu = (isOpen, restoreFocus = false) => {
    header.classList.toggle('nav-open', isOpen);
    document.body.classList.toggle('menu-open', isOpen && mobileNavigation.matches);
    menuButton.setAttribute('aria-expanded', String(isOpen));
    menuButton.setAttribute('aria-label', isOpen ? 'Close navigation' : 'Open navigation');
    if (isOpen) window.requestAnimationFrame(() => {
      const firstLink = nav.querySelector('a');
      if (firstLink) firstLink.focus();
    });
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
  const handleNavigationChange = (event) => {
    if (!event.matches) closeMenu();
  };
  if (typeof mobileNavigation.addEventListener === 'function') {
    mobileNavigation.addEventListener('change', handleNavigationChange);
  } else if (typeof mobileNavigation.addListener === 'function') {
    mobileNavigation.addListener(handleNavigationChange);
  }
}

document.querySelectorAll('[data-current-year]').forEach((year) => {
  year.textContent = String(new Date().getFullYear());
});

const heroScroll = document.querySelector('.hero-scroll');
const heroCopy = document.querySelector('.hero-copy');
const heroVideo = document.querySelector('.top-hero video');
const heroVideoControl = document.querySelector('[data-hero-video-control]');
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)');

if (heroVideo) {
  let gestureRetryComplete = false;

  const showVideoControl = (show) => {
    if (heroVideoControl) heroVideoControl.hidden = !show;
  };

  const prepareVideo = () => {
    heroVideo.muted = true;
    heroVideo.defaultMuted = true;
    heroVideo.autoplay = true;
    heroVideo.playsInline = true;
    heroVideo.setAttribute('muted', '');
    heroVideo.setAttribute('playsinline', '');
    heroVideo.setAttribute('webkit-playsinline', '');
  };

  const attemptVideoPlayback = () => {
    prepareVideo();

    let playRequest;
    try {
      playRequest = heroVideo.play();
    } catch (error) {
      showVideoControl(true);
      return;
    }

    if (playRequest && typeof playRequest.then === 'function') {
      playRequest
        .then(() => showVideoControl(false))
        .catch(() => {
          if (heroVideo.paused) showVideoControl(true);
        });
    } else if (!heroVideo.paused) {
      showVideoControl(false);
    }
  };

  const retryVideoOnGesture = () => {
    if (gestureRetryComplete || !heroVideo.paused) return;
    gestureRetryComplete = true;
    attemptVideoPlayback();
  };

  prepareVideo();
  attemptVideoPlayback();
  heroVideo.addEventListener('loadeddata', attemptVideoPlayback, { once: true });
  heroVideo.addEventListener('canplay', attemptVideoPlayback, { once: true });
  heroVideo.addEventListener('playing', () => showVideoControl(false));
  if (heroVideoControl) heroVideoControl.addEventListener('click', attemptVideoPlayback);
  document.addEventListener('touchstart', retryVideoOnGesture, { once: true, passive: true });
  document.addEventListener('pointerdown', retryVideoOnGesture, { once: true, passive: true });
  window.addEventListener('pageshow', attemptVideoPlayback);
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && heroVideo.paused) attemptVideoPlayback();
  });
}

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
  const collageSticky = photoCollage.querySelector('.photo-collage__sticky');
  const collageCopy = photoCollage.querySelector('[data-collage-copy]');
  const collageClosing = photoCollage.querySelector('[data-collage-closing]');
  let collageTicking = false;

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const interpolate = (start, end, progress) => start + (end - start) * progress;
  const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);

  const clearCollageStyles = () => {
    photoCollage.classList.remove('is-scroll-ready');
    layers.forEach((layer) => {
      layer.style.removeProperty('opacity');
      layer.style.removeProperty('transform');
    });
    if (collageCopy) {
      collageCopy.style.removeProperty('opacity');
      collageCopy.style.removeProperty('transform');
    }
    if (collageClosing) {
      collageClosing.style.removeProperty('opacity');
      collageClosing.style.removeProperty('transform');
    }
  };

  const updateCollage = () => {
    if (reduceMotion.matches) {
      collageTicking = false;
      return;
    }

    const rect = photoCollage.getBoundingClientRect();
    const stickyHeight = collageSticky ? collageSticky.getBoundingClientRect().height : window.innerHeight;
    const scrollDistance = Math.max(rect.height - stickyHeight, 1);
    const progress = clamp(-rect.top / scrollDistance);

    layers.forEach((layer) => {
      const start = Number(layer.dataset.start === undefined ? 0 : layer.dataset.start);
      const end = Number(layer.dataset.end === undefined ? 1 : layer.dataset.end);
      const layerProgress = clamp((progress - start) / Math.max(end - start, 0.01));
      const easedProgress = easeOutCubic(layerProgress);
      const fromY = Number(layer.dataset.fromY === undefined ? 0 : layer.dataset.fromY);
      const toY = Number(layer.dataset.toY === undefined ? 0 : layer.dataset.toY);
      const fromScale = Number(layer.dataset.fromScale === undefined ? 1 : layer.dataset.fromScale);
      const toScale = Number(layer.dataset.toScale === undefined ? 1 : layer.dataset.toScale);
      const fromRotate = Number(layer.dataset.fromRotate === undefined ? 0 : layer.dataset.fromRotate);
      const toRotate = Number(layer.dataset.toRotate === undefined ? 0 : layer.dataset.toRotate);
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
  window.addEventListener('orientationchange', requestCollageUpdate);
  window.addEventListener('pageshow', requestCollageUpdate);
  if (window.visualViewport) {
    window.visualViewport.addEventListener('resize', requestCollageUpdate);
    window.visualViewport.addEventListener('scroll', requestCollageUpdate, { passive: true });
  }
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', syncCollageMotion);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(syncCollageMotion);
  }
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
