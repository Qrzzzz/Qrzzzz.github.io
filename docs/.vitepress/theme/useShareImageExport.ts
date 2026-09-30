import { computed, nextTick, onBeforeUnmount, ref, watch } from "vue";
import { useData } from "vitepress";
import { createShareQrCode, embedShareResources, loadShareImageAssets, prepareShareResources } from "./shareImageResources";
import { SHARE_IMAGE_CHARACTER_LIMIT, SHARE_IMAGE_FORMAT, createShareImageFilename, extractLongformContent, measureLongformHeight, snapshotShareImagePalette, withExportTimeout } from "./shareImageRuntime.mjs";

export type ShareImageDocument = {
  title: string; html: string; metadataHtml: string; attributionHtml: string;
  href: string; domain: string; truncated: boolean; characterCount: number;
};

export function useShareImageExport(pageKind: () => "article" | "excerpt", getElement: () => HTMLElement | undefined) {
  const { frontmatter, page, isDark } = useData();
  const truncate = ref(false);
  const phase = ref<"idle" | "preparing" | "ready" | "error">("idle");
  const rendering = computed(() => phase.value === "preparing");
  const preparedImage = ref<Blob>();
  const copying = ref(false);
  const copyButton = ref<HTMLButtonElement>();
  const exportPalette = ref<Record<string, string>>({});
  const exportContent = ref<ShareImageDocument>();
  const qrCode = ref<{ src: string; size: number }>();
  const statusMessage = ref("");
  const statusTone = ref<"neutral" | "success" | "error">("neutral");
  let generation = 0;
  let preparedFilename = "";

  function resetExport() {
    generation++;
    phase.value = "idle";
    preparedImage.value = undefined;
    preparedFilename = "";
    copying.value = false;
    exportContent.value = undefined;
    qrCode.value = undefined;
    statusMessage.value = "";
    statusTone.value = "neutral";
  }
  watch([() => page.value.relativePath, truncate], resetExport);
  onBeforeUnmount(resetExport);

  async function prepareImage() {
    if (rendering.value || copying.value) return;
    resetExport();
    const current = generation;
    const isCurrent = () => current === generation;
    phase.value = "preparing";
    let stage = "content";
    statusMessage.value = "Preparing image…";
    try {
      const palette = snapshotShareImagePalette(getComputedStyle(document.documentElement));
      exportPalette.value = palette;
      const kind = pageKind();
      const title = frontmatter.value.title || page.value.title;
      const dark = isDark.value;
      const canonical = document.querySelector<HTMLLinkElement>('link[rel="canonical"]')?.href;
      const href = new URL(canonical || window.location.href);
      href.hash = "";
      const content = extractLongformContent(document.querySelector<HTMLElement>(".vp-doc"), title, kind, new Map(), {
        collectResources: true, separateMetadata: true,
        limit: truncate.value ? SHARE_IMAGE_CHARACTER_LIMIT : 0
      });
      stage = "diagrams and formulas";
      statusMessage.value = "Preparing diagrams and formulas…";
      const [images, qr] = await withExportTimeout(Promise.all([
        prepareShareResources(content.resources, palette, dark, isCurrent), createShareQrCode(href.href)
      ]), 30000);
      if (!isCurrent()) return;
      exportContent.value = {
        title: content.title,
        html: embedShareResources(content.html, images),
        metadataHtml: embedShareResources(content.metadataHtml, images),
        attributionHtml: embedShareResources(content.attributionHtml, images),
        href: href.href, domain: href.host,
        truncated: content.truncated, characterCount: content.characterCount
      };
      qrCode.value = qr;
      await nextTick();
      const element = getElement();
      if (!isCurrent()) return;
      if (!element) throw new Error("The image layout is unavailable");
      stage = "fonts and images";
      statusMessage.value = "Loading fonts and images…";
      await loadShareImageAssets(element);
      if (!isCurrent()) return;
      stage = "image rendering";
      statusMessage.value = "Rendering image…";
      const height = measureLongformHeight(element);
      const { domToBlob } = await withExportTimeout(import("modern-screenshot"));
      if (!isCurrent()) return;
      const blob = await withExportTimeout(domToBlob(element, {
        backgroundColor: palette["--share-canvas"], width: SHARE_IMAGE_FORMAT.width,
        height, scale: SHARE_IMAGE_FORMAT.scale,
        font: { preferredFormat: "woff2" }, timeout: 15000,
        fetch: { placeholderImage: () => { throw new Error("Article image could not be embedded"); } }
      }), 30000);
      if (!isCurrent()) return;
      if (!blob || !blob.size) throw new Error("The browser did not return image data");
      preparedImage.value = blob;
      preparedFilename = createShareImageFilename(kind === "excerpt" ? title : content.title, content.truncated);
      phase.value = "ready";
      statusMessage.value = content.truncated ? "Image prepared · opening section only. The QR code links to the full text." : "";
      await nextTick();
      if (isCurrent()) copyButton.value?.focus();
    } catch (error) {
      if (!isCurrent()) return;
      console.error(error);
      phase.value = "error";
      statusMessage.value = error instanceof Error && error.message.startsWith("Image is too tall")
        ? error.message : `Could not prepare ${stage}. Check the content and retry.`;
      statusTone.value = "error";
    } finally {
      if (isCurrent()) {
        exportContent.value = undefined;
        qrCode.value = undefined;
      }
    }
  }

  async function copyImage() {
    if (!preparedImage.value || copying.value) return;
    const current = generation;
    copying.value = true;
    try {
      if (!navigator.clipboard?.write || typeof ClipboardItem === "undefined") throw new Error("Clipboard unavailable");
      await navigator.clipboard.write([new ClipboardItem({ "image/png": preparedImage.value })]);
      if (current !== generation) return;
      statusMessage.value = "Image copied to clipboard.";
      statusTone.value = "success";
    } catch {
      if (current !== generation) return;
      statusMessage.value = "Could not copy the image. Retry or download it instead.";
      statusTone.value = "error";
    } finally { if (current === generation) copying.value = false; }
  }

  function downloadImage() {
    if (!preparedImage.value) return;
    const url = URL.createObjectURL(preparedImage.value);
    const anchor = document.createElement("a");
    anchor.download = preparedFilename;
    anchor.href = url;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
    statusMessage.value = "Image downloaded.";
    statusTone.value = "success";
  }
  return { truncate, rendering, preparedImage, copying, copyButton, exportPalette, exportContent, qrCode, statusMessage, statusTone, prepareImage, copyImage, downloadImage };
}
