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
  let heroIsVisible = true;

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
    if (gestureRetryComplete || !heroIsVisible || !heroVideo.paused) return;
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
  window.addEventListener('pageshow', () => {
    if (heroIsVisible) attemptVideoPlayback();
  });
  document.addEventListener('visibilitychange', () => {
    if (!document.hidden && heroIsVisible && heroVideo.paused) attemptVideoPlayback();
  });
  if ('IntersectionObserver' in window && heroScroll) {
    const videoVisibilityObserver = new IntersectionObserver((entries) => {
      heroIsVisible = entries[0].isIntersecting;
      if (heroIsVisible) {
        attemptVideoPlayback();
      } else if (!heroVideo.paused) {
        heroVideo.pause();
      }
    }, { threshold: 0.01 });
    videoVisibilityObserver.observe(heroScroll);
  }
}

if (heroScroll && heroCopy) {
  let ticking = false;
  let heroAnimationActive = true;
  let lastHeroProgress = -1;

  const updateHero = () => {
    if (!heroAnimationActive) {
      ticking = false;
      return;
    }

    const rect = heroScroll.getBoundingClientRect();
    const distance = Math.max(window.innerHeight * 0.55, 1);
    const progress = Math.min(Math.max(-rect.top / distance, 0), 1);
    if (Math.abs(progress - lastHeroProgress) < 0.001) {
      ticking = false;
      return;
    }
    lastHeroProgress = progress;
    const fade = Math.max(1 - progress * 1.55, 0);

    heroCopy.style.opacity = String(fade);
    heroCopy.style.transform = reduceMotion.matches ? 'none' : `translateY(${-progress * 55}px)`;
    if (heroVideo && !reduceMotion.matches) {
      heroVideo.style.transform = `scale(${1 + progress * 0.035})`;
    }
    ticking = false;
  };

  const requestUpdate = () => {
    if (heroAnimationActive && !ticking) {
      window.requestAnimationFrame(updateHero);
      ticking = true;
    }
  };

  updateHero();
  window.addEventListener('scroll', requestUpdate, { passive: true });
  window.addEventListener('resize', requestUpdate);
  if ('IntersectionObserver' in window) {
    const heroAnimationObserver = new IntersectionObserver((entries) => {
      heroAnimationActive = entries[0].isIntersecting;
      if (heroAnimationActive) requestUpdate();
    }, { rootMargin: '15% 0px', threshold: 0 });
    heroAnimationObserver.observe(heroScroll);
  }
}

const photoCollage = document.querySelector('[data-photo-collage]');

