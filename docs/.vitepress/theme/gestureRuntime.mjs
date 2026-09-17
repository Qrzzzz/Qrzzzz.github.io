import { sampleGesture, nearestPoint, limitPull, deformGesture, pointsPath } from './gestureGeometry.mjs';

/** Event-driven, bounded deformation. No idle animation and no scroll interception. */
export function createGestureRuntime({ host, svg, ink, hit, window: win, document: doc }) {
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  let points = [], width = 0, height = 0, frame = 0, last = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0, center = 0, targetCenter = 0;
  let drag = null, destroyed = false, zones = [];
  const removers = [];

  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    removers.push(() => target.removeEventListener(name, callback, options));
  }
  function draw() {
    let deformed = deformGesture(points, center, x, y, width <= 680 ? 125 : 200);
    // Navigation has its own stable space, including while pulling the curve.
    deformed = deformed.map((p, i) => {
      const original = points[i];
      let weight = 1;
      for (const r of zones) {
        const dx = Math.max(r.left - original.x, 0, original.x - r.right);
        const dy = Math.max(r.top - original.y, 0, original.y - r.bottom);
        weight = Math.min(weight, Math.min(1, Math.hypot(dx, dy) / 80));
      }
      return { x: original.x + (p.x - original.x) * weight, y: original.y + (p.y - original.y) * weight };
    });
    const d = pointsPath(deformed);
    ink.setAttribute('d', d);
    hit.setAttribute('d', d);
    host.dataset.gestureState = drag ? 'dragging' : frame ? 'settling' : 'idle';
  }
  function wake() {
    if (frame || destroyed || reduced.matches || doc.hidden || !width) return;
    frame = win.requestAnimationFrame(tick);
  }
  function tick(time) {
    frame = 0;
    const dt = Math.min(32, last ? time - last : 16);
    last = time;
    const alpha = 1 - Math.exp(-dt / (drag ? 48 : 105));
    x += (targetX - x) * alpha;
    y += (targetY - y) * alpha;
    center += (targetCenter - center) * alpha;
    const unsettled = Math.hypot(targetX - x, targetY - y) > .035 || Math.abs(targetCenter - center) > .08;
    if (unsettled) wake();
    else { x = targetX; y = targetY; center = targetCenter; last = 0; }
    draw();
  }
  function release(event) {
    if (event && drag && event.pointerId !== drag.id) return;
    const id = drag?.id;
    drag = null;
    if (id !== undefined && hit.hasPointerCapture?.(id)) hit.releasePointerCapture(id);
    targetX = targetY = 0;
    host.dataset.pulling = 'false';
    wake();
  }
  function reset() {
    release();
    if (frame) win.cancelAnimationFrame(frame);
    frame = last = x = y = targetX = targetY = 0;
    draw();
  }
  function resize() {
    reset();
    const r = host.getBoundingClientRect();
    width = r.width; height = r.height;
    if (!width || !height) return;
    points = sampleGesture(width, height);
    svg.setAttribute('viewBox', `0 0 ${width} ${height}`);
    zones = [...host.querySelectorAll('.home-entry')].map(el => {
      const z = el.getBoundingClientRect();
      return { left: z.left - r.left - 20, right: z.right - r.left + 20, top: z.top - r.top - 16, bottom: z.bottom - r.top + 16 };
    });
    draw();
    host.dataset.gestureReady = 'true';
  }
  function location(event) {
    const r = host.getBoundingClientRect();
    return { x: event.clientX - r.left, y: event.clientY - r.top };
  }
  function move(event) {
    if (reduced.matches || doc.hidden || !points.length) return;
    if (drag && event.pointerId !== drag.id) return;
    if (!drag && (event.pointerType === 'touch' || !fine.matches)) return;
    const p = location(event);
    if (drag) {
      const pull = limitPull(p.x - drag.x, p.y - drag.y, width <= 680 ? 76 : 112);
      targetX = pull.x; targetY = pull.y;
    } else {
      const nearest = nearestPoint(points, p.x, p.y);
      const strength = .32 * Math.max(0, 1 - nearest.distance / 100) ** 1.5;
      targetX = (p.x - nearest.point.x) * strength;
      targetY = (p.y - nearest.point.y) * strength;
      if (Math.hypot(x, y) < .1) center = nearest.point.distance;
      targetCenter = nearest.point.distance;
    }
    wake();
  }
  function down(event) {
    if (reduced.matches || !event.isPrimary || event.button !== 0 || drag) return;
    const p = location(event), nearest = nearestPoint(points, p.x, p.y);
    if (!nearest.point || nearest.distance > 30) return;
    drag = { id: event.pointerId, x: p.x, y: p.y };
    center = targetCenter = nearest.point.distance;
    targetX = targetY = 0;
    hit.setPointerCapture(event.pointerId);
    host.dataset.pulling = 'true';
    host.dataset.gestureState = 'dragging';
  }
  function focus(event) {
    const entry = event.target.closest?.('.home-entry');
    if (!entry || reduced.matches || !points.length) return;
    const r = entry.getBoundingClientRect(), h = host.getBoundingClientRect();
    const p = { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
    const nearest = nearestPoint(points, p.x, p.y);
    center = targetCenter = nearest.point.distance;
    const pull = limitPull((p.x - nearest.point.x) * .13, (p.y - nearest.point.y) * .13, 12);
    targetX = pull.x; targetY = pull.y;
    wake();
  }
  listen(host, 'pointermove', move, { passive: true });
  listen(host, 'pointerleave', () => { if (!drag) release(); });
  listen(hit, 'pointerdown', down);
  listen(hit, 'pointerup', release);
  listen(hit, 'pointercancel', release);
  listen(hit, 'lostpointercapture', release);
  listen(host, 'focusin', focus);
  listen(host, 'focusout', () => { if (!drag) release(); });
  listen(win, 'blur', reset);
  listen(doc, 'visibilitychange', reset);
  listen(reduced, 'change', reset);
  listen(fine, 'change', reset);
  const observer = new win.ResizeObserver(resize);
  observer.observe(host);
  doc.fonts?.ready.then(() => { if (!destroyed) resize(); });
  resize();
  return { destroy() {
    destroyed = true;
    reset(); observer.disconnect(); removers.forEach(remove => remove());
  } };
}
