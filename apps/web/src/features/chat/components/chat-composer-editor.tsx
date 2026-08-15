"use client";

import { Header, ListBox, Surface } from "@heroui/react";
import { type Editor, type JSONContent, mergeAttributes, Node } from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import type { LucideIcon } from "lucide-react";
import { File, Folder, Image as ImageIcon, Plug, SquareTerminal, WandSparkles } from "lucide-react";
import {
  forwardRef,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";

export const ChatComposerTokenKind = {
  COMMAND: "command",
  FILE: "file",
  FOLDER: "folder",
  IMAGE: "image",
  MCP: "mcp",
  SKILL: "skill",
} as const;

export type ChatComposerTokenKind =
  (typeof ChatComposerTokenKind)[keyof typeof ChatComposerTokenKind];

export interface ChatComposerToken {
  id: string;
  kind: ChatComposerTokenKind;
  label: string;
}

export interface ChatComposerEditorHandle {
  focus: () => void;
  insertToken: (token: ChatComposerToken) => void;
}

export interface ChatComposerEditorProps {
  ariaLabel?: string;
  contextMenuItems?: readonly ChatComposerToken[];
  isDisabled?: boolean;
  maxHeight?: number | string;
  minHeight?: number | string;
  onSubmit: () => void;
  onValueChange: (value: string) => void;
  placeholder?: string;
  slashMenuItems?: readonly ChatComposerToken[];
  value: string;
}

interface SuggestionMenuState {
  anchorLeft: number;
  anchorTop: number;
  from: number;
  query: string;
  selectedIndex: number;
  to: number;
  trigger: "/" | "@";
}

const TOKEN_PATTERN = /\[\[(command|file|folder|image|mcp|skill):([^|\]]+)\|([^\]]+)\]\]/g;
const SUGGESTION_MENU_GAP = 8;
const SUGGESTION_MENU_HORIZONTAL_PADDING = 12;
const SUGGESTION_MENU_MAX_WIDTH = 384;

interface TokenVisualStrategy {
  colorClassName: string;
  icon: LucideIcon;
  selectedClassName: string;
}

const TOKEN_VISUAL_STRATEGIES = {
  [ChatComposerTokenKind.COMMAND]: {
    colorClassName: "text-[var(--chat-token-command)]",
    icon: SquareTerminal,
    selectedClassName: "bg-[var(--chat-token-command-soft)]",
  },
  [ChatComposerTokenKind.FILE]: {
    colorClassName: "text-[var(--chat-token-file)]",
    icon: File,
    selectedClassName: "bg-[var(--chat-token-file-soft)]",
  },
  [ChatComposerTokenKind.FOLDER]: {
    colorClassName: "text-[var(--chat-token-folder)]",
    icon: Folder,
    selectedClassName: "bg-[var(--chat-token-folder-soft)]",
  },
  [ChatComposerTokenKind.IMAGE]: {
    colorClassName: "text-[var(--chat-token-image)]",
    icon: ImageIcon,
    selectedClassName: "bg-[var(--chat-token-image-soft)]",
  },
  [ChatComposerTokenKind.MCP]: {
    colorClassName: "text-[var(--chat-token-mcp)]",
    icon: Plug,
    selectedClassName: "bg-[var(--chat-token-mcp-soft)]",
  },
  [ChatComposerTokenKind.SKILL]: {
    colorClassName: "text-[var(--chat-token-skill)]",
    icon: WandSparkles,
    selectedClassName: "bg-[var(--chat-token-skill-soft)]",
  },
} satisfies Record<ChatComposerTokenKind, TokenVisualStrategy>;

const tokenGroups = [
  { kind: ChatComposerTokenKind.COMMAND, label: "命令" },
  { kind: ChatComposerTokenKind.SKILL, label: "Skills" },
  { kind: ChatComposerTokenKind.MCP, label: "MCP" },
  { kind: ChatComposerTokenKind.IMAGE, label: "图片" },
  { kind: ChatComposerTokenKind.FILE, label: "文件" },
  { kind: ChatComposerTokenKind.FOLDER, label: "文件夹" },
] as const;

function getTokenKey(token: ChatComposerToken): string {
  return `${token.kind}:${token.id}`;
}

