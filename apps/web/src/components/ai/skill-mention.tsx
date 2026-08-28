import { MagicWand } from "@gravity-ui/icons";
import { Children, cloneElement, isValidElement, type ReactNode } from "react";

const SKILL_MENTION_PATTERN = /\$([a-z0-9]+(?:-[a-z0-9]+)*)(?![a-z0-9_-])/g;
const SKILL_NAME_PATTERN = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

interface SkillMentionChildProps {
  children?: ReactNode;
  node?: { tagName?: string };
}

export function SkillMention({ name }: { name: string }) {
  return (
    <span
      className="inline-flex h-[1lh] items-baseline gap-1 align-baseline font-medium leading-[inherit] text-[var(--chat-token-skill)]"
      data-skill-name={name}
    >
      <MagicWand aria-hidden className="size-[1em] shrink-0 self-center" />
      <span>{name}</span>
    </span>
  );
}

export function readSkillMentionName(value: string): string | null {
  const name = value.startsWith("$") ? value.slice(1) : "";
  return name.length > 0 && name.length <= 64 && SKILL_NAME_PATTERN.test(name) ? name : null;
}

function renderSkillMentionsInText(value: string): ReactNode[] {
  const result: ReactNode[] = [];
  let cursor = 0;

  for (const match of value.matchAll(SKILL_MENTION_PATTERN)) {
    const index = match.index;
    const name = match[1];
    const previousCharacter = value[index - 1];
    if (!name || name.length > 64 || previousCharacter?.match(/[a-zA-Z0-9_$]/)) continue;

    if (index > cursor) result.push(value.slice(cursor, index));
    result.push(<SkillMention key={`${index}-${name}`} name={name} />);
    cursor = index + match[0].length;
  }

  if (cursor < value.length) result.push(value.slice(cursor));
  return result;
}

export function renderSkillMentions(children: ReactNode): ReactNode {
  return Children.map(children, (child) => {
    if (typeof child === "string") return renderSkillMentionsInText(child);
    if (!isValidElement<SkillMentionChildProps>(child)) return child;
    if (["a", "code"].includes(child.props.node?.tagName ?? "")) return child;

    return cloneElement(child, undefined, renderSkillMentions(child.props.children));
  });
}
