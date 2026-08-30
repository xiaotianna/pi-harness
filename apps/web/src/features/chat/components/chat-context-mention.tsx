import { File, Folder, Picture as ImageIcon } from "@gravity-ui/icons";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";
import { FileIconRender } from "../../../components/ui/file-icon-render";
import { ChatComposerTokenKind } from "./chat-composer-editor";

const CONTEXT_MENTION_PATTERN = /\[\[(file|folder|image):([^|\]]+)\|([^\]]+)\]\]/g;

interface ContextMentionChildProps {
  children?: ReactNode;
  node?: { tagName?: string };
}

function ContextMention({ kind, label }: { kind: string; label: string }) {
  const colorClassName =
    kind === ChatComposerTokenKind.IMAGE
      ? "text-[var(--chat-token-image)]"
      : kind === ChatComposerTokenKind.FOLDER
        ? "text-[var(--chat-token-folder)]"
        : "text-[var(--chat-token-file)]";

  return (
    <span
      className={`inline-flex h-[1lh] items-baseline gap-1 align-baseline font-medium leading-[inherit] ${colorClassName}`}
    >
      {kind === ChatComposerTokenKind.FOLDER ? (
        <Folder aria-hidden className="size-[1em] shrink-0 self-center" />
      ) : kind === ChatComposerTokenKind.IMAGE ? (
        <ImageIcon aria-hidden className="size-[1em] shrink-0 self-center" />
      ) : (
        <FileIconRender
          className="size-[1em] shrink-0 self-center"
          fallback={File}
          filePath={label}
        />
      )}
      <span>{label}</span>
    </span>
  );
}

function renderContextMentionsInText(value: string): ReactNode[] {
  const result: ReactNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(CONTEXT_MENTION_PATTERN)) {
    const index = match.index;
    const kind = match[1];
    const encodedLabel = match[3];
    if (!kind || !encodedLabel) continue;
    let label = encodedLabel;
    try {
      label = decodeURIComponent(encodedLabel);
    } catch {
      label = encodedLabel;
    }
    if (index > cursor) result.push(value.slice(cursor, index));
    result.push(<ContextMention key={`${index}-${kind}-${label}`} kind={kind} label={label} />);
    cursor = index + match[0].length;
  }

  if (cursor < value.length) result.push(value.slice(cursor));
  return result;
}

export function renderChatContextMentions(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return renderContextMentionsInText(child);
    if (!isValidElement<ContextMentionChildProps>(child)) return child;
    if (["a", "code"].includes(child.props.node?.tagName ?? "")) return child;
    return cloneElement(child, undefined, renderChatContextMentions(child.props.children));
  });
}
