import { useVirtualizer } from "@tanstack/react-virtual";
import { useRef, useState } from "react";
import { Header } from "@/components/Header";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SkeletonTable } from "@/components/ui/Skeleton";
import { useAuditLog, useProjects } from "@/hooks/queries";
import { timeAgo } from "@/lib/utils";

const actionColors: Record<string, string> = {
	deploy: "text-[var(--color-env-des)]",
	promote: "text-[var(--color-env-pre)]",
	rollback: "text-[var(--color-warning-text)]",
	project_delete: "text-[var(--color-error-text)]",
};

const ROW_HEIGHT = 41;
const VIRTUALIZE_THRESHOLD = 50;
const VISIBLE_ROWS = 20;

interface AuditEntry {
	id: number;
	action: string;
	resource: string;
	detail: Record<string, unknown>;
	actor: string;
	timestamp: string;
}

export function AuditLog() {
	const [resource, setResource] = useState<string>("");
	const { data, isLoading } = useAuditLog(resource || undefined);
	const { data: projectsData } = useProjects();

	const entries: AuditEntry[] = data?.entries ?? [];
	const projects = projectsData?.projects ?? [];

	return (
		<>
			<Header title="Audit Log" description="History of all operations" />

			<div className="mb-4">
				<select
					value={resource}
					onChange={(e) => setResource(e.target.value)}
					className="h-9 px-3 rounded-md text-[13px] bg-[var(--color-bg)] border border-[var(--color-border)] text-[var(--color-text-primary)] focus:outline-none focus:ring-1 focus:ring-[var(--color-text-quaternary)]"
				>
					<option value="">All projects</option>
					{projects.map((p: { name: string }) => (
						<option key={p.name} value={p.name}>
							{p.name}
						</option>
					))}
				</select>
			</div>

			<Card padding={false}>
				{isLoading ? (
					<SkeletonTable rows={8} />
				) : entries.length > 0 ? (
					entries.length > VIRTUALIZE_THRESHOLD ? (
						<VirtualizedAuditTable entries={entries} />
					) : (
						<table className="w-full text-[13px]">
							<AuditTableHead />
							<tbody>
								{entries.map((entry) => (
									<AuditRow key={entry.id} entry={entry} />
								))}
							</tbody>
						</table>
					)
				) : (
					<EmptyState title="No audit entries" />
				)}
			</Card>
		</>
	);
}

function VirtualizedAuditTable({ entries }: { entries: AuditEntry[] }) {
	const scrollRef = useRef<HTMLDivElement>(null);

	const virtualizer = useVirtualizer({
		count: entries.length,
		getScrollElement: () => scrollRef.current,
		estimateSize: () => ROW_HEIGHT,
		overscan: 10,
	});

	const virtualItems = virtualizer.getVirtualItems();
	const paddingTop = virtualItems[0]?.start ?? 0;
	const paddingBottom = virtualizer.getTotalSize() - (virtualItems.at(-1)?.end ?? 0);

	return (
		<div
			ref={scrollRef}
			className="overflow-y-auto"
			style={{ maxHeight: ROW_HEIGHT * VISIBLE_ROWS }}
		>
			<table className="w-full text-[13px]">
				<AuditTableHead sticky />
				<tbody>
					{paddingTop > 0 && (
						<tr>
							<td colSpan={5} style={{ height: paddingTop, padding: 0 }} />
						</tr>
					)}
					{virtualItems.map((vRow) => {
						const entry = entries[vRow.index];
						return <AuditRow key={entry.id} entry={entry} />;
					})}
					{paddingBottom > 0 && (
						<tr>
							<td colSpan={5} style={{ height: paddingBottom, padding: 0 }} />
						</tr>
					)}
				</tbody>
			</table>
		</div>
	);
}

function AuditTableHead({ sticky }: { sticky?: boolean }) {
	const stickyClass = sticky ? "sticky top-0 z-10 bg-[var(--color-bg-secondary)]" : "";
	return (
		<thead className={stickyClass}>
			<tr className="border-b border-[var(--color-border)]">
				<th className="text-left py-2.5 px-4 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
					Action
				</th>
				<th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
					Resource
				</th>
				<th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
					Detail
				</th>
				<th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
					Actor
				</th>
				<th className="text-left py-2.5 px-3 text-[11px] font-medium text-[var(--color-text-quaternary)] uppercase tracking-wider">
					When
				</th>
			</tr>
		</thead>
	);
}

function AuditRow({ entry }: { entry: AuditEntry }) {
	return (
		<tr className="border-b border-[var(--color-border)] last:border-0 hover:bg-[var(--color-bg-hover)] transition-colors duration-100">
			<td className="py-2.5 px-4">
				<span
					className={`text-[12px] font-medium ${actionColors[entry.action] ?? "text-[var(--color-text-secondary)]"}`}
				>
					{entry.action}
				</span>
			</td>
			<td className="py-2.5 px-3">
				<span className="text-[12px] text-[var(--color-text-primary)]">{entry.resource}</span>
			</td>
			<td className="py-2.5 px-3">
				<code className="text-[11px] text-[var(--color-text-tertiary)]">
					{formatDetail(entry.detail)}
				</code>
			</td>
			<td className="py-2.5 px-3">
				<span className="text-[12px] text-[var(--color-text-quaternary)]">{entry.actor}</span>
			</td>
			<td className="py-2.5 px-3">
				<span className="text-[12px] text-[var(--color-text-quaternary)]">
					{timeAgo(entry.timestamp)}
				</span>
			</td>
		</tr>
	);
}

function formatDetail(detail: Record<string, unknown>): string {
	const keys = Object.keys(detail);
	if (keys.length === 0) return "\u2014";
	return keys.map((k) => `${k}: ${detail[k]}`).join(", ");
}
