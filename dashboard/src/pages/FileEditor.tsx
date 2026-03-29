import { useCallback, useEffect, useState } from "react";
import { Link, useParams, useSearchParams } from "react-router-dom";
import { CommitForm } from "@/components/CommitForm";
import { FileTree } from "@/components/FileTree";
import { Header } from "@/components/Header";
import { Button } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { Select } from "@/components/ui/Select";
import { Skeleton } from "@/components/ui/Skeleton";
import { useBranches, useProjectFiles } from "@/hooks/queries";
import { api } from "@/lib/api";

interface FileEntry {
  path: string;
  sha: string;
  size: number;
}

export function FileEditor() {
  const { name } = useParams<{ name: string }>();
  const [searchParams, setSearchParams] = useSearchParams();
  const branch = searchParams.get("branch") ?? "main";

  const { data: branchData } = useBranches(name ?? "");
  const { data: filesData, isLoading: filesLoading, refetch: refetchFiles } = useProjectFiles(name ?? "", branch, "");

  const [selectedPath, setSelectedPath] = useState<string | null>(null);
  const [fileContent, setFileContent] = useState("");
  const [originalContent, setOriginalContent] = useState("");
  const [loadingFile, setLoadingFile] = useState(false);
  const [modifiedFiles, setModifiedFiles] = useState<Map<string, string>>(new Map());

  const branches = branchData?.branches ?? [];
  const files = filesData?.files ?? [];

  const loadFile = useCallback(
    async (path: string) => {
      setLoadingFile(true);
      try {
        const data = await api.get<{ content: string }>(`/projects/${name}/files/${path}?branch=${branch}`);
        const existing = modifiedFiles.get(path);
        setFileContent(existing ?? data.content);
        setOriginalContent(data.content);
        setSelectedPath(path);
      } finally {
        setLoadingFile(false);
      }
    },
    [name, branch, modifiedFiles],
  );

  useEffect(() => {
    setSelectedPath(null);
    setModifiedFiles(new Map());
  }, [branch]);

  function handleContentChange(content: string) {
    setFileContent(content);
    if (selectedPath) {
      const updated = new Map(modifiedFiles);
      if (content !== originalContent) {
        updated.set(selectedPath, content);
      } else {
        updated.delete(selectedPath);
      }
      setModifiedFiles(updated);
    }
  }

  function handleCommitSuccess() {
    setModifiedFiles(new Map());
    setOriginalContent(fileContent);
    refetchFiles();
  }

  const commitFiles = Array.from(modifiedFiles.entries()).map(([path, content]) => ({ path, content }));

  return (
    <>
      <nav className="flex items-center gap-2 text-[13px] text-[var(--color-text-quaternary)] mb-6">
        <Link to="/projects" className="hover:text-[var(--color-text-secondary)] transition-colors">
          Projects
        </Link>
        <span>/</span>
        <Link to={`/projects/${name}`} className="hover:text-[var(--color-text-secondary)] transition-colors">
          {name}
        </Link>
        <span>/</span>
        <span className="text-[var(--color-text-secondary)]">Editor</span>
      </nav>

      <Header
        title="File Editor"
        description={`Edit files in ${name}`}
        actions={
          <div className="flex items-center gap-2">
            <Select
              value={branch}
              onChange={(e) => setSearchParams({ branch: e.target.value })}
              options={branches.map((b) => ({ value: b, label: b }))}
              className="w-36"
            />
            <Link to={`/projects/${name}`}>
              <Button variant="ghost" size="sm">
                Back
              </Button>
            </Link>
          </div>
        }
      />

      <div className="grid grid-cols-[280px_1fr] gap-4">
        <Card className="overflow-hidden">
          {filesLoading ? (
            <div className="space-y-2 p-2">
              {[1, 2, 3, 4, 5].map((i) => (
                <Skeleton key={i} className="h-5 w-full" />
              ))}
            </div>
          ) : (
            <FileTree files={files} selectedPath={selectedPath} onSelect={loadFile} />
          )}
        </Card>

        <div className="space-y-4">
          <Card>
            {!selectedPath ? (
              <p className="text-[13px] text-[var(--color-text-quaternary)] py-8 text-center">
                Select a file to edit
              </p>
            ) : loadingFile ? (
              <div className="space-y-2">
                <Skeleton className="h-4 w-48" />
                <Skeleton className="h-64 w-full" />
              </div>
            ) : (
              <div>
                <div className="flex items-center justify-between mb-3">
                  <code className="text-[12px] text-[var(--color-text-secondary)]">{selectedPath}</code>
                  {modifiedFiles.has(selectedPath) && (
                    <span className="text-[10px] text-[var(--color-warning-text)] bg-[var(--color-warning-text)]/10 px-1.5 py-0.5 rounded">
                      Modified
                    </span>
                  )}
                </div>
                <textarea
                  value={fileContent}
                  onChange={(e) => handleContentChange(e.target.value)}
                  className="w-full h-96 p-3 rounded-md text-[12px] font-mono leading-relaxed bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] resize-y"
                  spellCheck={false}
                />
              </div>
            )}
          </Card>

          {commitFiles.length > 0 && name && (
            <Card>
              <CommitForm
                projectName={name}
                branches={branches}
                files={commitFiles}
                onSuccess={handleCommitSuccess}
              />
            </Card>
          )}
        </div>
      </div>
    </>
  );
}
