const readmeProjects = Object.freeze([
  {
    slug: "lyrics-card-generator-android",
    repository: "Qrzzzz/lyrics-card-generator-android",
    title: "Lyrics Card Generator Android",
    description: "Create and export lyric cards offline on Android.",
    summary: "Create and export lyric cards offline on Android, with NetEase Cloud Music import and live preview.",
    status: "released",
    statusLabel: "Released · Android",
    sourcePath: "README.md",
    homepage: "https://github.com/Qrzzzz/lyrics-card-generator-android/releases/latest"
  },
  {
    slug: "second-glow",
    repository: "Qrzzzz/second-glow",
    title: "Second Glow",
    description: "Turn an idle phone into a low-power dashboard for a desk or shelf.",
    summary: "Turn an idle phone into a low-power dashboard for time, weather, markets, and device status.",
    status: "online",
    statusLabel: "Live · Web",
    sourcePath: "index.html",
    homepage: "https://qrzzzz.github.io/second-glow/",
    readmeFallback: true
  },
  {
    slug: "password-generator",
    repository: "Qrzzzz/password-generator",
    title: "Password Rule Generator",
    description: "Generate and validate passwords against a site's exact rules, entirely in the browser.",
    summary: "Generate and validate passwords against a site's exact character, position, and repetition rules—all in the browser.",
    status: "maintained",
    statusLabel: "Maintained · Web tool",
    sourcePath: "README.md",
    homepage: "https://qrzzzz.github.io/password-generator/"
  },
  {
    slug: "bili-downloader",
    repository: "Qrzzzz/bili-downloader",
    title: "Bili Downloader Lite",
    description: "Download accessible Bilibili videos locally on Windows.",
    summary: "Download accessible Bilibili videos on Windows, with sign-in, multi-part handling, quality selection, and retries.",
    status: "stable",
    statusLabel: "Stable · Windows",
    sourcePath: "README.md",
    preserveReadmeFormatting: true,
    homepage: "https://github.com/Qrzzzz/bili-downloader/releases/latest"
  },
  {
    slug: "aegis-vault-mobile",
    repository: "Qrzzzz/AegisVaultMobile",
    title: "AegisVault Mobile",
    description: "Encrypt text or encode it as Base64, entirely offline on Android.",
    summary: "Encrypt text with AES-256-GCM or encode it as Base64, entirely offline on Android.",
    status: "released",
    statusLabel: "Released · Android",
    sourcePath: "README.md",
    homepage: "https://github.com/Qrzzzz/AegisVaultMobile/releases/latest"
  },
  {
    slug: "slop-infinity",
    repository: "Qrzzzz/AI-slop-site",
    title: "SLOP∞",
    description: "A static, deliberately overbuilt parody of Chinese AI corporate websites.",
    summary: "A deliberately overbuilt parody of Chinese AI corporate websites, with no backend or data collection.",
    status: "online",
    statusLabel: "Live experiment · Web",
    sourcePath: "README.md",
    homepage: "https://qrzzzz.github.io/AI-slop-site/"
  }
]);
export const PROJECTS = Object.freeze([
  { slug: "lyrics-card-generator", repository: "Qrzzzz/lyrics-card-generator", title: "Lyrics Card Generator",
    description: "Create and export lyric cards.", summary: "Turn imported song metadata, lyrics, and translations into shareable lyric cards.",
    status: "maintained", statusLabel: "Public source · Maintained", sourcePath: "README.md", kind: "project",
    homepage: "https://qrzzzz.github.io/lyrics-card-generator/" },
  ...readmeProjects.map(project => ({ ...project, kind: project.slug === "password-generator" ? "tool" : "project" }))
]);
export const PROJECT_READMES = PROJECTS.filter(project => project.slug !== "lyrics-card-generator");
