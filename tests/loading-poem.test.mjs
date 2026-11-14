import assert from 'node:assert/strict';
import test from 'node:test';
import fs from 'node:fs';
import { loadingPoems } from '../docs/.vitepress/theme/loadingPoems.mjs';
import { sitePoems } from '../docs/.vitepress/theme/sitePoems.mjs';
import { createLoadingPoemPlayer } from '../docs/.vitepress/theme/loadingPoemRuntime.mjs';

function harness({ random = () => 0, reduced = false, poems = sitePoems, ...options } = {}) {
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
  const root = { ownerDocument: doc, dataset: {}, querySelector(selector) { return selector.includes('ghost') ? ghost : selector.includes('text') ? text : null; } };
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

test('the full text stays intact until the reading interval selects another work', () => {
  const h = harness(); h.player.start();
  const first = h.root.dataset.poemId;
  assert.equal(h.text.textContent, loadingPoems[0].text);
  assert.equal(h.ghost.textContent, h.text.textContent);
  h.tick(29999); assert.equal(h.root.dataset.poemId, first);
  h.tick(1); assert.notEqual(h.root.dataset.poemId, first);
  h.player.destroy(); assert.equal(h.tasks.size, 0); assert.equal(h.listeners.size, 0);
});

test('every poem can be randomly chosen without repeated consecutive selections', () => {
  for (let i = 0; i < sitePoems.length; i++) {
    const h = harness({ random: () => (i + .5) / sitePoems.length }); h.player.start();
    assert.equal(h.root.dataset.poemId, String(sitePoems[i].id));
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
  assert.equal(h.root.dataset.phase, 'holding');
  h.tick(30000); assert.equal(h.root.dataset.poemId, '2');
  assert.equal(h.text.textContent, loadingPoems[1].text);
  h.player.destroy();
});

test('switching motion preference mid-stream finishes the text and keeps the 30-second boundary', () => {
  const h = harness(); h.player.start(); h.tick(200);
  h.motion.matches = true; h.motion.change();
  assert.equal(h.text.textContent, loadingPoems[0].text);
  assert.equal(h.root.dataset.phase, 'holding');
  h.tick(29800); assert.equal(h.root.dataset.poemId, '2');
  h.player.destroy();
});

const homeCollection = JSON.parse(fs.readFileSync(new URL('../docs/.vitepress/theme/homePoems.json', import.meta.url), 'utf8'));
test('homepage collection preserves 200 distinct original works and attribution', () => {
  assert.equal(homeCollection.author, 'GPT-6 Astra');
  assert.equal(homeCollection.items.length, 200);
  assert.equal(new Set(homeCollection.items.map(p => p.text.replace(/\s/gu, ''))).size, 200);
  assert.deepEqual(homeCollection.items.map(p => p.id), Array.from({length: 200}, (_, i) => `home-${String(i + 1).padStart(3, '0')}`));
  assert.equal(homeCollection.items.filter(p => p.lang === 'en').length, 80);
  assert.ok(homeCollection.items.every(p => ['verse', 'prose'].includes(p.form) && ['en', 'zh-CN'].includes(p.lang)));
});

test('homepage reveals, freezes across overlapping user/background pauses and changes at 60 active seconds', () => {
  const h = harness({ poems: homeCollection.items, cycleMs: 60000, shuffle: true });
  h.player.start(); h.tick(5000);
  const first = h.root.dataset.poemId;
  const full = h.text.textContent;
  h.player.pause(); h.tick(120000);
  h.visibility(true); h.player.pause(false); h.tick(120000);
  assert.equal(h.text.textContent, full);
  h.visibility(false); h.tick(54999);
  assert.equal(h.root.dataset.phase, 'holding');
  h.tick(1); assert.notEqual(h.root.dataset.poemId, first);
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

test('404 cycles through the complete multi-model collection without repeats or changing the loader selection', () => {
  const poems = sitePoems;
  assert.equal(poems.length, 350);
  assert.equal(new Set(poems.map(poem => String(poem.id))).size, poems.length);
  const h = harness({ poems, cycleMs: 60000, shuffle: true, reduced: true });
  h.doc.documentElement.dataset.loadingLastPoem = '24';
  h.player.start();
  const ids = new Set();
  for (let i = 0; i < poems.length; i++) {
    ids.add(h.root.dataset.poemId);
    h.tick(60000);
  }
  assert.equal(ids.size, poems.length);
  assert.equal(h.doc.documentElement.dataset.loadingLastPoem, '24');
  h.player.destroy();
  assert.equal(h.tasks.size, 0);
});

test('Next selects another complete poem and pause freezes the reading interval', () => {
  const h = harness({ poems: homeCollection.items, cycleMs: 60000, shuffle: true });
  h.player.start(); h.tick(200);
  h.player.pause(); const partial = h.text.textContent; h.tick(5000);
  assert.equal(h.text.textContent, partial);
  h.player.pause(false); h.tick(5000);
  const full = h.text.textContent;
  const id = h.root.dataset.poemId;
  h.player.next(); h.player.next();
  assert.notEqual(h.root.dataset.poemId, id);
  h.tick(5000); assert.notEqual(h.root.dataset.poemId, id);
  h.player.destroy();
});

test('all surfaces share uniquely identified works with model-specific attribution', () => {
  assert.equal(new Set(sitePoems.map(poem => poem.text)).size, sitePoems.length);
  assert.deepEqual(Object.fromEntries([...new Set(sitePoems.map(p => p.model))].map(model => [model, sitePoems.filter(p => p.model === model).length])), { 'GPT-6 Astra': 250, 'Gemini 4 Argon': 50, 'Claude Opus 4.6': 50 });
  const imported = JSON.parse(fs.readFileSync(new URL('../docs/.vitepress/theme/contributedPoems.json', import.meta.url), 'utf8'));
  assert.deepEqual(sitePoems.slice(-imported.length).map(({model,url,text}) => ({model,url,text})), imported);
  const h = harness({ reduced: true });
  const author = { textContent: '', setAttribute(_, value) { this.href = value; } };
  const query = h.root.querySelector;
  h.root.querySelector = selector => selector.includes('author') ? author : query(selector);
  const player = createLoadingPoemPlayer({ root: h.root, poems: sitePoems, random: () => .99 });
  player.start();
  const poem = sitePoems.find(p => String(p.id) === h.root.dataset.poemId);
  assert.equal(author.textContent, poem.model);
  assert.equal(author.href, poem.url);
  player.destroy(); h.player.destroy();
});
