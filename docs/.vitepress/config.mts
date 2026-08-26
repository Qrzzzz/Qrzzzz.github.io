import { defineConfig } from "vitepress";
import { fileURLToPath } from "node:url";
import { collectLibraryRecords } from "../../scripts/check-content-metadata.mjs";

const repositoryRoot = fileURLToPath(new URL("../..", import.meta.url));
const { records: libraryRecords } = collectLibraryRecords(repositoryRoot);
const libraryPager = new Map<
  string,
  {
    prev: false | { text: string; link: string };
    next: false | { text: string; link: string };
  }
>();

for (const kind of ["article", "prompt", "excerpt"]) {
  const items = libraryRecords
    .filter((record) => record.frontmatter.kind === kind)
    .sort((left, right) => {
      const leftDate =
        left.frontmatter.updated ?? left.frontmatter.published ?? "";
      const rightDate =
        right.frontmatter.updated ?? right.frontmatter.published ?? "";
      const dateOrder = String(rightDate).localeCompare(String(leftDate));
      return (
        dateOrder ||
        String(left.frontmatter.title).localeCompare(
          String(right.frontmatter.title),
          "zh-CN"
        )
      );
    });

  items.forEach((item, index) => {
    const navigationItem = (target: (typeof items)[number] | undefined) =>
      target
        ? {
            text:
              target.frontmatter.kind === "excerpt"
                ? String(target.frontmatter.preview)
                : String(target.frontmatter.title),
            link: target.url
          }
        : false;

    libraryPager.set(item.relativePath, {
      prev: navigationItem(items[index - 1]),
      next: navigationItem(items[index + 1])
    });
  });
}

function pageLanguage(value: unknown, relativePath = "") {
  if (typeof value === "string" && /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(value)) {
    return value;
  }

  const releaseLanguage = relativePath
    .replaceAll("\\", "/")
    .match(/\/releases\/v[^/]+\.(zh-CN|zh-TW|en|fr|ja|es)(?:\/index)?\.md$/i)?.[1];
  return releaseLanguage ?? "zh-CN";
}

