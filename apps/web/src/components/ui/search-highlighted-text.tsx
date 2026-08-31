import {
  Children,
  cloneElement,
  createContext,
  Fragment,
  isValidElement,
  type ReactNode,
  useContext,
} from "react";

interface SearchHighlightContextValue {
  onComplete?: () => void;
  query: string;
}

const SearchHighlightContext = createContext<SearchHighlightContextValue | null>(null);

function highlightText(value: string, query: string, onComplete?: () => void): ReactNode {
  const normalizedValue = value.toLocaleLowerCase();
  const normalizedQuery = query.toLocaleLowerCase();
  const parts: ReactNode[] = [];
  let cursor = 0;

  while (cursor < value.length) {
    const matchIndex = normalizedValue.indexOf(normalizedQuery, cursor);
    if (matchIndex < 0) break;
    if (matchIndex > cursor) parts.push(value.slice(cursor, matchIndex));
    parts.push(
      <mark
        className="search-keyword-highlight"
        key={`${matchIndex}-${parts.length}`}
        onAnimationEnd={onComplete}
      >
        {value.slice(matchIndex, matchIndex + query.length)}
      </mark>,
    );
    cursor = matchIndex + query.length;
  }

  if (cursor === 0) return value;
  if (cursor < value.length) parts.push(value.slice(cursor));
  return parts;
}

function highlightNode(node: ReactNode, query: string, onComplete?: () => void): ReactNode {
  if (typeof node === "string") return highlightText(node, query, onComplete);
  if (!isValidElement<{ children?: ReactNode }>(node) || node.props.children === undefined) {
    return node;
  }
  return cloneElement(
    node,
    undefined,
    Children.map(node.props.children, (child) => highlightNode(child, query, onComplete)),
  );
}

export function SearchHighlightProvider({
  children,
  onComplete,
  query,
}: {
  children: ReactNode;
  onComplete?: () => void;
  query: string;
}) {
  const value = onComplete === undefined ? { query } : { onComplete, query };
  return (
    <SearchHighlightContext.Provider value={value}>{children}</SearchHighlightContext.Provider>
  );
}

export function SearchHighlightedText({ children }: { children: ReactNode }) {
  const highlight = useContext(SearchHighlightContext);
  if (!highlight?.query) return <Fragment>{children}</Fragment>;
  return (
    <Fragment>
      {Children.map(children, (child) =>
        highlightNode(child, highlight.query, highlight.onComplete),
      )}
    </Fragment>
  );
}
