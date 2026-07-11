import { defineConfig } from "vitepress";

export default defineConfig({
  lang: "zh-CN",
  title: "Qrzzzz",
  description: "Qrzzzz 的文档、文章、笔记与项目记录。",

  // 用户主页仓库部署在域名根目录。
  base: "/",

  lastUpdated: true,

  sitemap: {
    hostname: "https://qrzzzz.github.io"
  },

  head: [
    ["meta", { name: "theme-color", content: "#5f67ee" }],
    ["meta", { property: "og:type", content: "website" }],
    ["meta", { property: "og:site_name", content: "Qrzzzz" }],
    ["meta", { property: "og:title", content: "Qrzzzz" }],
    [
      "meta",
      {
        property: "og:description",
        content: "文档、文章、笔记与项目记录。"
      }
    ],
    [
      "meta",
      {
        property: "og:url",
        content: "https://qrzzzz.github.io"
      }
    ]
  ],

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
              text: "文档首页",
              link: "/guide/"
            },
            {
              text: "网站维护",
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
              text: "文章列表",
              link: "/notes/"
            },
            {
              text: "为什么建立这个网站",
              link: "/notes/why-this-site"
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
      provider: "local"
    },

    outline: {
      label: "本页目录",
      level: [2, 3]
    },

    docFooter: {
      prev: "上一篇",
      next: "下一篇"
    },

    lastUpdated: {
      text: "最后更新"
    },

    editLink: {
      pattern:
        "https://github.com/Qrzzzz/Qrzzzz.github.io/edit/main/docs/:path",
      text: "在 GitHub 上编辑此页"
    },

    footer: {
      message: "Built with VitePress and GitHub Pages.",
      copyright: "Copyright © 2026 Qrzzzz"
    }
  }
});
