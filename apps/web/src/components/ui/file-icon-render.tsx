import { FileCode } from "@gravity-ui/icons";
import { Icon, type IconifyIcon } from "@iconify/react";
import audioIcon from "@iconify-icons/vscode-icons/file-type-audio";
import cssIcon from "@iconify-icons/vscode-icons/file-type-css";
import dockerIcon from "@iconify-icons/vscode-icons/file-type-docker";
import dotenvIcon from "@iconify-icons/vscode-icons/file-type-dotenv";
import excelIcon from "@iconify-icons/vscode-icons/file-type-excel";
import gitIcon from "@iconify-icons/vscode-icons/file-type-git";
import htmlIcon from "@iconify-icons/vscode-icons/file-type-html";
import imageIcon from "@iconify-icons/vscode-icons/file-type-image";
import javascriptIcon from "@iconify-icons/vscode-icons/file-type-js";
import jsonIcon from "@iconify-icons/vscode-icons/file-type-json";
import markdownIcon from "@iconify-icons/vscode-icons/file-type-markdown";
import npmIcon from "@iconify-icons/vscode-icons/file-type-npm";
import pdfIcon from "@iconify-icons/vscode-icons/file-type-pdf2";
import powerpointIcon from "@iconify-icons/vscode-icons/file-type-powerpoint";
import reactIcon from "@iconify-icons/vscode-icons/file-type-reactjs";
import reactTypeScriptIcon from "@iconify-icons/vscode-icons/file-type-reactts";
import scssIcon from "@iconify-icons/vscode-icons/file-type-scss";
import shellIcon from "@iconify-icons/vscode-icons/file-type-shell";
import svgIcon from "@iconify-icons/vscode-icons/file-type-svg";
import textIcon from "@iconify-icons/vscode-icons/file-type-text";
import tsconfigIcon from "@iconify-icons/vscode-icons/file-type-tsconfig";
import typeScriptIcon from "@iconify-icons/vscode-icons/file-type-typescript";
import videoIcon from "@iconify-icons/vscode-icons/file-type-video";
import viteIcon from "@iconify-icons/vscode-icons/file-type-vite";
import vueIcon from "@iconify-icons/vscode-icons/file-type-vue";
import wordIcon from "@iconify-icons/vscode-icons/file-type-word";
import yamlIcon from "@iconify-icons/vscode-icons/file-type-yaml";
import zipIcon from "@iconify-icons/vscode-icons/file-type-zip";
import type { ComponentType, SVGProps } from "react";

interface FileIconStrategy {
  icon: IconifyIcon;
  matches: (fileName: string) => boolean;
}

function hasExtension(...extensions: readonly string[]) {
  return (fileName: string) => extensions.some((extension) => fileName.endsWith(`.${extension}`));
}

const FILE_ICON_STRATEGIES: readonly FileIconStrategy[] = [
  { icon: tsconfigIcon, matches: (name) => /^tsconfig(?:\..+)?\.json$/.test(name) },
  { icon: viteIcon, matches: (name) => /^vite\.config\./.test(name) },
  {
    icon: npmIcon,
    matches: (name) => [".npmrc", "package-lock.json", "package.json"].includes(name),
  },
  { icon: dotenvIcon, matches: (name) => /^\.env(?:\..+)?$/.test(name) },
  {
    icon: gitIcon,
    matches: (name) => [".gitattributes", ".gitignore", ".gitmodules"].includes(name),
  },
  { icon: dockerIcon, matches: (name) => /^(?:dockerfile|docker-compose\.|compose\.)/.test(name) },
  { icon: markdownIcon, matches: hasExtension("md", "mdx") },
  { icon: reactTypeScriptIcon, matches: hasExtension("tsx") },
  { icon: reactIcon, matches: hasExtension("jsx") },
  { icon: typeScriptIcon, matches: hasExtension("ts", "mts", "cts") },
  { icon: javascriptIcon, matches: hasExtension("js", "mjs", "cjs") },
  { icon: vueIcon, matches: hasExtension("vue") },
  { icon: jsonIcon, matches: hasExtension("json", "jsonc", "json5") },
  { icon: yamlIcon, matches: hasExtension("yaml", "yml") },
  { icon: cssIcon, matches: hasExtension("css", "less") },
  { icon: scssIcon, matches: hasExtension("scss", "sass") },
  { icon: htmlIcon, matches: hasExtension("html", "htm") },
  { icon: svgIcon, matches: hasExtension("svg") },
  { icon: imageIcon, matches: hasExtension("png", "jpg", "jpeg", "gif", "webp", "avif", "ico") },
  { icon: pdfIcon, matches: hasExtension("pdf") },
  { icon: wordIcon, matches: hasExtension("doc", "docx", "odt") },
  { icon: excelIcon, matches: hasExtension("xls", "xlsx", "csv", "ods") },
  { icon: powerpointIcon, matches: hasExtension("ppt", "pptx", "odp") },
  { icon: zipIcon, matches: hasExtension("zip", "tar", "gz", "tgz", "rar", "7z") },
  { icon: audioIcon, matches: hasExtension("mp3", "wav", "flac", "aac", "ogg", "m4a") },
  { icon: videoIcon, matches: hasExtension("mp4", "mov", "webm", "avi", "mkv") },
  { icon: shellIcon, matches: hasExtension("sh", "bash", "zsh", "fish") },
  { icon: textIcon, matches: hasExtension("txt", "log") },
];

export function resolveFileIcon(filePath: string): IconifyIcon | undefined {
  const fileName = filePath.split(/[\\/]/).at(-1)?.toLowerCase() ?? "";
  return FILE_ICON_STRATEGIES.find((strategy) => strategy.matches(fileName))?.icon;
}

export interface FileIconRenderProps {
  className?: string;
  fallback?: ComponentType<SVGProps<SVGSVGElement>>;
  filePath: string;
}

export function FileIconRender({
  className,
  fallback: Fallback = FileCode,
  filePath,
}: FileIconRenderProps) {
  const icon = resolveFileIcon(filePath);
  const classNameProps = className === undefined ? {} : { className };

  return icon ? (
    <Icon aria-hidden icon={icon} {...classNameProps} />
  ) : (
    <Fallback aria-hidden {...classNameProps} />
  );
}
