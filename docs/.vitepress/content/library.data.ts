import { fileURLToPath } from "node:url";
import { validateLibraryContent } from "../../../scripts/lib/content-library.mjs";
import { normalizeLibraryPages, type LibraryItem, type LibrarySourcePage } from "./library";
export function transformLibraryPages(pages: LibrarySourcePage[]) { return normalizeLibraryPages(pages); }
const root = fileURLToPath(new URL("../../..", import.meta.url));
export default {
  watch: ["notes", "prompt-collection", "excerpts"].map(section =>
    fileURLToPath(new URL(`../../${section}/**/*.md`, import.meta.url))
  ),
  load() {
    const { records, errors } = validateLibraryContent(root);
    if (errors.length) throw new Error(errors.join("\n"));
    return transformLibraryPages(records);
  }
};
declare const data: LibraryItem[];
export { data };
