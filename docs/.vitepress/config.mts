import { defineConfig } from "vitepress";

function pageLanguage(value: unknown, relativePath = "") {
  if (typeof value === "string" && /^[a-z]{2,3}(?:-[a-z0-9]+)*$/i.test(value)) {
    return value;
  }

  const releaseLanguage = relativePath
    .replaceAll("\\", "/")
    .match(/\/releases\/v[^/]+\.(zh-CN|zh-TW|en|fr|ja|es)(?:\/index)?\.md$/i)?.[1];
  return releaseLanguage ?? "zh-CN";
}

function siteIndexSidebar() {
  return {
    text: "站点内容",
    items: [
      { text: "Library", link: "/library/" },
      { text: "文档", link: "/guide/" },
      { text: "文章", link: "/notes/" },
      { text: "Prompt Collection", link: "/prompt-collection/" },
      { text: "偶拾", link: "/excerpts/" },
      { text: "项目", link: "/projects/" }
    ]
  };
}

export default defineConfig({
  lang: "zh-CN",
  title: "Qrzzzz",
  description: "Qrzzzz 的文档、文章与公开项目。",

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
      pageData.frontmatter.description || "Qrzzzz 的文档、文章与公开项目。";

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
    codeCopyButtonTitle: "复制代码"
  },

  themeConfig: {
    siteTitle: "Qrzzzz",

    nav: [
      { text: "项目", link: "/projects/" },
      { text: "工具", link: "/tools/" },
      { text: "Library", link: "/library/" }
    ],

    sidebar: {
      "/guide/": [
        {
          text: "文档",
          items: [
            { text: "文档首页", link: "/guide/" },
            { text: "维护这个网站", link: "/guide/getting-started" }
          ]
        },
        siteIndexSidebar()
      ],
      "/notes/": [
        {
          text: "文章",
          items: [
            { text: "文章首页", link: "/notes/" },
            {
              text: "直到大厦崩塌：关于“赢”的谎言",
              link: "/notes/until-the-tower-falls"
            },
            { text: "为什么要有这个网站", link: "/notes/why-this-site" }
          ]
        },
        siteIndexSidebar()
      ],
      "/prompt-collection/": [
        {
          text: "Prompt Collection",
          items: [
            { text: "提示词首页", link: "/prompt-collection/" },
            {
              text: "复杂决策顾问",
              link: "/prompt-collection/rigorous-research-decision-assistant"
            },
            {
              text: "证据校准研究员",
              link: "/prompt-collection/maximum-rigor-research-analysis-assistant"
            },
            {
              text: "智能修图与互动涂鸦叠加",
              link: "/prompt-collection/smart-photo-retouching-interactive-doodle-overlays"
            },
            {
              text: "手绘教育信息图生成器",
              link: "/prompt-collection/hand-drawn-educational-infographic-generator"
            }
          ]
        },
        siteIndexSidebar()
      ],
      "/excerpts/": [
        {
          text: "偶拾",
          items: [
            { text: "偶拾首页", link: "/excerpts/" },
            {
              text: "拜托你一直鲜活……",
              link: "/excerpts/2026-07-17-01"
            },
            {
              text: "蝉真的是世界上最摇滚的生物了……",
              link: "/excerpts/2026-07-17-02"
            },
            {
              text: "棋局结束时，国王与卒子……",
              link: "/excerpts/2026-07-17-03"
            }
          ]
        },
        siteIndexSidebar()
      ],
      "/projects/": [
        {
          text: "项目",
          items: [
            { text: "项目首页", link: "/projects/" },
            {
              text: "Lyrics Card Generator",
              link: "/projects/lyrics-card-generator/"
            }
          ]
        },
        siteIndexSidebar()
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
            buttonText: "搜索全站内容…",
            buttonAriaLabel: "搜索全站内容"
          },
          modal: {
            displayDetails: "显示详细结果",
            resetButtonTitle: "清除搜索",
            backButtonTitle: "关闭搜索",
            noResultsText: "没有找到相关内容",
            footer: {
              selectText: "打开",
              selectKeyAriaLabel: "回车键",
              navigateText: "切换",
              navigateUpKeyAriaLabel: "向上箭头",
              navigateDownKeyAriaLabel: "向下箭头",
              closeText: "关闭",
              closeKeyAriaLabel: "Esc 键"
            }
          }
        }
      }
    },

    outline: {
      label: "页面导航",
      level: "deep"
    },

    docFooter: {
      prev: "上一篇",
      next: "下一篇"
    },

    lastUpdated: {
      text: "更新于"
    },

    editLink: {
      pattern:
        "https://github.com/Qrzzzz/Qrzzzz.github.io/edit/main/docs/:path",
      text: "编辑这页"
    },

    footer: {
      message: '<a href="/about">关于 Cherry Chu</a> · 写清楚，留得住。',
      copyright: "© 2026 Qrzzzz"
    },

    darkModeSwitchLabel: "外观",
    lightModeSwitchTitle: "切换到浅色模式",
    darkModeSwitchTitle: "切换到深色模式",
    sidebarMenuLabel: "目录",
    returnToTopLabel: "回到顶部",
    skipToContentLabel: "跳到正文"
  }
});
