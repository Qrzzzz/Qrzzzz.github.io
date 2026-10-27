import { loadingPoems } from "./loadingPoems.mjs";
import homeCollection from "./homePoems.json" with { type: "json" };

// One collection for first paint, client navigation and the 404 reading column.
// Retain the original IDs, wording, language and authored line breaks.
export const sitePoems = [...loadingPoems, ...homeCollection.items];
