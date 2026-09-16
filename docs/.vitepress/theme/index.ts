import DefaultTheme from "vitepress/theme";
import type { Theme } from "vitepress";
import Layout from "./Layout.vue";
import CatalogHeader from "./components/CatalogHeader.vue";
import MermaidDiagram from "./components/MermaidDiagram.vue";
import "./custom.css";

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component("CatalogHeader", CatalogHeader);
    app.component("MermaidDiagram", MermaidDiagram);
  }
} satisfies Theme;
