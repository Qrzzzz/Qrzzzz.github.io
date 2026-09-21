import { sampleGesture, projectOnGesture, limitPull, deformGesture, pointsPath } from './gestureGeometry.mjs';

/** Event-driven, bounded deformation. No idle animation and no scroll interception. */
export function createGestureRuntime({ host, svg, ink, hit, layers = /** @type {SVGPathElement[]} */ ([]), window: win, document: doc }) {
  const reduced = win.matchMedia('(prefers-reduced-motion: reduce)');
  const fine = win.matchMedia('(hover: hover) and (pointer: fine)');
  let points = [], width = 0, height = 0, frame = 0, last = 0;
  let x = 0, y = 0, targetX = 0, targetY = 0, center = 0, targetCenter = 0;
  let vx = 0, vy = 0, centerV = 0;
  let drag = null, destroyed = false, zones = [];
  const removers = [];

  function listen(target, name, callback, options) {
    target.addEventListener(name, callback, options);
    removers.push(() => target.removeEventListener(name, callback, options));
  }
  function draw() {
    let deformed = deformGesture(points, center, x, y, width <= 680 ? 110 : 175);
    // Navigation has its own stable space, including while pulling the curve.
    deformed = deformed.map((p, i) => {
      const original = points[i];
      let weight = 1;
      for (const r of zones) {
        const dx = Math.max(r.left - original.x, 0, original.x - r.right);
        const dy = Math.max(r.top - original.y, 0, original.y - r.bottom);
        const t = Math.min(1, Math.hypot(dx, dy) / 140);
        weight = Math.min(weight, .18 + .82 * t * t * (3 - 2 * t));
      }
      return { x: original.x + (p.x - original.x) * weight, y: original.y + (p.y - original.y) * weight };
    });
    const d = pointsPath(deformed);
    for (const layer of layers) layer?.setAttribute('d', d);
    ink.setAttribute('d', d);
    hit.setAttribute('d', d);
    host.dataset.gestureState = drag ? 'dragging' : frame ? 'settling' : 'idle';
  }
  function wake() {
    if (frame || destroyed || reduced.matches || doc.hidden || !width) return;
    frame = win.requestAnimationFrame(tick);
  }
  function criticalStep(value, velocity, target, omega, dt) {
    const offset = value - target;
    const c = velocity + omega * offset;
    const decay = Math.exp(-omega * dt);
    return {
      value: target + (offset + c * dt) * decay,
      velocity: (velocity - omega * c * dt) * decay
    };
  }
  function tick(time) {
    frame = 0;
    const dtMs = Math.min(32, last ? time - last : 16);
    const dt = dtMs / 1000;
    last = time;
    if (drag) {
      // Pointer motion should feel attached, not filtered through a slow spring.
      const pullAlpha = 1 - Math.exp(-dtMs / 10);
      const centerAlpha = 1 - Math.exp(-dtMs / 18);
      x += (targetX - x) * pullAlpha;
      y += (targetY - y) * pullAlpha;
      center += (targetCenter - center) * centerAlpha;
      vx = vy = centerV = 0;
    } else {
      const omega = targetX || targetY ? 22 : 18;
      const sx = criticalStep(x, vx, targetX, omega, dt);
      const sy = criticalStep(y, vy, targetY, omega, dt);
      const sc = criticalStep(center, centerV, targetCenter, 24, dt);
      x = sx.value; vx = sx.velocity;
      y = sy.value; vy = sy.velocity;
      center = sc.value; centerV = sc.velocity;
    }
    const unsettled =
      Math.hypot(targetX - x, targetY - y) > .035 ||
      Math.abs(targetCenter - center) > .08 ||
      Math.hypot(vx, vy) > .05 ||
      Math.abs(centerV) > .08;
    if (unsettled) wake();
    else {
      x = targetX; y = targetY; center = targetCenter;
      vx = vy = centerV = 0;
      last = 0;
    }
    draw();
  }
  function release(event) {
    if (event && drag && event.pointerId !== drag.id) return;
    const id = drag?.id;
    drag = null;
    if (id !== undefined && hit.hasPointerCapture?.(id)) hit.releasePointerCapture(id);
    targetX = targetY = 0;
    vx = vy = centerV = 0;
    host.dataset.pulling = 'false';
    wake();
  }
  function reset() {
    release();
    if (frame) win.cancelAnimationFrame(frame);
    frame = last = x = y = targetX = targetY = vx = vy = centerV = 0;
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
      const dx = p.x - drag.x, dy = p.y - drag.y;
      const tangential = dx * drag.tx + dy * drag.ty;
      const slideLimit = width <= 680 ? 58 : 96;
      const slide = Math.max(-slideLimit, Math.min(slideLimit, tangential * .34));
      const pull = limitPull(
        dx - drag.tx * slide,
        dy - drag.ty * slide,
        width <= 680 ? 82 : 124
      );
      targetX = drag.baseX + pull.x;
      targetY = drag.baseY + pull.y;
      targetCenter = Math.max(0, Math.min(points.at(-1)?.distance ?? drag.grabS, drag.grabS + slide));
    } else {
      const projection = projectOnGesture(points, p.x, p.y);
      const strength = .22 * Math.max(0, 1 - projection.distance / 82) ** 1.7;
      targetX = (p.x - projection.point.x) * strength;
      targetY = (p.y - projection.point.y) * strength;
      if (Math.hypot(x, y) < .1) center = projection.arcLength;
      targetCenter = projection.arcLength;
    }
    wake();
  }
  function down(event) {
    if (reduced.matches || !event.isPrimary || event.button !== 0 || drag) return;
    const p = location(event), projection = projectOnGesture(points, p.x, p.y);
    if (!projection.point || projection.distance > 30) return;
    const i = Math.max(1, Math.min(points.length - 2, projection.segment + 1));
    const before = points[i - 1], after = points[i + 1];
    const length = Math.hypot(after.x - before.x, after.y - before.y) || 1;
    drag = {
      id: event.pointerId,
      x: p.x,
      y: p.y,
      grabS: projection.arcLength,
      tx: (after.x - before.x) / length,
      ty: (after.y - before.y) / length,
      baseX: x,
      baseY: y
    };
    center = targetCenter = projection.arcLength;
    targetX = x;
    targetY = y;
    vx = vy = centerV = 0;
    hit.setPointerCapture(event.pointerId);
    host.dataset.pulling = 'true';
    host.dataset.gestureState = 'dragging';
  }
  function focus(event) {
    const entry = event.target.closest?.('.home-entry');
    if (!entry || reduced.matches || !points.length) return;
    const r = entry.getBoundingClientRect(), h = host.getBoundingClientRect();
    const p = { x: r.left - h.left + r.width / 2, y: r.top - h.top + r.height / 2 };
    const projection = projectOnGesture(points, p.x, p.y);
    center = targetCenter = projection.arcLength;
    const pull = limitPull((p.x - projection.point.x) * .13, (p.y - projection.point.y) * .13, 12);
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
