import Editor, { type OnMount, loader } from "@monaco-editor/react";
import { useRef } from "react";

// Map file extensions to Monaco languages
const EXT_TO_LANG: Record<string, string> = {
  ts: "typescript",
  tsx: "typescript",
  js: "javascript",
  jsx: "javascript",
  mjs: "javascript",
  cjs: "javascript",
  json: "json",
  html: "html",
  css: "css",
  scss: "scss",
  svg: "xml",
  xml: "xml",
  md: "markdown",
  mdx: "markdown",
  yml: "yaml",
  yaml: "yaml",
  toml: "ini",
  sh: "shell",
  bash: "shell",
  zsh: "shell",
  go: "go",
  java: "java",
  py: "python",
  rs: "rust",
  sql: "sql",
  astro: "html",
  vue: "html",
  svelte: "html",
};

function getLanguage(filePath: string): string {
  const ext = filePath.split(".").pop()?.toLowerCase() ?? "";
  const name = filePath.split("/").pop() ?? "";

  if (name === "Dockerfile") return "dockerfile";
  if (name === "Makefile") return "makefile";

  return EXT_TO_LANG[ext] ?? "plaintext";
}

// Define custom dark theme
loader.init().then((monaco) => {
  monaco.editor.defineTheme("veriel-dark", {
    base: "vs-dark",
    inherit: true,
    rules: [
      { token: "comment", foreground: "6A737D", fontStyle: "italic" },
      { token: "keyword", foreground: "FF7B72" },
      { token: "string", foreground: "A5D6FF" },
      { token: "number", foreground: "79C0FF" },
      { token: "type", foreground: "FFA657" },
      { token: "function", foreground: "D2A8FF" },
      { token: "variable", foreground: "FFA657" },
      { token: "constant", foreground: "79C0FF" },
      { token: "operator", foreground: "FF7B72" },
      { token: "delimiter", foreground: "C9D1D9" },
      { token: "tag", foreground: "7EE787" },
      { token: "attribute.name", foreground: "79C0FF" },
      { token: "attribute.value", foreground: "A5D6FF" },
    ],
    colors: {
      "editor.background": "#0d1117",
      "editor.foreground": "#c9d1d9",
      "editor.lineHighlightBackground": "#161b22",
      "editor.selectionBackground": "#264f78",
      "editor.inactiveSelectionBackground": "#1c3050",
      "editorCursor.foreground": "#c9d1d9",
      "editorLineNumber.foreground": "#484f58",
      "editorLineNumber.activeForeground": "#8b949e",
      "editorIndentGuide.background": "#21262d",
      "editorIndentGuide.activeBackground": "#30363d",
      "editor.selectionHighlightBackground": "#264f7844",
      "editorBracketMatch.background": "#264f7844",
      "editorBracketMatch.border": "#264f78",
      "scrollbarSlider.background": "#484f5833",
      "scrollbarSlider.hoverBackground": "#484f5866",
      "scrollbarSlider.activeBackground": "#484f58aa",
    },
  });
});

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  filePath: string;
  readOnly?: boolean;
}

export function CodeEditor({ value, onChange, filePath, readOnly = false }: CodeEditorProps) {
  const editorRef = useRef<Parameters<OnMount>[0] | null>(null);

  const handleMount: OnMount = (editor) => {
    editorRef.current = editor;
    editor.focus();
  };

  return (
    <Editor
      height="500px"
      language={getLanguage(filePath)}
      value={value}
      theme="veriel-dark"
      onChange={(v) => onChange(v ?? "")}
      onMount={handleMount}
      options={{
        readOnly,
        fontSize: 13,
        fontFamily: "'JetBrains Mono', 'Fira Code', 'Cascadia Code', Menlo, monospace",
        fontLigatures: true,
        minimap: { enabled: false },
        scrollBeyondLastLine: false,
        lineNumbers: "on",
        renderLineHighlight: "line",
        cursorBlinking: "smooth",
        cursorSmoothCaretAnimation: "on",
        smoothScrolling: true,
        bracketPairColorization: { enabled: true },
        automaticLayout: true,
        tabSize: 2,
        wordWrap: "on",
        padding: { top: 12, bottom: 12 },
        scrollbar: {
          verticalScrollbarSize: 8,
          horizontalScrollbarSize: 8,
        },
      }}
    />
  );
}
