"use client";

import {
  File,
  FolderOpen,
  Picture as ImageIcon,
  Terminal as SquareTerminal,
  MagicWand as WandSparkles,
} from "@gravity-ui/icons";
import { Header, ListBox, ListLayout, Surface, Virtualizer } from "@heroui/react";
import { type Editor, type JSONContent, mergeAttributes, Node } from "@tiptap/core";
import {
  EditorContent,
  NodeViewWrapper,
  type ReactNodeViewProps,
  ReactNodeViewRenderer,
  useEditor,
} from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import {
  type ComponentType,
  forwardRef,
  type SVGProps,
  useEffect,
  useId,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from "react";
import { FileIconRender } from "../../../components/ui/file-icon-render";

export const ChatComposerTokenKind = {
  COMMAND: "command",
  FILE: "file",
  FOLDER: "folder",
  IMAGE: "image",
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
  clear: () => void;
  focus: () => void;
  getTokens: () => readonly ChatComposerToken[];
  getValue: () => string;
  insertToken: (token: ChatComposerToken) => void;
  setValue: (value: string) => void;
}

export interface ChatComposerEditorProps {
  ariaLabel?: string;
  contextMenuItems?: readonly ChatComposerToken[];
  contextMenuStatus?: "error" | "loading" | "ready";
  initialValue?: string;
  isDisabled?: boolean;
  maxHeight?: number | string;
  minHeight?: number | string;
  onEmptyChange?: (isEmpty: boolean) => void;
  onSubmit: (useAlternateBusyBehavior?: boolean) => void;
  placeholder?: string;
  slashMenuItems?: readonly ChatComposerToken[];
}

interface SuggestionMenuState {
  anchorLeft: number;
  anchorTop: number;
  from: number;
  maxHeight: number;
  query: string;
  selectedIndex: number;
  to: number;
  trigger: "/" | "@";
}

const TOKEN_PATTERN = /\[\[(command|file|folder|image|skill):([^|\]]+)\|([^\]]+)\]\]/g;
const SUGGESTION_MENU_GAP = 8;
const SUGGESTION_MENU_HORIZONTAL_PADDING = 12;
const SUGGESTION_MENU_MAX_HEIGHT = 336;
const SUGGESTION_MENU_MAX_WIDTH = 384;
const SUGGESTION_MENU_LAYOUT_OPTIONS = {
  gap: 0,
  headingSize: 28,
  padding: 0,
  rowSize: 36,
} as const;

interface TokenVisualStrategy {
  colorClassName: string;
  icon?: ComponentType<SVGProps<SVGSVGElement>>;
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
    selectedClassName: "bg-[var(--chat-token-file-soft)]",
  },
  [ChatComposerTokenKind.FOLDER]: {
    colorClassName: "text-[var(--chat-token-folder)]",
    icon: FolderOpen,
    selectedClassName: "bg-[var(--chat-token-folder-soft)]",
  },
  [ChatComposerTokenKind.IMAGE]: {
    colorClassName: "text-[var(--chat-token-image)]",
    icon: ImageIcon,
    selectedClassName: "bg-[var(--chat-token-image-soft)]",
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
  { kind: ChatComposerTokenKind.IMAGE, label: "图片" },
  { kind: ChatComposerTokenKind.FILE, label: "文件" },
  { kind: ChatComposerTokenKind.FOLDER, label: "文件夹" },
] as const;

function getTokenKey(token: ChatComposerToken): string {
  return `${token.kind}:${token.id}`;
}

function createTokenSearchText(token: ChatComposerToken): string {
  return `${token.kind} ${token.id} ${token.label}`.toLowerCase();
}

function getTokenVisualStrategy(kind: ChatComposerTokenKind): TokenVisualStrategy {
  return TOKEN_VISUAL_STRATEGIES[kind];
}

function TokenVisualIcon({ className, token }: { className: string; token: ChatComposerToken }) {
  const Icon = getTokenVisualStrategy(token.kind).icon;
  return Icon ? (
    <Icon aria-hidden className={className} />
  ) : (
    <FileIconRender className={className} fallback={File} filePath={token.label} />
  );
}