function getTokenVisualStrategy(kind: ChatComposerTokenKind): TokenVisualStrategy {
  return TOKEN_VISUAL_STRATEGIES[kind];
}

function getSuggestionMenuAnchor(
  editor: Editor,
  from: number,
  container: HTMLDivElement | null,
  menu: HTMLDivElement | null,
): Pick<SuggestionMenuState, "anchorLeft" | "anchorTop"> {
  if (!container) return { anchorLeft: SUGGESTION_MENU_HORIZONTAL_PADDING, anchorTop: 0 };

  const caretRect = editor.view.coordsAtPos(from);
  const containerRect = container.getBoundingClientRect();
  const menuWidth =
    menu?.offsetWidth ??
    Math.min(
      SUGGESTION_MENU_MAX_WIDTH,
      containerRect.width - SUGGESTION_MENU_HORIZONTAL_PADDING * 2,
    );
  const maxLeft = Math.max(
    SUGGESTION_MENU_HORIZONTAL_PADDING,
    containerRect.width - menuWidth - SUGGESTION_MENU_HORIZONTAL_PADDING,
  );

  return {
    anchorLeft: Math.min(
      Math.max(caretRect.left - containerRect.left, SUGGESTION_MENU_HORIZONTAL_PADDING),
      maxLeft,
    ),
    anchorTop: caretRect.top - containerRect.top - SUGGESTION_MENU_GAP,
  };
}

function findSuggestionMenuMatch(
  editor: Editor,
): Omit<SuggestionMenuState, "anchorLeft" | "anchorTop" | "selectedIndex"> | null {
  const { selection } = editor.state;
  if (!selection.empty) return null;

  const { $from } = selection;
  const textBeforeCursor = $from.parent.textBetween(0, $from.parentOffset, undefined, "\ufffc");
  const match = /(?:^|\s)([/@])([^\s@]*)$/.exec(textBeforeCursor);
  const trigger = match?.[1];
  const query = match?.[2];

  if ((trigger !== "/" && trigger !== "@") || query === undefined) return null;

  return {
    from: selection.from - query.length - 1,
    query,
    to: selection.from,
    trigger,
  };
}

function isTokenKind(value: unknown): value is ChatComposerTokenKind {
  return Object.values(ChatComposerTokenKind).some((kind) => kind === value);
}

function readTokenAttributes(attributes: Record<string, unknown>): ChatComposerToken {
  return {
    id: typeof attributes.id === "string" ? attributes.id : "unknown",
    kind: isTokenKind(attributes.kind) ? attributes.kind : ChatComposerTokenKind.SKILL,
    label: typeof attributes.label === "string" ? attributes.label : "Unknown",
  };
}

function serializeToken(token: ChatComposerToken): string {
  return `[[${token.kind}:${token.id}|${token.label}]]`;
}

function createTextNode(text: string): JSONContent[] {
  return text ? [{ text, type: "text" }] : [];
}

function parseLine(line: string): JSONContent[] {
  const content: JSONContent[] = [];
  let lastIndex = 0;

  for (const match of line.matchAll(TOKEN_PATTERN)) {
    const [source, kind, id, label] = match;
    content.push(...createTextNode(line.slice(lastIndex, match.index)));

    if (isTokenKind(kind) && id && label) {
      content.push({
        attrs: { id, kind, label },
        type: "chatComposerToken",
      });
    } else {
      content.push(...createTextNode(source));
    }

    lastIndex = match.index + source.length;
  }

  content.push(...createTextNode(line.slice(lastIndex)));
  return content;
}

function createEditorDocument(value: string): JSONContent {
  return {
    content: value.split("\n").map((line) => ({
      content: parseLine(line),
      type: "paragraph",
    })),
    type: "doc",
  };
}

