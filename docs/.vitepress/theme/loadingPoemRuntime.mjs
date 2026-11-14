/** Shared by the pre-hydration loader and client navigation; no Vue dependency. */
export function createLoadingPoemPlayer({
  root, poems, random = Math.random, schedule = setTimeout,
  cancel = clearTimeout, now = () => performance.now(),
  cycleMs = 30000, shuffle = false
}) {
  const doc = root.ownerDocument;
  const motion = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const ghost = root.querySelector('[data-poem-ghost]');
  const output = root.querySelector('[data-poem-text]');
  const author = root.querySelector('[data-poem-author]') ?? root.parentElement?.querySelector('[data-poem-author]');
  let timer;
  let task;
  let active = false;
  let disposed = false;
  let poem;
  let animations = [];
  let startedAt = 0;
  let pausedAt = 0;
  let paused = false;
  let suspended = false;
  let bag = [];
  let lastId;

  function clear() {
    if (timer !== undefined) cancel(timer);
    timer = undefined;
    task = undefined;
  }

  function later(delay, callback) {
    clear();
    task = { delay, callback, due: now() + delay };
    if (suspended) return;
    timer = schedule(() => {
      timer = undefined;
      task = undefined;
      if (active && !disposed) callback();
    }, delay);
  }

  function stopAnimations() {
    animations.forEach(animation => animation.cancel());
    animations = [];
  }
  function animate(element, frames, options) {
    const animation = element.animate(frames, { ...options, fill: 'both' });
    animations.push(animation);
    if (suspended) animation.pause();
  }
  function phase(value) { root.dataset.phase = value; }
  function hold() {
    stopAnimations();
    phase('holding');
    later(Math.max(0, cycleMs - ((suspended ? pausedAt : now()) - startedAt)), fade);
  }
  function reveal() {
    output.textContent = poem.text;
    if (motion?.matches || !doc.createElement || !output.animate) { hold(); return; }
    output.textContent = '';
    const lines = poem.form === 'verse'
      ? poem.text.split(/(?<=\n)/u)
      : [...new Intl.Segmenter(poem.lang, { granularity: 'sentence' }).segment(poem.text)].map(part => part.segment);
    let duration = 0;
    const graphemes = new Intl.Segmenter(poem.lang, { granularity: 'grapheme' });
    const words = new Intl.Segmenter(poem.lang, { granularity: 'word' });
    lines.forEach((line, layer) => {
      const length = [...graphemes.segment(line)].length;
      let index = 0;
      let previousWord;
      for (const part of words.segment(line)) {
        if (/^\s+$/u.test(part.segment)) {
          output.append(doc.createTextNode(part.segment));
          index += [...graphemes.segment(part.segment)].length;
          continue;
        }
        const word = !part.isWordLike && previousWord ? previousWord : doc.createElement('span');
        if (word !== previousWord) {
          word.style.cssText = 'display:inline-block;white-space:pre;';
          output.append(word);
        }
        previousWord = word;
        for (const { segment } of graphemes.segment(part.segment)) {
          const glyph = doc.createElement('span');
          glyph.textContent = segment;
          glyph.style.cssText = 'display:inline-block;transform-origin:50% 70%;';
          word.append(glyph);
          const position = index++ / Math.max(1, length - 1);
          const frames = Array.from({ length: 41 }, (_, step) => {
            const t = step / 40;
            const envelope = (1 - t) ** 1.4;
            const angle = position * Math.PI * 1.5 - t * Math.PI * 1.2;
            return {
              offset: t,
              transform: `translateY(${-Math.sin(angle) * .55 * envelope + .28 * (1 - t)}em) rotate(${-Math.cos(angle) * 12 * envelope}deg)`,
              opacity: Math.min(1, t * 2.4),
              filter: `blur(${5 * (1 - Math.min(1, t * 2.2))}px)`
            };
          });
          const delay = layer * 650 + position * 600;
          animate(glyph, frames, { duration: 2800, delay, easing: 'linear' });
          duration = Math.max(duration, delay + 2800);
        }
      }
    });
    if (author?.animate) animate(author, [{ opacity: 0 }, { opacity: 1 }], { duration: 1000, delay: 650, easing: 'ease-out' });
    phase('revealing');
    later(duration, hold);
  }
  function fade() {
    if (motion?.matches || !output.animate) { next(); return; }
    phase('fading');
    // Freeze the current wave if Next is pressed mid-reveal; fade that exact pose.
    animations.forEach(animation => animation.pause());
    animate(output, [{ opacity: 1, filter: 'blur(0px)' }, { opacity: 0, filter: 'blur(3px)' }], { duration: 420, easing: 'ease-in' });
    if (author?.animate) animate(author, [{ opacity: 1 }, { opacity: 0 }], { duration: 300, easing: 'ease-in' });
    later(420, next);
  }
  function next() {
    const previous = shuffle ? lastId : doc.documentElement.dataset.loadingLastPoem;
    const candidates = poems.filter(item => String(item.id) !== String(previous));
    const pool = candidates.length ? candidates : poems;
    if (shuffle) {
      if (!bag.length) {
        bag = [...poems];
        for (let i = bag.length - 1; i > 0; i--) {
          const j = Math.min(i, Math.floor(Math.max(0, random()) * (i + 1)));
          [bag[i], bag[j]] = [bag[j], bag[i]];
        }
        if (bag.length > 1 && String(bag.at(-1).id) === String(previous)) {
          [bag[0], bag[bag.length - 1]] = [bag[bag.length - 1], bag[0]];
        }
      }
      poem = bag.pop();
    } else {
      poem = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
    }
    if (!poem) return;
    if (author && poem.model && poem.url) {
      author.textContent = poem.model;
      author.setAttribute('href', poem.url);
    }
    lastId = poem.id;
    if (!shuffle) doc.documentElement.dataset.loadingLastPoem = String(poem.id);
    root.dataset.poemId = String(poem.id);
    root.dataset.form = poem.form;
    root.lang = poem.lang;
    stopAnimations();
    ghost.textContent = poem.text;
    startedAt = suspended ? pausedAt : now();
    reveal();
  }
  function visibility() {
    if (!active) return;
    const shouldSuspend = doc.hidden || paused;
    if (shouldSuspend === suspended) return;
    suspended = shouldSuspend;
    animations.forEach(animation => suspended ? animation.pause() : animation.play());
    if (suspended) {
      pausedAt = now();
      if (task) task.delay = Math.max(0, task.due - now());
      if (timer !== undefined) cancel(timer);
      timer = undefined;
    } else {
      startedAt += now() - pausedAt;
      if (task) later(task.delay, task.callback);
    }
  }
  function motionChange() {
    if (!active || !poem) return;
    clear();
    const wasFading = root.dataset.phase === 'fading';
    stopAnimations();
    output.textContent = poem.text;
    if (wasFading) next();
    else hold();
  }
  doc.addEventListener('visibilitychange', visibility);
  motion?.addEventListener('change', motionChange);
  return {
    start() {
      if (disposed || active) return;
      active = true;
      pausedAt = now();
      suspended = doc.hidden || paused;
      next();
    },
    pause(value = true) {
      paused = value;
      visibility();
    },
    next() {
      if (!active || disposed || root.dataset.phase === 'fading') return;
      clear();
      fade();
    },
    destroy() {
      active = false;
      disposed = true;
      clear();
      doc.removeEventListener('visibilitychange', visibility);
      motion?.removeEventListener('change', motionChange);
      stopAnimations();
      phase('idle');
    }
  };
}

