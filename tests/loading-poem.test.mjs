import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadingPoems } from '../docs/.vitepress/theme/loadingPoems.mjs';
import { createLoadingPoemPlayer } from '../docs/.vitepress/theme/loadingPoemRuntime.mjs';

function harness({ random = () => 0, reduced = false, poems = loadingPoems, ...options } = {}) {
  let time = 0;
  let id = 0;
  const tasks = new Map();
  const listeners = new Map();
  const motion = { matches: reduced, addEventListener(_, fn) { this.change = fn; }, removeEventListener() { this.change = undefined; } };
  const doc = {
    hidden: false, documentElement: { dataset: {} },
    defaultView: { matchMedia: () => motion },
    addEventListener(type, fn) { listeners.set(type, fn); },
    removeEventListener(type) { listeners.delete(type); }
  };
  const ghost = { textContent: '' };
  const text = { textContent: '' };
  const root = { ownerDocument: doc, dataset: {}, querySelector(selector) { return selector.includes('ghost') ? ghost : text; } };
  const player = createLoadingPoemPlayer({ root, poems, random, ...options, now: () => time,
    schedule(fn, delay) { tasks.set(++id, { fn, due: time + delay }); return id; },
    cancel(timer) { tasks.delete(timer); }
  });
  function tick(milliseconds) {
    const end = time + milliseconds;
    let iterations = 0;
    while (true) {
      const entry = [...tasks].sort((a, b) => a[1].due - b[1].due)[0];
      if (!entry || entry[1].due > end) break;
      assert.ok(++iterations < 10000, 'timer loop must be bounded');
      time = entry[1].due; tasks.delete(entry[0]); entry[1].fn();
    }
    time = end;
  }
  return { root, doc, text, ghost, player, tasks, listeners, motion, tick,
    visibility(hidden) { doc.hidden = hidden; listeners.get('visibilitychange')?.(); }
  };
}

test('all 50 source works retain language, prose and authored verse breaks', () => {
  assert.equal(loadingPoems.length, 50);
  assert.equal(new Set(loadingPoems.map(p => p.text)).size, 50);
  assert.deepEqual(loadingPoems.map(p => p.id), Array.from({ length: 50 }, (_, i) => i + 1));
  assert.equal(loadingPoems.filter(p => p.lang === 'zh-CN').length, 36);
  assert.equal(loadingPoems.filter(p => p.lang === 'en').length, 14);
  assert.ok(loadingPoems.every(p => (p.form === 'verse') === p.text.includes('\n')));
  assert.equal(loadingPoems[0].text, '砚底留余墨，\n窗前少一人。\n闲将空处看，\n未必尽无痕。');
  assert.equal(loadingPoems[49].text, 'She sets out three cups, then puts one back. The afternoon is still ahead of us; already, it has a different shape.');
});

test('streaming retains geometry, blinks briefly, and reverses at 30 seconds before a different poem', () => {
  const h = harness(); h.player.start();
  const first = h.root.dataset.poemId;
  const ghost = h.ghost.textContent;
  assert.equal(h.text.textContent, '');
  h.tick(200); assert.ok(h.text.textContent.length > 0 && h.text.textContent.length < loadingPoems[0].text.length);
  assert.equal(h.ghost.textContent, ghost);
  h.tick(1000); assert.equal(h.root.dataset.phase, 'settling');
  assert.equal(h.root.dataset.cursor, 'blinking');
  assert.equal(h.text.textContent, loadingPoems[0].text);
  h.tick(2200); assert.equal(h.root.dataset.cursor, 'hidden');
  h.tick(26599); assert.equal(h.root.dataset.phase, 'holding');
  const complete = h.text.textContent;
  h.tick(1); assert.equal(h.root.dataset.phase, 'erasing');
  assert.equal(h.text.textContent, Array.from(complete).slice(0, -1).join(''));
  h.tick(1000); assert.notEqual(h.root.dataset.poemId, first);
  h.player.destroy(); assert.equal(h.tasks.size, 0); assert.equal(h.listeners.size, 0);
});

test('every poem can be randomly chosen without repeated consecutive selections', () => {
  for (let i = 0; i < 50; i++) {
    const h = harness({ random: () => (i + .5) / 50 }); h.player.start();
    assert.equal(Number(h.root.dataset.poemId), i + 1);
    const first = h.root.dataset.poemId;
    h.tick(34000); assert.notEqual(h.root.dataset.poemId, first);
    h.player.destroy();
  }
});

