import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import CatalogHeader from "./components/CatalogHeader.vue";
import ArticleHeader from "./components/ArticleHeader.vue";
import MermaidDiagram from "./components/MermaidDiagram.vue";
import FadeContent from "./effects/FadeContent.vue";
import CatalogList from "./components/CatalogList.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("CatalogHeader", CatalogHeader);
    app.component("FadeContent", FadeContent);
    app.component("CatalogList", CatalogList);
    app.component("ArticleHeader", ArticleHeader);
    app.component("MermaidDiagram", MermaidDiagram);
  }
} satisfies Theme;
