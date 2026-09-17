import { UserContextReferenceKind } from "@pi-harness/agent-runtime/user-input";
import type { WorkspaceFileList } from "../api/workspace-api";

export interface FileTreeNode {
  children: FileTreeNode[];
  kind: WorkspaceFileList["items"][number]["kind"];
  name: string;
  path: string;
}

export interface VisibleFileTreeNode extends FileTreeNode {
  depth: number;
}

export function buildFileTree(items: WorkspaceFileList["items"]): FileTreeNode[] {
  const nodes = new Map<string, FileTreeNode>();
  for (const item of items) {
    const segments = item.path.split("/");
    let parentPath = "";
    for (const segment of segments.slice(0, -1)) {
      parentPath = parentPath ? `${parentPath}/${segment}` : segment;
      if (!nodes.has(parentPath)) {
        nodes.set(parentPath, {
          children: [],
          kind: UserContextReferenceKind.FOLDER,
          name: segment,
          path: parentPath,
        });
      }
    }
    nodes.set(item.path, {
      children: [],
      kind: item.kind,
      name: segments.at(-1) ?? item.path,
      path: item.path,
    });
  }

  const roots: FileTreeNode[] = [];
  for (const node of nodes.values()) {
    const parentPath = node.path.split("/").slice(0, -1).join("/");
    const parent = nodes.get(parentPath);
    if (parent) parent.children.push(node);
    else roots.push(node);
  }

  const sort = (left: FileTreeNode, right: FileTreeNode) => {
    const leftFolder = left.kind === UserContextReferenceKind.FOLDER;
    const rightFolder = right.kind === UserContextReferenceKind.FOLDER;
    return Number(rightFolder) - Number(leftFolder) || left.name.localeCompare(right.name);
  };
  for (const node of nodes.values()) node.children.sort(sort);
  return roots.sort(sort);
}

export function flattenFileTree(
  nodes: readonly FileTreeNode[],
  expandedPaths: ReadonlySet<string>,
  depth = 0,
  output: VisibleFileTreeNode[] = [],
): VisibleFileTreeNode[] {
  for (const node of nodes) {
    output.push({ ...node, depth });
    if (expandedPaths.has(node.path)) {
      flattenFileTree(node.children, expandedPaths, depth + 1, output);
    }
  }
  return output;
}
