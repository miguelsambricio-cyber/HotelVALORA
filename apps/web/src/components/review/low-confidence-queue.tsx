"use client";

import { useState } from "react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useApproveAlias, useDeactivateAlias, useLowConfidenceAliases } from "@/lib/api/review";
import type { LowConfidenceAlias } from "@/types/review";

function ConfidenceBar({ value }: { value: number }) {
  const pct = Math.round(value * 100);
  const color =
    pct >= 50 ? "bg-amber-400" : "bg-rose-400";

  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-20 rounded-full bg-muted overflow-hidden">
        <div
          className={`h-full rounded-full ${color}`}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="text-xs tabular-nums text-muted-foreground">{pct}%</span>
    </div>
  );
}

const TYPE_COLORS: Record<string, string> = {
  canonical: "bg-violet-100 text-violet-700",
  common: "bg-blue-100 text-blue-700",
  multilingual: "bg-cyan-100 text-cyan-700",
  operator: "bg-orange-100 text-orange-700",
  historical: "bg-stone-100 text-stone-700",
  source_raw: "bg-gray-100 text-gray-600",
};

interface RowActionsProps {
  alias: LowConfidenceAlias;
}

function RowActions({ alias }: RowActionsProps) {
  const { mutate: approve, isPending: approving } = useApproveAlias();
  const { mutate: deactivate, isPending: deactivating } = useDeactivateAlias();

  function handleApprove() {
    approve(alias.id, {
      onSuccess: () => toast.success(`Approved "${alias.alias_text}"`),
      onError: () => toast.error("Failed to approve alias"),
    });
  }

  function handleDeactivate() {
    deactivate(alias.id, {
      onSuccess: () => toast.success(`Deactivated "${alias.alias_text}"`),
      onError: () => toast.error("Failed to deactivate alias"),
    });
  }

  return (
    <div className="flex gap-2 justify-end">
      <Button
        size="sm"
        onClick={handleApprove}
        disabled={approving || deactivating}
        title="Mark as manually verified — removes from review queue"
      >
        {approving ? "…" : "Approve"}
      </Button>
      <Button
        size="sm"
        variant="outline"
        onClick={handleDeactivate}
        disabled={approving || deactivating}
        title="Soft-delete this alias"
      >
        {deactivating ? "…" : "Deactivate"}
      </Button>
    </div>
  );
}

export function LowConfidenceQueue() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useLowConfidenceAliases(page);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-4">Loading low-confidence aliases…</p>
    );
  }
  if (error) {
    return (
      <p className="text-sm text-red-500 p-4">Failed to load aliases.</p>
    );
  }

  const aliases = data?.data ?? [];
  const meta = data?.meta;

  return (
    <Card>
      <CardContent className="p-0">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
              <th className="px-4 py-3">Alias</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Confidence</th>
              <th className="px-4 py-3">Asset ID</th>
              <th className="px-4 py-3" />
            </tr>
          </thead>
          <tbody>
            {aliases.length === 0 && (
              <tr>
                <td
                  colSpan={5}
                  className="px-4 py-10 text-center text-muted-foreground"
                >
                  No low-confidence aliases — queue is clear.
                </td>
              </tr>
            )}
            {aliases.map((a) => (
              <tr
                key={a.id}
                className="border-b last:border-0 hover:bg-muted/30"
              >
                <td className="px-4 py-3">
                  <p className="font-medium">{a.alias_text}</p>
                  <p className="text-xs font-mono text-muted-foreground">{a.alias_key}</p>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                      TYPE_COLORS[a.alias_type] ?? "bg-gray-100 text-gray-600"
                    }`}
                  >
                    {a.alias_type}
                  </span>
                </td>
                <td className="px-4 py-3">
                  {a.confidence != null ? (
                    <ConfidenceBar value={a.confidence} />
                  ) : (
                    <span className="text-xs text-muted-foreground">—</span>
                  )}
                </td>
                <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                  {a.asset_id ? a.asset_id.slice(0, 8) + "…" : "—"}
                </td>
                <td className="px-4 py-3">
                  <RowActions alias={a} />
                </td>
              </tr>
            ))}
          </tbody>
        </table>

        {meta && (meta.offset > 0 || meta.has_next) && (
          <div className="flex items-center justify-between border-t px-4 py-3 text-sm text-muted-foreground">
            <span>
              {meta.offset + 1}–{Math.min(meta.offset + meta.limit, meta.total)} of{" "}
              {meta.total}
            </span>
            <div className="flex gap-2">
              <Button
                size="sm"
                variant="outline"
                disabled={page === 0}
                onClick={() => setPage((p) => p - 1)}
              >
                Previous
              </Button>
              <Button
                size="sm"
                variant="outline"
                disabled={!meta.has_next}
                onClick={() => setPage((p) => p + 1)}
              >
                Next
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
