import { FolderOpen } from "@gravity-ui/icons";
import { Link, Tooltip } from "@heroui/react";
import { type ComponentPropsWithoutRef, createContext, type ReactNode, useContext } from "react";
import type { ExtraProps } from "react-markdown";
import { cn } from "../../shared/utils/cn";
import { FileIconRender, resolveFileIcon } from "../ui/file-icon-render";

const WorkspaceRootContext = createContext<string | undefined>(undefined);
const URI_SCHEME_PATTERN = /^[a-z][a-z\d+.-]*:/i;
const WINDOWS_ABSOLUTE_PATH_PATTERN = /^[a-z]:[\\/]/i;
const PATH_LOCATION_PATTERN = /(?::\d+(?::\d+)?|#L\d+(?:C\d+)?)$/i;
const HTTP_URL_PATTERN = /^https?:\/\/\S+$/i;

export interface AssistantMarkdownLinkProviderProps {
  children: ReactNode;
  workspaceRoot: string | undefined;
}

export type AssistantMarkdownLinkProps = ComponentPropsWithoutRef<"a"> & ExtraProps;

export function AssistantMarkdownLinkProvider({
  children,
  workspaceRoot,
}: AssistantMarkdownLinkProviderProps) {
  return <WorkspaceRootContext value={workspaceRoot}>{children}</WorkspaceRootContext>;
}

function decodePath(path: string): string {
  try {
    return decodeURIComponent(path);
  } catch {
    return path;
  }
}

function isLocalPath(href: string, title?: string): boolean {
  if (title === "local-path") return true;
  if (href.startsWith("#") || href.startsWith("?")) return false;
  return (
    WINDOWS_ABSOLUTE_PATH_PATTERN.test(href) ||
    !URI_SCHEME_PATTERN.test(href.replace(PATH_LOCATION_PATTERN, ""))
  );
}

export function isAssistantMarkdownLinkTarget(value: string): boolean {
  if (HTTP_URL_PATTERN.test(value)) return true;
  const path = value.replace(PATH_LOCATION_PATTERN, "");
  const isAbsolute = path.startsWith("/") || WINDOWS_ABSOLUTE_PATH_PATTERN.test(path);
  return isAbsolute && /(?:^|[\\/])[^\\/]+\.[^\\/]+$/.test(path);
}

function resolveDisplayPath(workspaceRoot: string | undefined, path: string): string {
  if (!workspaceRoot || path.startsWith("/") || WINDOWS_ABSOLUTE_PATH_PATTERN.test(path)) {
    return path;
  }

  const separator = workspaceRoot.includes("\\") ? "\\" : "/";
  const parts = workspaceRoot.split(/[\\/]/);
  const minimumLength = parts[0] === "" || /^[a-z]:$/i.test(parts[0] ?? "") ? 1 : 0;
  for (const part of path.split(/[\\/]/)) {
    if (!part || part === ".") continue;
    if (part === "..") {
      if (parts.length > minimumLength) parts.pop();
      continue;
    }
    parts.push(part);
  }
  return parts.join(separator) || separator;
}

function isLikelyDirectoryPath(path: string, title?: string): boolean {
  if (title === "local-directory" || /[\\/]$/.test(path)) return true;
  const fileName = path.split(/[\\/]/).filter(Boolean).at(-1) ?? "";
  return resolveFileIcon(path) === undefined && !fileName.slice(1).includes(".");
}

export function AssistantMarkdownLink({
  children,
  className,
  href,
  node: _node,
  rel,
  target,
  title,
  ...props
}: AssistantMarkdownLinkProps) {
  const workspaceRoot = useContext(WorkspaceRootContext);

  if (href && /^https?:\/\//i.test(href)) {
    return (
      <Link
        href={href}
        rel="noopener noreferrer"
        target="_blank"
        {...(className === undefined ? {} : { className })}
        {...(title === undefined ? {} : { title })}
      >
        {children}
        <Link.Icon />
      </Link>
    );
  }

  if (!href || !isLocalPath(href, title)) {
    return (
      <a className={className} href={href} rel={rel} target={target} title={title} {...props}>
        {children}
      </a>
    );
  }

  const decodedHref = decodePath(href);
  const path = decodedHref.replace(PATH_LOCATION_PATTERN, "");
  const location = decodedHref.slice(path.length);
  const fullPath = `${resolveDisplayPath(workspaceRoot, path)}${location}`;
  const isDirectory = isLikelyDirectoryPath(path, title);

  return (
    <Tooltip delay={300}>
      <a
        className={cn("markdown__local-link", className)}
        data-local-path={path}
        href={href}
        {...props}
      >
        {isDirectory ? (
          <span
            aria-hidden
            className="inline-flex size-[1.1em] shrink-0 items-center justify-center"
          >
            <FolderOpen className="size-[0.9em]" />
          </span>
        ) : (
          <FileIconRender className="size-[1.1em] shrink-0" filePath={path} />
        )}
        <span className="min-w-0 [overflow-wrap:anywhere]">{children}</span>
      </a>
      <Tooltip.Content className="max-w-md break-all" placement="top">
        {fullPath}
      </Tooltip.Content>
    </Tooltip>
  );
}