function ComposerTokenView({ node, selected }: ReactNodeViewProps) {
  const token = readTokenAttributes(node.attrs as Record<string, unknown>);
  const visualStrategy = getTokenVisualStrategy(token.kind);
  const Icon = visualStrategy.icon;

  return (
    <NodeViewWrapper
      as="span"
      className={`inline-flex items-center gap-1 rounded-sm px-0.5 align-middle font-medium leading-5 ${visualStrategy.colorClassName} ${
        selected ? visualStrategy.selectedClassName : ""
      }`}
      contentEditable={false}
      data-token-kind={token.kind}
    >
      <Icon aria-hidden className="size-3.5 shrink-0" />
      <span>{token.label}</span>
    </NodeViewWrapper>
  );
}

const ChatComposerTokenNode = Node.create({
  name: "chatComposerToken",
  group: "inline",
  inline: true,
  atom: true,
  selectable: true,

  addAttributes() {
    return {
      id: {
        default: "unknown",
        parseHTML: (element) => element.getAttribute("data-token-id"),
        renderHTML: (attributes) => ({ "data-token-id": attributes.id }),
      },
      kind: {
        default: ChatComposerTokenKind.SKILL,
        parseHTML: (element) => element.getAttribute("data-token-kind"),
        renderHTML: (attributes) => ({ "data-token-kind": attributes.kind }),
      },
      label: {
        default: "Unknown",
        parseHTML: (element) => element.getAttribute("data-token-label"),
        renderHTML: (attributes) => ({ "data-token-label": attributes.label }),
      },
    };
  },

  parseHTML() {
    return [{ tag: "span[data-chat-composer-token]" }];
  },

  renderHTML({ HTMLAttributes, node }) {
    const token = readTokenAttributes(node.attrs as Record<string, unknown>);
    return [
      "span",
      mergeAttributes(HTMLAttributes, {
        "data-chat-composer-token": token.kind,
        "data-token-id": token.id,
        "data-token-kind": token.kind,
        "data-token-label": token.label,
      }),
      token.label,
    ];
  },

  renderText({ node }) {
    return serializeToken(readTokenAttributes(node.attrs as Record<string, unknown>));
  },

  addNodeView() {
    return ReactNodeViewRenderer(ComposerTokenView, { as: "span" });
  },
});

const composerExtensions = [
  StarterKit.configure({
    blockquote: false,
    bold: false,
    bulletList: false,
    code: false,
    codeBlock: false,
    dropcursor: false,
    gapcursor: false,
    heading: false,
    horizontalRule: false,
    italic: false,
    link: false,
    listItem: false,
    listKeymap: false,
    orderedList: false,
    strike: false,
    trailingNode: false,
    underline: false,
  }),
  ChatComposerTokenNode,
];