/** Runs before the app bundle: slow first visits get the same poem animation. */
export function bootstrapLoadingPoem(poems, createPlayer) {
  const doc = document;
  let player;
  let dismissal;
  let watchdog;
  let recoveryTimer;
  let failed = false;
  let done = false;
  let ready = false;
  let shownAt;
  let collection = Array.isArray(poems) ? poems : undefined;
  let poemRoot;
  function play() {
    if (done || player || !poemRoot || !collection) return;
    player = createPlayer({ root: poemRoot, poems: collection });
    player.start();
  }
  if (!collection) Promise.resolve(poems).then(items => {
    collection = items;
    play();
  }).catch(() => { /* Poetry must never delay or prevent reading. */ });
  const observer = new MutationObserver(attach);
  function attach() {
    if (done || player) return;
    const root = doc.querySelector('.site-loading [data-poem-player]');
    if (!root) return;
    observer.disconnect();
    poemRoot = root;
    play();
    if (failed) showRecovery();
    // Release ready content after a painted frame without a forced reading delay.
    requestAnimationFrame(() => requestAnimationFrame(() => {
      if (done) return;
      shownAt = performance.now();
      settle();
    }));
  }
  function settle() {
    if (done || !ready || shownAt === undefined) return;
    const styles = [...doc.querySelectorAll('link[data-site-boot-style]')];
    if (styles.some(link => !link.sheet && link.dataset.siteStyleReady !== 'true')) return;
    clearTimeout(dismissal);
    dismissal = setTimeout(finish, 0);
  }
  function appReady() {
    ready = true;
    settle();
  }
  function showRecovery() {
    const controls = doc.querySelector('.site-loading [data-loading-recovery]');
    if (controls) {
      controls.hidden = false;
      controls.inert = false;
      controls.setAttribute('aria-hidden', 'false');
    }
  }
  function resourceFailed(event) {
    if (!['SCRIPT', 'LINK'].includes(event.target?.tagName)) return;
    failed = true;
    showRecovery();
    clearTimeout(watchdog);
    watchdog = setTimeout(finish, 6000);
  }
  function action(event) {
    if (!event.target?.closest?.('.site-loading [data-loading-recovery]')) return;
    if (event.target.closest('[data-loading-continue]')) {
      finish();
      const main = doc.querySelector('main');
      if (main) {
        const hadTabindex = main.hasAttribute('tabindex');
        if (!hadTabindex) {
          main.setAttribute('tabindex', '-1');
          main.addEventListener('blur', () => main.removeAttribute('tabindex'), { once: true });
        }
        main.focus({ preventScroll: true });
      }
    } else if (event.target.closest('[data-loading-retry]')) doc.defaultView?.location.reload();
  }
  function finish() {
    if (done) return;
    done = true;
    const controls = doc.querySelector('.site-loading [data-loading-recovery]');
    if (controls) {
      controls.hidden = true;
      controls.inert = true;
      controls.setAttribute('aria-hidden', 'true');
    }
    observer.disconnect();
    clearTimeout(dismissal);
    clearTimeout(watchdog);
    clearTimeout(recoveryTimer);
    player?.destroy();
    doc.documentElement.classList.remove('site-boot-loading');
    doc.removeEventListener('site-loading-ready', appReady);
    doc.removeEventListener('site-loading-style-ready', settle);
    doc.removeEventListener('click', action);
    doc.removeEventListener('error', resourceFailed, true);
    doc.dispatchEvent(new Event('site-loading-finished'));
  }
  doc.documentElement.classList.add('site-boot-loading');
  doc.addEventListener('site-loading-ready', appReady, { once: true });
  doc.addEventListener('site-loading-style-ready', settle);
  // Native event handlers work even when the application bundle never starts.
  doc.addEventListener('click', action);
  doc.addEventListener('error', resourceFailed, true);
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  attach();
  recoveryTimer = setTimeout(showRecovery, 6000);
  // A broken startup must release SSR quickly, including when no root arrived.
  watchdog = setTimeout(finish, 12000);
}