if (photoCollage) {
  const mobileCollage = window.matchMedia('(max-width: 800px)');
  const layers = Array.from(photoCollage.querySelectorAll('[data-scroll-layer]'));
  const collageSticky = photoCollage.querySelector('.photo-collage__sticky');
  const collageCopy = photoCollage.querySelector('[data-collage-copy]');
  const collageClosing = photoCollage.querySelector('[data-collage-closing]');
  const collageImages = Array.from(photoCollage.querySelectorAll('img'));

  const clamp = (value, min = 0, max = 1) => Math.min(Math.max(value, min), max);
  const interpolate = (start, end, progress) => start + (end - start) * progress;
  const easeOutCubic = (progress) => 1 - Math.pow(1 - progress, 3);
  const dataNumber = (layer, name, fallback) => {
    const value = layer.dataset[name];
    return Number(value === undefined ? fallback : value);
  };
  const layerMotion = layers.map((layer) => {
    const start = dataNumber(layer, 'start', 0);
    const end = dataNumber(layer, 'end', 1);
    return {
      element: layer,
      start,
      range: Math.max(end - start, 0.01),
      fromY: dataNumber(layer, 'fromY', 0),
      toY: dataNumber(layer, 'toY', 0),
      fromScale: dataNumber(layer, 'fromScale', 1),
      toScale: dataNumber(layer, 'toScale', 1),
      fromRotate: dataNumber(layer, 'fromRotate', 0),
      toRotate: dataNumber(layer, 'toRotate', 0),
      lastProgress: -1,
      lastOpacity: '',
      lastTransform: ''
    };
  });
  const copyMotion = { lastProgress: -1, lastOpacity: '', lastTransform: '' };
  const closingMotion = { lastProgress: -1, lastOpacity: '', lastTransform: '' };

  let collageTicking = false;
  let collageMeasured = false;
  let collageIsActive = true;
  let collageTop = 0;
  let collageDistance = 1;
  let collageStickyHeight = window.innerHeight;
  let measuredViewportWidth = document.documentElement.clientWidth;
  let lastCollageProgress = -1;

  const currentScrollY = () => window.pageYOffset || document.documentElement.scrollTop || 0;
  const collageMotionIsReduced = () => reduceMotion.matches && !mobileCollage.matches;

  const writeMotionStyles = (element, state, opacity, transform) => {
    if (!element) return;
    const opacityValue = opacity.toFixed(3);
    if (state.lastOpacity !== opacityValue) {
      element.style.opacity = opacityValue;
      state.lastOpacity = opacityValue;
    }
    if (state.lastTransform !== transform) {
      element.style.transform = transform;
      state.lastTransform = transform;
    }
  };

  const resetMotionState = () => {
    layerMotion.forEach((motion) => {
      motion.lastProgress = -1;
      motion.lastOpacity = '';
      motion.lastTransform = '';
    });
    copyMotion.lastProgress = -1;
    copyMotion.lastOpacity = '';
    copyMotion.lastTransform = '';
    closingMotion.lastProgress = -1;
    closingMotion.lastOpacity = '';
    closingMotion.lastTransform = '';
    lastCollageProgress = -1;
  };

  const clearCollageStyles = () => {
    photoCollage.classList.remove('is-scroll-ready');
    layerMotion.forEach((motion) => {
      motion.element.style.removeProperty('opacity');
      motion.element.style.removeProperty('transform');
    });
    if (collageCopy) {
      collageCopy.style.removeProperty('opacity');
      collageCopy.style.removeProperty('transform');
    }
    if (collageClosing) {
      collageClosing.style.removeProperty('opacity');
      collageClosing.style.removeProperty('transform');
    }
    collageMeasured = false;
    resetMotionState();
  };

  const measureCollage = () => {
    const rect = photoCollage.getBoundingClientRect();
    collageStickyHeight = collageSticky ? collageSticky.offsetHeight : window.innerHeight;
    collageTop = currentScrollY() + rect.top;
    collageDistance = Math.max(photoCollage.offsetHeight - collageStickyHeight, 1);
    measuredViewportWidth = document.documentElement.clientWidth;
    collageMeasured = true;
    resetMotionState();
  };

  const updateCollage = () => {
    if (collageMotionIsReduced()) {
      collageTicking = false;
      return;
    }

    if (!collageMeasured) measureCollage();
    const progress = clamp((currentScrollY() - collageTop) / collageDistance);
    if (Math.abs(progress - lastCollageProgress) < 0.00025) {
      collageTicking = false;
      return;
    }
    lastCollageProgress = progress;

    layerMotion.forEach((motion) => {
      const layerProgress = clamp((progress - motion.start) / motion.range);
      if (layerProgress === motion.lastProgress) return;
      motion.lastProgress = layerProgress;
      const easedProgress = easeOutCubic(layerProgress);
      const y = interpolate(motion.fromY, motion.toY, easedProgress) * collageStickyHeight / 100;
      const scale = interpolate(motion.fromScale, motion.toScale, easedProgress);
      const rotate = interpolate(motion.fromRotate, motion.toRotate, easedProgress);
      const transform = `translate3d(0, ${y.toFixed(2)}px, 0) rotate(${rotate.toFixed(3)}deg) scale(${scale.toFixed(4)})`;
      writeMotionStyles(motion.element, motion, clamp(layerProgress * 5), transform);
    });

    if (collageCopy) {
      const copyProgress = easeOutCubic(clamp(progress / 0.3));
      if (copyProgress !== copyMotion.lastProgress) {
        copyMotion.lastProgress = copyProgress;
        writeMotionStyles(
          collageCopy,
          copyMotion,
          1 - copyProgress,
          `translate3d(0, ${(-copyProgress * 3).toFixed(3)}rem, 0)`
        );
      }
    }

    if (collageClosing) {
      const closingProgress = easeOutCubic(clamp((progress - 0.82) / 0.14));
      if (closingProgress !== closingMotion.lastProgress) {
        closingMotion.lastProgress = closingProgress;
        writeMotionStyles(
          collageClosing,
          closingMotion,
          closingProgress,
          `translate3d(0, ${((1 - closingProgress) * 2.5).toFixed(3)}rem, 0)`
        );
      }
    }

    collageTicking = false;
  };

  const requestCollageUpdate = () => {
    if (collageIsActive && !collageTicking && !collageMotionIsReduced()) {
      window.requestAnimationFrame(updateCollage);
      collageTicking = true;
    }
  };

  const refreshCollageMeasurements = (force = false) => {
    if (!photoCollage.classList.contains('is-scroll-ready')) return;
    const viewportWidth = document.documentElement.clientWidth;
    if (!force && mobileCollage.matches && Math.abs(viewportWidth - measuredViewportWidth) < 1) return;
    measureCollage();
    requestCollageUpdate();
  };

  const syncCollageMotion = () => {
    if (collageMotionIsReduced()) {
      clearCollageStyles();
      return;
    }

    photoCollage.classList.add('is-scroll-ready');
    measureCollage();
    requestCollageUpdate();
  };

  const prepareCollageImages = () => {
    collageImages.forEach((image) => {
      image.loading = 'eager';
      if (typeof image.decode === 'function') image.decode().catch(() => {});
    });
  };

  syncCollageMotion();
  window.addEventListener('scroll', requestCollageUpdate, { passive: true });
  window.addEventListener('resize', () => refreshCollageMeasurements(false));
  window.addEventListener('orientationchange', () => {
    window.setTimeout(() => refreshCollageMeasurements(true), 120);
  });
  window.addEventListener('pageshow', () => refreshCollageMeasurements(true));
  if ('IntersectionObserver' in window) {
    const collageActivityObserver = new IntersectionObserver((entries) => {
      collageIsActive = entries[0].isIntersecting;
      photoCollage.classList.toggle('is-collage-active', collageIsActive);
      if (collageIsActive) {
        prepareCollageImages();
        refreshCollageMeasurements(true);
      }
    }, { rootMargin: '75% 0px', threshold: 0 });
    collageActivityObserver.observe(photoCollage);
  } else {
    photoCollage.classList.add('is-collage-active');
    prepareCollageImages();
  }
  if (typeof reduceMotion.addEventListener === 'function') {
    reduceMotion.addEventListener('change', syncCollageMotion);
  } else if (typeof reduceMotion.addListener === 'function') {
    reduceMotion.addListener(syncCollageMotion);
  }
  if (typeof mobileCollage.addEventListener === 'function') {
    mobileCollage.addEventListener('change', syncCollageMotion);
  } else if (typeof mobileCollage.addListener === 'function') {
    mobileCollage.addListener(syncCollageMotion);
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
