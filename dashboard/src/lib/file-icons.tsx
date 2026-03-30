import {
  IconBrandAstro,
  IconBrandDocker,
  IconBrandGit,
  IconBrandGolang,
  IconBrandNpm,
  IconBrandPnpm,
  IconBrandReact,
  IconBrandSvelte,
  IconBrandTailwind,
  IconBrandVue,
  IconFile,
  IconFileCode,
  IconFileDescription,
  IconFileSettings,
  IconFileTypeCss,
  IconFileTypeHtml,
  IconFileTypeJs,
  IconFileTypeJsx,
  IconFileTypeSql,
  IconFileTypeSvg,
  IconFileTypeTs,
  IconFileTypeTsx,
  IconFileTypeXml,
  IconFileZip,
  IconFolder,
  IconFolderFilled,
  IconJson,
  IconLock,
  IconMarkdown,
  IconPhoto,
  IconTerminal,
} from "@tabler/icons-react";

const SIZE = 14;
const S = 1.5;

interface IconConfig {
  icon: React.ReactNode;
  color: string;
}

const EXT_ICONS: Record<string, IconConfig> = {
  ts: { icon: <IconFileTypeTs size={SIZE} stroke={S} />, color: "#3178C6" },
  tsx: { icon: <IconFileTypeTsx size={SIZE} stroke={S} />, color: "#3178C6" },
  js: { icon: <IconFileTypeJs size={SIZE} stroke={S} />, color: "#F7DF1E" },
  jsx: { icon: <IconFileTypeJsx size={SIZE} stroke={S} />, color: "#61DAFB" },
  mjs: { icon: <IconFileTypeJs size={SIZE} stroke={S} />, color: "#F7DF1E" },
  cjs: { icon: <IconFileTypeJs size={SIZE} stroke={S} />, color: "#F7DF1E" },
  json: { icon: <IconJson size={SIZE} stroke={S} />, color: "#FBC02D" },
  html: { icon: <IconFileTypeHtml size={SIZE} stroke={S} />, color: "#E44D26" },
  css: { icon: <IconFileTypeCss size={SIZE} stroke={S} />, color: "#1572B6" },
  svg: { icon: <IconFileTypeSvg size={SIZE} stroke={S} />, color: "#FFB13B" },
  xml: { icon: <IconFileTypeXml size={SIZE} stroke={S} />, color: "#E44D26" },
  sql: { icon: <IconFileTypeSql size={SIZE} stroke={S} />, color: "#336791" },
  md: { icon: <IconMarkdown size={SIZE} stroke={S} />, color: "#83838B" },
  mdx: { icon: <IconMarkdown size={SIZE} stroke={S} />, color: "#83838B" },
  yml: { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#CB171E" },
  yaml: { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#CB171E" },
  toml: { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#9C4221" },
  sh: { icon: <IconTerminal size={SIZE} stroke={S} />, color: "#89E051" },
  bash: { icon: <IconTerminal size={SIZE} stroke={S} />, color: "#89E051" },
  zsh: { icon: <IconTerminal size={SIZE} stroke={S} />, color: "#89E051" },
  png: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  jpg: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  jpeg: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  gif: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  webp: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  ico: { icon: <IconPhoto size={SIZE} stroke={S} />, color: "#A074C4" },
  go: { icon: <IconBrandGolang size={SIZE} stroke={S} />, color: "#00ADD8" },
  java: { icon: <IconFileCode size={SIZE} stroke={S} />, color: "#B07219" },
  cs: { icon: <IconFileCode size={SIZE} stroke={S} />, color: "#68217A" },
  rs: { icon: <IconFileCode size={SIZE} stroke={S} />, color: "#DEA584" },
  py: { icon: <IconFileCode size={SIZE} stroke={S} />, color: "#3572A5" },
  astro: { icon: <IconBrandAstro size={SIZE} stroke={S} />, color: "#FF5D01" },
  svelte: { icon: <IconBrandSvelte size={SIZE} stroke={S} />, color: "#FF3E00" },
  vue: { icon: <IconBrandVue size={SIZE} stroke={S} />, color: "#4FC08D" },
  lock: { icon: <IconLock size={SIZE} stroke={S} />, color: "#83838B" },
  gz: { icon: <IconFileZip size={SIZE} stroke={S} />, color: "#83838B" },
  zip: { icon: <IconFileZip size={SIZE} stroke={S} />, color: "#83838B" },
  tar: { icon: <IconFileZip size={SIZE} stroke={S} />, color: "#83838B" },
};

const NAME_ICONS: Record<string, IconConfig> = {
  "package.json": { icon: <IconBrandNpm size={SIZE} stroke={S} />, color: "#CB3837" },
  "pnpm-lock.yaml": { icon: <IconBrandPnpm size={SIZE} stroke={S} />, color: "#F69220" },
  "pnpm-workspace.yaml": { icon: <IconBrandPnpm size={SIZE} stroke={S} />, color: "#F69220" },
  ".gitignore": { icon: <IconBrandGit size={SIZE} stroke={S} />, color: "#F05032" },
  ".gitattributes": { icon: <IconBrandGit size={SIZE} stroke={S} />, color: "#F05032" },
  Dockerfile: { icon: <IconBrandDocker size={SIZE} stroke={S} />, color: "#2496ED" },
  "docker-compose.yml": { icon: <IconBrandDocker size={SIZE} stroke={S} />, color: "#2496ED" },
  "docker-compose.yaml": { icon: <IconBrandDocker size={SIZE} stroke={S} />, color: "#2496ED" },
  "tailwind.config.ts": { icon: <IconBrandTailwind size={SIZE} stroke={S} />, color: "#06B6D4" },
  "tailwind.config.js": { icon: <IconBrandTailwind size={SIZE} stroke={S} />, color: "#06B6D4" },
  "tailwind.config.mjs": { icon: <IconBrandTailwind size={SIZE} stroke={S} />, color: "#06B6D4" },
  "tsconfig.json": { icon: <IconFileTypeTs size={SIZE} stroke={S} />, color: "#3178C6" },
  "README.md": { icon: <IconFileDescription size={SIZE} stroke={S} />, color: "#83838B" },
  LICENSE: { icon: <IconFileDescription size={SIZE} stroke={S} />, color: "#83838B" },
  "go.mod": { icon: <IconBrandGolang size={SIZE} stroke={S} />, color: "#00ADD8" },
  "go.sum": { icon: <IconBrandGolang size={SIZE} stroke={S} />, color: "#00ADD8" },
  "pom.xml": { icon: <IconFileCode size={SIZE} stroke={S} />, color: "#B07219" },
  "biome.json": { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#60A5FA" },
  "biome.jsonc": { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#60A5FA" },
  "wrangler.toml": { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#F6821F" },
  "astro.config.mjs": { icon: <IconBrandAstro size={SIZE} stroke={S} />, color: "#FF5D01" },
  "astro.config.ts": { icon: <IconBrandAstro size={SIZE} stroke={S} />, color: "#FF5D01" },
  "vite.config.ts": { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#646CFF" },
  "vitest.config.ts": { icon: <IconFileSettings size={SIZE} stroke={S} />, color: "#729B1B" },
};

const DEFAULT_FILE: IconConfig = { icon: <IconFile size={SIZE} stroke={S} />, color: "#83838B" };
const FOLDER_CLOSED: IconConfig = { icon: <IconFolder size={SIZE} stroke={S} />, color: "#90A4AE" };
const FOLDER_OPEN: IconConfig = { icon: <IconFolderFilled size={SIZE} stroke={S} />, color: "#90A4AE" };

const REACT_EXTS = new Set(["tsx", "jsx"]);

export function getFileIcon(fileName: string): IconConfig {
  // Check exact name first
  const nameIcon = NAME_ICONS[fileName];
  if (nameIcon) return nameIcon;

  // Check for React component files (.tsx/.jsx)
  const ext = fileName.split(".").pop()?.toLowerCase() ?? "";
  if (REACT_EXTS.has(ext) && /^[A-Z]/.test(fileName)) {
    return { icon: <IconBrandReact size={SIZE} stroke={S} />, color: "#61DAFB" };
  }

  // Check extension
  return EXT_ICONS[ext] ?? DEFAULT_FILE;
}

export function getFolderIcon(isOpen: boolean): IconConfig {
  return isOpen ? FOLDER_OPEN : FOLDER_CLOSED;
}