test('hidden tabs pause the stream and reading interval, and disposal prevents late updates', () => {
  const h = harness(); h.player.start(); h.tick(400);
  const text = h.text.textContent;
  h.visibility(true); h.tick(90000); assert.equal(h.text.textContent, text); assert.equal(h.tasks.size, 0);
  h.visibility(false); h.tick(3000); assert.equal(h.root.dataset.phase, 'holding');
  assert.equal(h.root.dataset.poemId, '1');
  h.player.destroy(); const final = h.text.textContent; h.tick(120000);
  assert.equal(h.text.textContent, final); assert.equal(h.tasks.size, 0);
});

test('reduced motion shows complete text and changes it without typing or cursor flicker', () => {
  const h = harness({ reduced: true }); h.player.start();
  assert.equal(h.text.textContent, loadingPoems[0].text);
  assert.equal(h.root.dataset.cursor, 'hidden');
  h.tick(30000); assert.equal(h.root.dataset.poemId, '2');
  assert.equal(h.text.textContent, loadingPoems[1].text);
  h.player.destroy();
});

test('switching motion preference mid-stream finishes the text and keeps the 30-second boundary', () => {
  const h = harness(); h.player.start(); h.tick(200);
  h.motion.matches = true; h.motion.change();
  assert.equal(h.text.textContent, loadingPoems[0].text);
  assert.equal(h.root.dataset.cursor, 'hidden');
  h.tick(29800); assert.equal(h.root.dataset.poemId, '2');
  h.player.destroy();
});

const homeCollection = JSON.parse(fs.readFileSync(new URL('../docs/.vitepress/theme/homePoems.json', import.meta.url), 'utf8'));
test('homepage collection preserves 200 distinct original works and attribution', () => {
  assert.equal(homeCollection.author, '6 Astra');
  assert.equal(homeCollection.items.length, 200);
  assert.equal(new Set(homeCollection.items.map(p => p.text.replace(/\s/gu, ''))).size, 200);
  assert.deepEqual(homeCollection.items.map(p => p.id), Array.from({length: 200}, (_, i) => `home-${String(i + 1).padStart(3, '0')}`));
  assert.equal(homeCollection.items.filter(p => p.lang === 'en').length, 80);
  assert.ok(homeCollection.items.every(p => ['verse', 'prose'].includes(p.form) && ['en', 'zh-CN'].includes(p.lang)));
});

test('homepage streams, freezes across overlapping user/background pauses and retracts at 60 active seconds', () => {
  const h = harness({ poems: homeCollection.items, cycleMs: 60000, shuffle: true });
  h.player.start(); h.tick(5000);
  const first = h.root.dataset.poemId;
  const full = h.text.textContent;
  h.player.pause(); h.tick(120000);
  h.visibility(true); h.player.pause(false); h.tick(120000);
  assert.equal(h.text.textContent, full);
  h.visibility(false); h.tick(54999);
  assert.equal(h.root.dataset.phase, 'holding');
  h.tick(1); assert.equal(h.root.dataset.phase, 'erasing');
  assert.equal(h.text.textContent, Array.from(full).slice(0, -1).join(''));
  h.tick(5000); assert.notEqual(h.root.dataset.poemId, first);
  h.player.destroy(); assert.equal(h.tasks.size, 0);
});

test('homepage exhausts its shuffle bag before repeating and leaves loader state independent', () => {
  const h = harness({ poems: homeCollection.items, cycleMs: 60000, shuffle: true, reduced: true });
  h.doc.documentElement.dataset.loadingLastPoem = '50';
  h.player.start();
  const ids = new Set();
  for (let i = 0; i < 200; i++) { ids.add(h.root.dataset.poemId); h.tick(60000); }
  assert.equal(ids.size, 200);
  assert.equal(h.doc.documentElement.dataset.loadingLastPoem, '50');
  h.player.destroy();
});

test('Next retracts the current poem, tolerates repeated clicks and pause freezes typing', () => {
  const h = harness({ poems: homeCollection.items, cycleMs: 60000, shuffle: true });
  h.player.start(); h.tick(200);
  h.player.pause(); const partial = h.text.textContent; h.tick(5000);
  assert.equal(h.text.textContent, partial);
  h.player.pause(false); h.tick(5000);
  const full = h.text.textContent;
  const id = h.root.dataset.poemId;
  h.player.next(); h.player.next();
  assert.equal(h.text.textContent, Array.from(full).slice(0, -1).join(''));
  h.tick(5000); assert.notEqual(h.root.dataset.poemId, id);
  h.player.destroy();
});
