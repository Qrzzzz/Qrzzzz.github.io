import { existsSync, mkdirSync, renameSync, rmSync } from "node:fs";
import path from "node:path";
import { randomUUID } from "node:crypto";

export function removeStage(stage, parent) {
  if (path.dirname(path.resolve(stage)) !== path.resolve(parent)) throw new Error("Unsafe staging cleanup");
  rmSync(stage, { recursive: true, force: true });
}

// Sources are fully validated before this transaction starts. Backups stay on
// each destination volume; if rollback itself fails they are retained for recovery.
export function replaceStagedPaths(entries, rename = renameSync) {
  const paths = entries.map(({ source, target }) => ({ source: path.resolve(source), target: path.resolve(target) }));
  for (const entry of paths) {
    if (!existsSync(entry.source) || entry.target === path.parse(entry.target).root ||
        entry.source === entry.target || entry.source.startsWith(entry.target + path.sep) ||
        entry.target.startsWith(entry.source + path.sep)) throw new Error("Unsafe staged replacement");
  }
  if (new Set(paths.map(x => x.target.toLowerCase())).size !== paths.length) throw new Error("Duplicate output target");
  for (const a of paths) for (const b of paths) {
    if (a !== b && a.target.toLowerCase().startsWith(b.target.toLowerCase() + path.sep)) throw new Error("Overlapping output targets");
  }
  const changed = [];
  try {
    for (const { source, target } of paths) {
      mkdirSync(path.dirname(target), { recursive: true });
      const backup = path.join(path.dirname(target), `.${path.basename(target)}.backup-${randomUUID()}`);
      const state = { target, backup, saved: false, installed: false };
      changed.push(state);
      if (existsSync(target)) { rename(target, backup); state.saved = true; }
      rename(source, target);
      state.installed = true;
    }
  } catch (error) {
    const recoveryErrors = [];
    for (const state of changed.reverse()) {
      try {
        if (state.installed) rmSync(state.target, { recursive: true, force: true });
        if (state.saved) renameSync(state.backup, state.target);
      } catch (recovery) { recoveryErrors.push(`${state.backup}: ${recovery.message}`); }
    }
    if (recoveryErrors.length) throw new Error(`${error.message}\nRecovery backups retained:\n${recoveryErrors.join("\n")}`);
    throw error;
  }
  for (const state of changed) if (state.saved) {
    // Successful output is usable even if antivirus temporarily locks a backup.
    try { rmSync(state.backup, { recursive: true, force: true }); }
    catch { console.warn(`Retained completed import backup: ${state.backup}`); }
  }
}
