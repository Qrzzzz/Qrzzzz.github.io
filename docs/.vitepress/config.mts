import { defineConfig } from "vitepress";

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
    ["meta", { name: "theme-color", content: "#6b6fe8" }],
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

  markdown: {
    lineNumbers: true
  },

  themeConfig: {
    siteTitle: "Qrzzzz",

    nav: [
      { text: "首页", link: "/" },
      { text: "文档", link: "/guide/" },
      { text: "文章", link: "/notes/" },
      { text: "项目", link: "/projects/" },
      { text: "关于", link: "/about" }
    ],

    sidebar: {
      "/guide/": [
        {
          text: "文档",
          items: [
            {
              text: "文档概览",
              link: "/guide/"
            },
            {
              text: "维护这个网站",
              link: "/guide/getting-started"
            }
          ]
        }
      ],

      "/notes/": [
        {
          text: "文章",
          items: [
            {
              text: "文章归档",
              link: "/notes/"
            },
            {
              text: "为什么要有这个网站",
              link: "/notes/why-this-site"
            }
          ]
        }
      ],

      "/projects/lyrics-card-generator/": [
        {
          text: "lyrics-card-generator",
          items: [
            {
              text: "项目概览",
              link: "/projects/lyrics-card-generator/"
            },
            {
              text: "在线版",
              link: "https://qrzzzz.github.io/lyrics-card-generator/"
            },
            {
              text: "源代码",
              link: "https://github.com/Qrzzzz/lyrics-card-generator"
            },
            {
              text: "发布文档",
              collapsed: false,
              items: [
                {
                  text: "文档首页",
                  link: "/projects/lyrics-card-generator/docs/"
                },
                {
                  text: "桌面端维护",
                  link: "/projects/lyrics-card-generator/docs/desktop/"
                },
                {
                  text: "示例内容维护",
                  link: "/projects/lyrics-card-generator/docs/examples/"
                },
                {
                  text: "版本说明",
                  link: "/projects/lyrics-card-generator/docs/releases/"
                }
              ]
            }
          ]
        }
      ]
    },

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
      label: "页内目录",
      level: [2, 3]
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
      message: "Qrzzzz · 写清楚，留得住。",
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
