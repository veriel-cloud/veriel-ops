import { useMemo, useState } from "react";
import { getFileIcon, getFolderIcon } from "@/lib/file-icons";
import { cn } from "@/lib/utils";

interface FileEntry {
  path: string;
  sha: string;
  size: number;
}

interface FileTreeProps {
  files: FileEntry[];
  selectedPath: string | null;
  onSelect: (path: string) => void;
}

interface TreeNode {
  name: string;
  path: string;
  isDir: boolean;
  children: TreeNode[];
}

function buildTree(files: FileEntry[]): TreeNode[] {
  const root: TreeNode[] = [];

  for (const file of files) {
    const parts = file.path.split("/");
    let current = root;

    for (let i = 0; i < parts.length; i++) {
      const name = parts[i];
      const isLast = i === parts.length - 1;
      const path = parts.slice(0, i + 1).join("/");

      let node = current.find((n) => n.name === name);
      if (!node) {
        node = { name, path, isDir: !isLast, children: [] };
        current.push(node);
      }
      current = node.children;
    }
  }

  function sort(nodes: TreeNode[]): TreeNode[] {
    return nodes
      .sort((a, b) => {
        if (a.isDir !== b.isDir) return a.isDir ? -1 : 1;
        return a.name.localeCompare(b.name);
      })
      .map((n) => ({ ...n, children: sort(n.children) }));
  }

  return sort(root);
}

function TreeItem({
  node,
  depth,
  selectedPath,
  onSelect,
}: { node: TreeNode; depth: number; selectedPath: string | null; onSelect: (path: string) => void }) {
  const [expanded, setExpanded] = useState(depth < 1);

  if (node.isDir) {
    const folderIcon = getFolderIcon(expanded);
    return (
      <>
        <button
          type="button"
          onClick={() => setExpanded(!expanded)}
          className="w-full text-left px-2 py-1 text-[12px] hover:bg-[var(--color-bg-hover)] transition-colors rounded text-[var(--color-text-secondary)] font-medium flex items-center gap-1.5"
          style={{ paddingLeft: `${depth * 14 + 8}px` }}
        >
          <span style={{ color: folderIcon.color }} className="flex-shrink-0">{folderIcon.icon}</span>
          {node.name}
        </button>
        {expanded && node.children.map((child) => (
          <TreeItem key={child.path} node={child} depth={depth + 1} selectedPath={selectedPath} onSelect={onSelect} />
        ))}
      </>
    );
  }

  const fileIcon = getFileIcon(node.name);
  return (
    <button
      type="button"
      onClick={() => onSelect(node.path)}
      className={cn(
        "w-full text-left px-2 py-1 text-[12px] hover:bg-[var(--color-bg-hover)] transition-colors rounded flex items-center gap-1.5",
        node.path === selectedPath
          ? "bg-[var(--color-bg-hover)] text-[var(--color-text-primary)]"
          : "text-[var(--color-text-tertiary)]",
      )}
      style={{ paddingLeft: `${depth * 14 + 8}px` }}
    >
      <span style={{ color: fileIcon.color }} className="flex-shrink-0">{fileIcon.icon}</span>
      {node.name}
    </button>
  );
}

export function FileTree({ files, selectedPath, onSelect }: FileTreeProps) {
  const tree = useMemo(() => buildTree(files), [files]);

  return (
    <div className="space-y-0.5 overflow-y-auto max-h-[600px]">
      {tree.map((node) => (
        <TreeItem key={node.path} node={node} depth={0} selectedPath={selectedPath} onSelect={onSelect} />
      ))}
    </div>
  );
}