export const ChatComposerEditor = forwardRef<ChatComposerEditorHandle, ChatComposerEditorProps>(
  function ChatComposerEditor(
    {
      ariaLabel = "消息输入框",
      contextMenuItems = [],
      isDisabled = false,
      maxHeight = 240,
      minHeight = 56,
      onSubmit,
      onValueChange,
      placeholder = "输入任何问题",
      slashMenuItems = [],
      value,
    },
    ref,
  ) {
    const [suggestionMenu, setSuggestionMenu] = useState<SuggestionMenuState | null>(null);
    const isDisabledRef = useRef(isDisabled);
    const onSubmitRef = useRef(onSubmit);
    const onValueChangeRef = useRef(onValueChange);
    const suggestionMenuId = useId();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const suggestionMenuRef = useRef<HTMLDivElement>(null);
    const suggestionMenuStateRef = useRef<SuggestionMenuState | null>(null);
    const filteredSuggestionItemsRef = useRef<readonly ChatComposerToken[]>([]);
    const selectSuggestionTokenRef = useRef<(token: ChatComposerToken) => void>(() => undefined);
    isDisabledRef.current = isDisabled;
    onSubmitRef.current = onSubmit;
    onValueChangeRef.current = onValueChange;

    const updateSuggestionMenu = (currentEditor: Editor) => {
      const match = findSuggestionMenuMatch(currentEditor);
      setSuggestionMenu((current) => {
        if (!match) return null;

        return {
          ...match,
          ...getSuggestionMenuAnchor(
            currentEditor,
            match.from,
            editorContainerRef.current,
            suggestionMenuRef.current,
          ),
          selectedIndex:
            current?.query === match.query && current.trigger === match.trigger
              ? current.selectedIndex
              : 0,
        };
      });
    };

    const editor = useEditor({
      content: createEditorDocument(value),
      editorProps: {
        attributes: {
          "aria-label": ariaLabel,
          "aria-haspopup": "listbox",
          "aria-multiline": "true",
          class: "min-h-[inherit] w-full whitespace-pre-wrap break-words outline-none",
          role: "textbox",
        },
        handleKeyDown: (_view, event) => {
          const currentSuggestionMenu = suggestionMenuStateRef.current;
          const currentItems = filteredSuggestionItemsRef.current;

          if (currentSuggestionMenu) {
            if (event.key === "ArrowDown" || event.key === "ArrowUp") {
              event.preventDefault();
              setSuggestionMenu((current) => {
                if (!current || currentItems.length === 0) return current;

                const offset = event.key === "ArrowDown" ? 1 : -1;
                return {
                  ...current,
                  selectedIndex:
                    (current.selectedIndex + offset + currentItems.length) % currentItems.length,
                };
              });
              return true;
            }

            if (event.key === "Escape") {
              event.preventDefault();
              setSuggestionMenu(null);
              return true;
            }

            if (event.key === "Enter" && !event.shiftKey && !event.isComposing) {
              const selectedItem = currentItems[currentSuggestionMenu.selectedIndex];
              if (selectedItem) {
                event.preventDefault();
                selectSuggestionTokenRef.current(selectedItem);
                return true;
              }
            }
          }

          if (event.key !== "Enter" || event.shiftKey || event.isComposing) return false;

          event.preventDefault();
          if (!isDisabledRef.current) onSubmitRef.current();
          return true;
        },
      },
      extensions: composerExtensions,
      immediatelyRender: false,
      onBlur: ({ event }) => {
        if (event.relatedTarget instanceof globalThis.Node) {
          if (suggestionMenuRef.current?.contains(event.relatedTarget)) return;
        }
        setSuggestionMenu(null);
      },
      onSelectionUpdate: ({ editor: currentEditor }) => {
        updateSuggestionMenu(currentEditor);
      },
      onUpdate: ({ editor: currentEditor }) => {
        onValueChangeRef.current(currentEditor.getText({ blockSeparator: "\n" }));
        updateSuggestionMenu(currentEditor);
      },
    });

    const activeMenuItems = suggestionMenu?.trigger === "@" ? contextMenuItems : slashMenuItems;
    const matchingSuggestionItems = useMemo(() => {
      const normalizedQuery = suggestionMenu?.query.trim().toLocaleLowerCase() ?? "";
      if (!normalizedQuery) return activeMenuItems;

      return activeMenuItems.filter((token) =>
        `${token.kind} ${token.id} ${token.label}`.toLocaleLowerCase().includes(normalizedQuery),
      );
    }, [activeMenuItems, suggestionMenu?.query]);

    const groupedSuggestionItems = useMemo(
      () =>
        tokenGroups
          .map((group) => ({
            ...group,
            items: matchingSuggestionItems.filter((token) => token.kind === group.kind),
          }))
          .filter((group) => group.items.length > 0),
      [matchingSuggestionItems],
    );

    const filteredSuggestionItems = useMemo(
      () => groupedSuggestionItems.flatMap((group) => group.items),
      [groupedSuggestionItems],
    );

    suggestionMenuStateRef.current = suggestionMenu;
    filteredSuggestionItemsRef.current = filteredSuggestionItems;
    selectSuggestionTokenRef.current = (token) => {
      const currentSuggestionMenu = suggestionMenuStateRef.current;
      if (!editor || !currentSuggestionMenu) return;

      editor
        .chain()
        .focus()
        .deleteRange({ from: currentSuggestionMenu.from, to: currentSuggestionMenu.to })
        .insertContent([
          { attrs: token, type: ChatComposerTokenNode.name },
          { text: " ", type: "text" },
        ])
        .run();
      setSuggestionMenu(null);
    };

    const selectedSuggestionItem =
      filteredSuggestionItems[
        Math.min(
          suggestionMenu?.selectedIndex ?? 0,
          Math.max(filteredSuggestionItems.length - 1, 0),
        )
      ];

    useImperativeHandle(
      ref,
      () => ({
        focus: () => {
          editor?.commands.focus();
        },
        insertToken: (token) => {
          editor
            ?.chain()
            .focus()
            .insertContent([
              { attrs: token, type: ChatComposerTokenNode.name },
              { text: " ", type: "text" },
            ])
            .run();
        },
      }),
      [editor],
    );

    useEffect(() => {
      editor?.setEditable(!isDisabled);
    }, [editor, isDisabled]);

    useEffect(() => {
      if (!editor) return;

      editor.view.dom.setAttribute("aria-expanded", String(Boolean(suggestionMenu)));
      if (suggestionMenu) {
        editor.view.dom.setAttribute("aria-controls", suggestionMenuId);
      } else {
        editor.view.dom.removeAttribute("aria-controls");
      }
    }, [editor, suggestionMenu, suggestionMenuId]);

    useEffect(() => {
      if (!editor || editor.getText({ blockSeparator: "\n" }) === value) return;
      editor.commands.setContent(createEditorDocument(value), { emitUpdate: false });
      setSuggestionMenu(null);
    }, [editor, value]);

    return (
      <div
        ref={editorContainerRef}
        className="relative mb-14 text-sm leading-6 text-foreground"
        data-disabled={isDisabled || undefined}
        data-slot="chat-composer-editor"
        style={{ minHeight }}
      >
        {suggestionMenu ? (
          <div
            ref={suggestionMenuRef}
            className="absolute z-50 w-[min(24rem,calc(100%-1.5rem))] -translate-y-full"
            style={{ left: suggestionMenu.anchorLeft, top: suggestionMenu.anchorTop }}
            onPointerDown={(event) => event.preventDefault()}
          >
            <Surface className="rounded-2xl p-2 shadow-overlay">
              {filteredSuggestionItems.length > 0 ? (
                <ListBox
                  id={suggestionMenuId}
                  aria-label={
                    suggestionMenu.trigger === "@"
                      ? "添加图片、文件或文件夹上下文"
                      : "插入命令、Skill 或 MCP"
                  }
                  className="max-h-80 overflow-y-auto"
                  selectedKeys={selectedSuggestionItem ? [getTokenKey(selectedSuggestionItem)] : []}
                  selectionMode="single"
                  onSelectionChange={(keys) => {
                    if (keys === "all") return;
                    const [key] = keys;
                    const selectedIndex = filteredSuggestionItems.findIndex(
                      (item) => getTokenKey(item) === key,
                    );
                    if (selectedIndex >= 0) {
                      setSuggestionMenu((current) =>
                        current ? { ...current, selectedIndex } : current,
                      );
                    }
                  }}
                >
                  {groupedSuggestionItems.map((group) => (
                    <ListBox.Section key={group.kind} id={group.kind}>
                      <Header className="px-2 pb-1 pt-2 text-xs font-medium text-muted first:pt-1">
                        {group.label}
                      </Header>
                      {group.items.map((token) => {
                        const visualStrategy = getTokenVisualStrategy(token.kind);
                        const Icon = visualStrategy.icon;
                        return (
                          <ListBox.Item
                            key={getTokenKey(token)}
                            id={getTokenKey(token)}
                            textValue={token.label}
                            onPress={() => selectSuggestionTokenRef.current(token)}
                          >
                            <Icon
                              aria-hidden
                              className={`size-4 shrink-0 ${visualStrategy.colorClassName}`}
                            />
                            <span className="min-w-0 truncate">{token.label}</span>
                          </ListBox.Item>
                        );
                      })}
                    </ListBox.Section>
                  ))}
                </ListBox>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted">没有匹配的内容</div>
              )}
            </Surface>
          </div>
        ) : null}
        <div className="relative overflow-y-auto px-3 pt-2" style={{ maxHeight, minHeight }}>
          {!value.trim() ? (
            <span aria-hidden className="pointer-events-none absolute left-3 top-2 text-muted">
              {placeholder}
            </span>
          ) : null}
          <EditorContent
            className="min-h-[inherit] [&_.ProseMirror-selectednode]:outline-none [&_.tiptap_p]:m-0"
            editor={editor}
          />
        </div>
      </div>
    );
  },
);
