/** Shared by the pre-hydration loader and client navigation; no Vue dependency. */
export function createLoadingPoemPlayer({
  root, poems, random = Math.random, schedule = setTimeout,
  cancel = clearTimeout, now = () => performance.now()
}) {
  const doc = root.ownerDocument;
  const motion = doc.defaultView?.matchMedia?.('(prefers-reduced-motion: reduce)');
  const ghost = root.querySelector('[data-poem-ghost]');
  const output = root.querySelector('[data-poem-text]');
  let timer;
  let task;
  let active = false;
  let disposed = false;
  let poem;
  let letters = [];
  let count = 0;
  let startedAt = 0;
  let pausedAt = 0;

  function clear() {
    if (timer !== undefined) cancel(timer);
    timer = undefined;
    task = undefined;
  }

  function later(delay, callback) {
    clear();
    task = { delay, callback, due: now() + delay };
    if (doc.hidden) return;
    timer = schedule(() => {
      timer = undefined;
      task = undefined;
      if (active && !disposed) callback();
    }, delay);
  }

  function render() { output.textContent = letters.slice(0, count).join(''); }
  function phase(value, cursor) {
    root.dataset.phase = value;
    root.dataset.cursor = cursor;
  }
  function hold() {
    phase('holding', 'hidden');
    later(Math.max(0, 30000 - (now() - startedAt)), erase);
  }
  function complete() {
    if (motion?.matches) { hold(); return; }
    phase('settling', 'blinking');
    later(1800, hold);
  }
  function type() {
    if (count >= letters.length) { complete(); return; }
    count += 1;
    render();
    const letter = letters[count - 1];
    const base = poem.lang === 'en' ? 13 : 22;
    later(/[，。；！？,.!?;\n]/u.test(letter) ? base * 2 : base, type);
  }
  function erase() {
    phase('erasing', 'typing');
    if (motion?.matches) {
      count = 0;
      render();
      next();
      return;
    }
    if (count > 0) {
      count -= 1;
      render();
      later(poem.lang === 'en' ? 9 : 15, erase);
    } else {
      phase('between', 'hidden');
      later(240, next);
    }
  }
  function next() {
    const previous = Number(doc.documentElement.dataset.loadingLastPoem);
    const candidates = poems.filter(item => item.id !== previous);
    const pool = candidates.length ? candidates : poems;
    poem = pool[Math.min(pool.length - 1, Math.floor(Math.max(0, random()) * pool.length))];
    if (!poem) return;
    doc.documentElement.dataset.loadingLastPoem = String(poem.id);
    root.dataset.poemId = String(poem.id);
    root.dataset.form = poem.form;
    root.lang = poem.lang;
    // Full-text geometry prevents reflow while characters enter and leave.
    ghost.textContent = poem.text + '\u00a0_';
    letters = Array.from(poem.text);
    count = motion?.matches ? letters.length : 0;
    startedAt = now();
    phase('typing', motion?.matches ? 'hidden' : 'typing');
    render();
    if (motion?.matches) hold();
    else later(100, type);
  }
  function visibility() {
    if (!active) return;
    if (doc.hidden) {
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
    count = letters.length;
    render();
    hold();
  }
  doc.addEventListener('visibilitychange', visibility);
  motion?.addEventListener('change', motionChange);
  return {
    start() {
      if (disposed || active) return;
      active = true;
      pausedAt = now();
      next();
    },
    destroy() {
      active = false;
      disposed = true;
      clear();
      doc.removeEventListener('visibilitychange', visibility);
      motion?.removeEventListener('change', motionChange);
      phase('idle', 'hidden');
    }
  };
}

/** Runs before the app bundle: slow first visits get the same poem animation. */
export function bootstrapLoadingPoem(poems, createPlayer) {
  const doc = document;
  let player;
  let delay;
  let watchdog;
  let done = false;
  const observer = new MutationObserver(attach);
  function attach() {
    if (done || player || delay !== undefined) return;
    const root = doc.querySelector('.site-loading [data-poem-player]');
    if (!root) return;
    observer.disconnect();
    delay = setTimeout(() => {
      delay = undefined;
      if (done) return;
      player = createPlayer({ root, poems });
      player.start();
    }, 180);
  }
  function finish() {
    done = true;
    observer.disconnect();
    clearTimeout(delay);
    clearTimeout(watchdog);
    player?.destroy();
    doc.documentElement.classList.remove('site-boot-loading');
    doc.removeEventListener('site-loading-ready', finish);
  }
  doc.documentElement.classList.add('site-boot-loading');
  doc.addEventListener('site-loading-ready', finish, { once: true });
  observer.observe(doc.documentElement, { childList: true, subtree: true });
  attach();
  // Only a broken app startup needs this fallback; normal loads finish immediately.
  watchdog = setTimeout(finish, 180000);
}
