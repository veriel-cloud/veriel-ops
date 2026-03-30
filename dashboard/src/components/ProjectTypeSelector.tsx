import { useEffect, useRef, useState } from "react";
import type { ProjectType } from "@veriel-ops/shared";
import { ALL_PROJECT_TYPES, PROJECT_TYPE_UI } from "@veriel-ops/shared";
import { IconBrandAstro, IconBrandGolang, IconBrandReact, IconChevronDown, IconFlame } from "@tabler/icons-react";
import { cn } from "@/lib/utils";

function SpringIcon({ size = 16 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 128 128" fill="#6DB33F">
      <path d="M116.452 6.643a59.104 59.104 0 01-6.837 12.136A64.249 64.249 0 0064.205-.026C28.984-.026 0 28.982 0 64.242a64.316 64.316 0 0019.945 46.562l2.368 2.1a64.22 64.22 0 0041.358 15.122c33.487 0 61.637-26.24 64.021-59.683 1.751-16.371-3.051-37.077-11.24-61.7zM29.067 111.17a5.5 5.5 0 01-4.269 2.034c-3.018 0-5.487-2.484-5.487-5.502 0-3.017 2.485-5.501 5.487-5.501 1.25 0 2.485.433 3.452 1.234 2.351 1.9 2.718 5.384.817 7.735zm87.119-19.238c-15.843 21.122-49.68 14.003-71.376 15.02 0 0-3.852.234-7.721.867 0 0 1.45-.617 3.335-1.334 15.226-5.301 22.43-6.335 31.685-11.086 17.427-8.869 34.654-28.274 38.24-48.463-6.637 19.422-26.75 36.11-45.077 42.895-12.557 4.635-35.238 9.136-35.238 9.136l-.917-.484c-15.442-7.518-15.91-40.977 12.157-51.78 12.291-4.735 24.048-2.134 37.323-5.302 14.175-3.367 30.568-14.004 37.238-27.874 7.471 22.19 16.46 56.932.35 78.405z" />
    </svg>
  );
}

const TYPE_ICONS: Record<ProjectType, React.ReactNode> = {
  "astro-static": <IconBrandAstro size={16} stroke={1.5} color="#FF5D01" />,
  "astro-ssr": <IconBrandAstro size={16} stroke={1.5} color="#FF5D01" />,
  "react-spa": <IconBrandReact size={16} stroke={1.5} color="#61DAFB" />,
  "hono-api": <IconFlame size={16} stroke={1.5} color="#FF6633" />,
  "go-fiber": <IconBrandGolang size={16} stroke={1.5} color="#00ADD8" />,
  "spring-boot": <SpringIcon size={16} />,
};

interface ProjectTypeSelectorProps {
  value: ProjectType;
  onChange: (type: ProjectType) => void;
}

export function ProjectTypeSelector({ value, onChange }: ProjectTypeSelectorProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const selected = PROJECT_TYPE_UI[value];

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between h-9 px-3 rounded-md text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] hover:border-[var(--color-border-hover)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)] transition-colors cursor-pointer"
      >
        <span className="flex items-center gap-2">
          <span>{TYPE_ICONS[value]}</span>
          {selected.label}
        </span>
        <IconChevronDown size={14} stroke={1.5} className={cn("text-[var(--color-text-quaternary)] transition-transform", open && "rotate-180")} />
      </button>

      {open && (
        <div className="absolute z-50 mt-1 w-full rounded-md border border-[var(--color-border)] bg-[var(--color-bg)] shadow-lg overflow-hidden">
          {ALL_PROJECT_TYPES.map((type) => {
            const config = PROJECT_TYPE_UI[type];
            const isSelected = type === value;
            return (
              <button
                key={type}
                type="button"
                onClick={() => {
                  onChange(type);
                  setOpen(false);
                }}
                className={cn(
                  "w-full flex items-start gap-2.5 px-3 py-2.5 text-left transition-colors",
                  isSelected
                    ? "bg-[var(--color-bg-hover)]"
                    : "hover:bg-[var(--color-bg-hover)]",
                )}
              >
                <span className="mt-0.5">{TYPE_ICONS[type]}</span>
                <div className="flex-1 min-w-0">
                  <p className={cn("text-[13px]", isSelected ? "text-white" : "text-[var(--color-text-primary)]")}>
                    {config.label}
                  </p>
                  <p className="text-[11px] text-[var(--color-text-quaternary)] truncate">
                    {config.description}
                  </p>
                </div>
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