function getSuggestionMenuAnchor(
  editor: Editor,
  from: number,
  container: HTMLDivElement | null,
  menu: HTMLDivElement | null,
): Pick<SuggestionMenuState, "anchorLeft" | "anchorTop" | "maxHeight"> {
  if (!container) {
    return {
      anchorLeft: SUGGESTION_MENU_HORIZONTAL_PADDING,
      anchorTop: 0,
      maxHeight: SUGGESTION_MENU_MAX_HEIGHT,
    };
  }

  const caretRect = editor.view.coordsAtPos(from);
  const containerRect = container.getBoundingClientRect();
  const headerBottom =
    container
      .closest("[data-app-layout]")
      ?.querySelector<HTMLElement>('[data-slot="app-layout-header"]')
      ?.getBoundingClientRect().bottom ?? 0;
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
    maxHeight: Math.min(
      SUGGESTION_MENU_MAX_HEIGHT,
      Math.max(caretRect.top - headerBottom - SUGGESTION_MENU_GAP * 2, 0),
    ),
  };
}

function findSuggestionMenuMatch(
  editor: Editor,
): Omit<SuggestionMenuState, "anchorLeft" | "anchorTop" | "maxHeight" | "selectedIndex"> | null {
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

export function serializeChatComposerToken(token: ChatComposerToken): string {
  if (token.kind === ChatComposerTokenKind.SKILL) return `$${token.id}`;
  return `[[${token.kind}:${encodeURIComponent(token.id)}|${encodeURIComponent(token.label)}]]`;
}

export function createChatComposerTokenValue(token: ChatComposerToken): string {
  return `[[${token.kind}:${encodeURIComponent(token.id)}|${encodeURIComponent(token.label)}]]`;
}

function decodeTokenPart(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
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
        attrs: { id: decodeTokenPart(id), kind, label: decodeTokenPart(label) },
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

function readDocumentTokens(node: JSONContent): ChatComposerToken[] {
  const tokens: ChatComposerToken[] = [];
  if (node.type === ChatComposerTokenNode.name && node.attrs) {
    tokens.push(readTokenAttributes(node.attrs));
  }
  for (const child of node.content ?? []) tokens.push(...readDocumentTokens(child));
  return tokens;
}

function ComposerTokenView({ node, selected }: ReactNodeViewProps) {
  const token = readTokenAttributes(node.attrs as Record<string, unknown>);
  const visualStrategy = getTokenVisualStrategy(token.kind);

  return (
    <NodeViewWrapper
      as="span"
      className={`inline-flex h-[1lh] items-baseline gap-1 rounded-sm px-0.5 align-baseline font-medium leading-[inherit] ${visualStrategy.colorClassName} ${
        selected ? visualStrategy.selectedClassName : ""
      }`}
      contentEditable={false}
      data-token-kind={token.kind}
    >
      <TokenVisualIcon className="size-3.5 shrink-0 self-center" token={token} />
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
    return serializeChatComposerToken(readTokenAttributes(node.attrs as Record<string, unknown>));
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
      contextMenuStatus = "ready",
      initialValue = "",
      isDisabled = false,
      maxHeight = 240,
      minHeight = 56,
      onEmptyChange,
      onSubmit,
      placeholder = "输入任何问题",
      slashMenuItems = [],
    },
    ref,
  ) {
    const [isEmpty, setIsEmpty] = useState(() => !initialValue.trim());
    const [suggestionMenu, setSuggestionMenu] = useState<SuggestionMenuState | null>(null);
    const isEmptyRef = useRef(!initialValue.trim());
    const isDisabledRef = useRef(isDisabled);
    const onEmptyChangeRef = useRef(onEmptyChange);
    const onSubmitRef = useRef(onSubmit);
    const suggestionMenuId = useId();
    const editorContainerRef = useRef<HTMLDivElement>(null);
    const suggestionMenuRef = useRef<HTMLDivElement>(null);
    const suggestionMenuStateRef = useRef<SuggestionMenuState | null>(null);
    const filteredSuggestionItemsRef = useRef<readonly ChatComposerToken[]>([]);
    const selectSuggestionTokenRef = useRef<(token: ChatComposerToken) => void>(() => undefined);
    isDisabledRef.current = isDisabled;
    onEmptyChangeRef.current = onEmptyChange;
    onSubmitRef.current = onSubmit;

    const updateEmptyState = (nextValue: string) => {
      const nextIsEmpty = !nextValue.trim();
      if (isEmptyRef.current === nextIsEmpty) return;

      isEmptyRef.current = nextIsEmpty;
      setIsEmpty(nextIsEmpty);
      onEmptyChangeRef.current?.(nextIsEmpty);
    };

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
      content: createEditorDocument(initialValue),
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
          if (!isDisabledRef.current) onSubmitRef.current(event.metaKey || event.ctrlKey);
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
        updateEmptyState(currentEditor.getText({ blockSeparator: "\n" }));
        updateSuggestionMenu(currentEditor);
      },
    });

    const activeMenuItems = suggestionMenu?.trigger === "@" ? contextMenuItems : slashMenuItems;
    const searchableSuggestionItems = useMemo(
      () =>
        activeMenuItems.map((token) => ({
          searchText: createTokenSearchText(token),
          token,
        })),
      [activeMenuItems],
    );
    const matchingSuggestionItems = useMemo(() => {
      const normalizedQuery = suggestionMenu?.query.trim().toLowerCase() ?? "";
      if (!normalizedQuery) return activeMenuItems;

      return searchableSuggestionItems
        .filter((item) => item.searchText.includes(normalizedQuery))
        .map((item) => item.token);
    }, [activeMenuItems, searchableSuggestionItems, suggestionMenu?.query]);

    const groupedSuggestionItems = useMemo(() => {
      const itemsByKind = new Map<ChatComposerTokenKind, ChatComposerToken[]>(
        tokenGroups.map((group) => [group.kind, []]),
      );
      for (const token of matchingSuggestionItems) itemsByKind.get(token.kind)?.push(token);

      return tokenGroups.flatMap((group) => {
        const items = itemsByKind.get(group.kind) ?? [];
        return items.length > 0 ? [{ ...group, items }] : [];
      });
    }, [matchingSuggestionItems]);

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
        clear: () => {
          if (!editor) return;
          editor.commands.setContent(createEditorDocument(""), { emitUpdate: false });
          setSuggestionMenu(null);
          updateEmptyState("");
        },
        focus: () => {
          editor?.commands.focus();
        },
        getTokens: () => (editor ? readDocumentTokens(editor.getJSON()) : []),
        getValue: () => editor?.getText({ blockSeparator: "\n" }) ?? "",
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
        setValue: (nextValue) => {
          if (!editor) return;
          editor.commands.setContent(createEditorDocument(nextValue), { emitUpdate: false });
          editor.commands.focus("end");
          setSuggestionMenu(null);
          updateEmptyState(nextValue);
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
            <Surface
              className="flex flex-col rounded-2xl p-2 shadow-overlay"
              style={{ maxHeight: suggestionMenu.maxHeight }}
            >
              {filteredSuggestionItems.length > 0 ? (
                <Virtualizer layout={ListLayout} layoutOptions={SUGGESTION_MENU_LAYOUT_OPTIONS}>
                  <ListBox
                    id={suggestionMenuId}
                    aria-label={
                      suggestionMenu.trigger === "@"
                        ? "添加图片、文件或文件夹上下文"
                        : "插入命令或 Skill"
                    }
                    className="min-h-0 overflow-y-auto"
                    items={groupedSuggestionItems}
                    selectedKeys={
                      selectedSuggestionItem ? [getTokenKey(selectedSuggestionItem)] : []
                    }
                    selectionMode="single"
                    style={{ maxHeight: Math.max(suggestionMenu.maxHeight - 16, 0) }}
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
                    {(group) => (
                      <ListBox.Section id={group.kind}>
                        <Header className="px-2 pb-1 pt-2 text-xs font-medium text-muted first:pt-1">
                          {group.label}
                        </Header>
                        {group.items.map((token) => {
                          const visualStrategy = getTokenVisualStrategy(token.kind);
                          return (
                            <ListBox.Item
                              key={getTokenKey(token)}
                              id={getTokenKey(token)}
                              textValue={token.label}
                              onPress={() => selectSuggestionTokenRef.current(token)}
                            >
                              <TokenVisualIcon
                                className={`size-4 shrink-0 ${visualStrategy.colorClassName}`}
                                token={token}
                              />
                              <span className="min-w-0 truncate">{token.label}</span>
                            </ListBox.Item>
                          );
                        })}
                      </ListBox.Section>
                    )}
                  </ListBox>
                </Virtualizer>
              ) : (
                <div className="px-3 py-6 text-center text-sm text-muted">
                  {suggestionMenu.trigger === "@" && contextMenuStatus === "loading"
                    ? "正在扫描 Workspace..."
                    : suggestionMenu.trigger === "@" && contextMenuStatus === "error"
                      ? "Workspace 上下文加载失败"
                      : "没有匹配的内容"}
                </div>
              )}
            </Surface>
          </div>
        ) : null}
        <div className="relative overflow-y-auto px-3 pt-2" style={{ maxHeight, minHeight }}>
          {isEmpty ? (
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
