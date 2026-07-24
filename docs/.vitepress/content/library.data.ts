import { createContentLoader } from "vitepress";
import {
  normalizeLibraryPages,
  type LibraryItem,
  type LibrarySourcePage
} from "./library";

export function transformLibraryPages(pages: LibrarySourcePage[]) {
  return normalizeLibraryPages(pages);
}

export default createContentLoader("**/*.md", {
  transform(pages) {
    return transformLibraryPages(pages as LibrarySourcePage[]);
  }
});

declare const data: LibraryItem[];
export { data };