export default defineConfig({
  lang: "zh-CN",
  title: "Qrzzzz",
  description: "Projects, tools, documentation, and writing by Cherry Chu.",

  // 用户主页仓库部署在域名根目录。
  base: "/",

  lastUpdated: true,

  sitemap: {
    hostname: "https://qrzzzz.github.io"
  },

  head: [
    [
      "script",
      { id: "sync-initial-theme-color" },
      `;(() => {
        let preference = "auto";
        try {
          preference = localStorage.getItem("vitepress-theme-appearance") || "auto";
        } catch {}
        const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
        const isDark = preference === "dark" || (preference !== "light" && prefersDark);
        document.documentElement.classList.toggle("dark", isDark);
        let themeColor = document.querySelector('meta[name="theme-color"]');
        if (!themeColor) {
          themeColor = document.createElement("meta");
          themeColor.setAttribute("name", "theme-color");
          document.head.appendChild(themeColor);
        }
        themeColor.setAttribute("content", isDark ? "#111214" : "#F5F4EF");
      })()`
    ],
    ["meta", { name: "color-scheme", content: "light dark" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Qrzzzz" }],
    ["meta", { name: "robots", content: "index, follow" }]
  ],

  transformPageData(pageData) {
    const sourcePath = pageData.relativePath
      .replace(/(^|\/)index\.md$/, "$1")
      .replace(/\.md$/, ".html");
    const pageUrl = new URL(sourcePath, "https://qrzzzz.github.io/").toString();
    const pageTitle = pageData.frontmatter.title || "Qrzzzz";
    const socialTitle =
      pageTitle === "Qrzzzz" ? "Qrzzzz" : `${pageTitle} · Qrzzzz`;
    const socialDescription =
      pageData.frontmatter.description ||
      "Projects, tools, documentation, and writing by Cherry Chu.";
    const pager = libraryPager.get(pageData.relativePath.replaceAll("\\", "/"));
    if (pager) {
      pageData.frontmatter.prev = pager.prev;
      pageData.frontmatter.next = pager.next;
    }

    pageData.frontmatter.head ??= [];
    pageData.frontmatter.head.push(
      ["meta", { property: "og:title", content: socialTitle }],
      ["meta", { property: "og:description", content: socialDescription }],
      ["meta", { property: "og:url", content: pageUrl }],
      ["link", { rel: "canonical", href: pageUrl }]
    );
  },

  transformHtml(code, _id, context) {
    const lang = pageLanguage(
      context.pageData.frontmatter.lang,
      context.pageData.relativePath
    );
    return code.replace(/<html lang="[^"]*"/, `<html lang="${lang}"`);
  },

  transformHead() {
    return [
      [
        "script",
        { id: "sync-site-theme-color" },
        `;(() => {
          const themeColor = document.querySelector('meta[name="theme-color"]');
          themeColor?.setAttribute(
            "content",
            document.documentElement.classList.contains("dark") ? "#111214" : "#F5F4EF"
          );
        })()`
      ]
    ];
  },

  markdown: {
    lineNumbers: false,
    codeCopyButtonTitle: "Copy code"
  },

  themeConfig: {
    siteTitle: "Qrzzzz",

    nav: [
      {
        text: "Docs",
        link: "/docs/",
        activeMatch:
          "^/(?:docs|guide)(?:/|$)|^/projects/[^/]+/docs(?:/|$)"
      },
      {
        text: "Works",
        link: "/works/",
        activeMatch:
          "^/(?:works|tools)(?:/|$)|^/projects/(?![^/]+/docs(?:/|$))"
      },
      {
        text: "Library",
        link: "/library/",
        activeMatch:
          "^/(?:library|notes|prompt-collection|excerpts)(?:/|$)"
      },
      {
        text: "About",
        link: "/about",
        activeMatch: "^/about(?:/|$)"
      }
    ],

    sidebar: {
      "/guide/": [
        {
          text: "Documentation",
          link: "/docs/"
        },
        {
          text: "Maintainer handbook",
          items: [
            { text: "Handbook home", link: "/guide/" },
            { text: "Local development and publishing", link: "/guide/getting-started" },
            { text: "Writing style guide", link: "/guide/writing-style" }
          ]
        }
      ],
      "/projects/lyrics-card-generator/docs/": [
        {
          text: "Lyrics Card Generator",
          items: [
            {
              text: "Documentation home",
              link: "/projects/lyrics-card-generator/docs/"
            },
            {
              text: "Desktop maintenance",
              link: "/projects/lyrics-card-generator/docs/desktop/"
            },
            {
              text: "Example content maintenance",
              link: "/projects/lyrics-card-generator/docs/examples/"
            },
            {
              text: "Release notes",
              link: "/projects/lyrics-card-generator/docs/releases/"
            },
            {
              text: "v5.1.0 P0 implementation plan",
              link:
                "/projects/lyrics-card-generator/docs/v5.1.0-p0-implementation-plan/"
            }
          ]
        }
      ]
    },
    aside: true,

    socialLinks: [
      {
        icon: "github",
        link: "https://github.com/Qrzzzz"
      }
    ],

    search: {
      provider: "local",
      options: {
        translations: {
          button: {
            buttonText: "Search the site…",
            buttonAriaLabel: "Search the site"
          },
          modal: {
            displayDetails: "Display detailed results",
            resetButtonTitle: "Clear search",
            backButtonTitle: "Close search",
            noResultsText: "No results found",
            footer: {
              selectText: "Open",
              selectKeyAriaLabel: "Enter key",
              navigateText: "Navigate",
              navigateUpKeyAriaLabel: "Up arrow",
              navigateDownKeyAriaLabel: "Down arrow",
              closeText: "Close",
              closeKeyAriaLabel: "Escape key"
            }
          }
        }
      }
    },

    outline: {
      label: "On this page",
      level: "deep"
    },

    docFooter: {
      prev: "Previous",
      next: "Next"
    },

    lastUpdated: {
      text: "Updated"
    },

    editLink: {
      pattern:
        "https://github.com/Qrzzzz/Qrzzzz.github.io/edit/main/docs/:path",
      text: "Edit this page"
    },

    footer: {
      message: '<a href="/about">Cherry Chu</a> · Projects, notes, and working documentation.',
      copyright: "© 2026 Qrzzzz"
    },

    darkModeSwitchLabel: "Appearance",
    lightModeSwitchTitle: "Switch to light theme",
    darkModeSwitchTitle: "Switch to dark theme",
    sidebarMenuLabel: "Menu",
    returnToTopLabel: "Return to top",
    skipToContentLabel: "Skip to content"
  }
});
