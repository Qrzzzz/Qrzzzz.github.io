import { loadingPoems } from "./loadingPoems.mjs";
import homeCollection from "./homePoems.json" with { type: "json" };
import contributed from "./contributedPoems.json" with { type: "json" };

export const astraAuthor = { model: "GPT-6 Astra", url: "https://openai.com/index/gpt-6-astra/" };
// Keep original IDs and wording. Imported works need only model, url and text.
export const sitePoems = [
  ...[...loadingPoems, ...homeCollection.items].map(poem => ({ ...poem, ...astraAuthor })),
  ...contributed.map((poem, index) => ({
    ...poem,
    id: `contributed-${index + 1}`,
    lang: /[\p{Script=Han}]/u.test(poem.text) ? "zh-CN" : "en",
    form: poem.text.includes("\n") ? "verse" : "prose"
  }))
];
