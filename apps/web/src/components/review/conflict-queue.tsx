"use client";

import { useState } from "react";
import { formatDistanceToNow } from "date-fns";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  useIgnoreConflict,
  useOpenConflicts,
  useResolveConflict,
} from "@/lib/api/review";
import type { AliasConflict } from "@/types/review";

function shortId(id: string) {
  return id.slice(0, 8) + "…";
}

// ── Resolve dialog ────────────────────────────────────────────────────────────

interface ResolveDialogProps {
  conflict: AliasConflict | null;
  onClose: () => void;
}

function ResolveDialog({ conflict, onClose }: ResolveDialogProps) {
  const [selectedId, setSelectedId] = useState<string>("");
  const [notes, setNotes] = useState("");
  const { mutate, isPending } = useResolveConflict();

  function handleSubmit() {
    if (!conflict || !selectedId) return;
    mutate(
      { conflictId: conflict.id, resolvedAssetId: selectedId, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Conflict resolved");
          onClose();
        },
        onError: () => toast.error("Failed to resolve conflict"),
      }
    );
  }

  return (
    <Dialog open={!!conflict} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Resolve Conflict</DialogTitle>
          <DialogDescription>
            Select which asset should own the alias{" "}
            <span className="font-mono font-medium">{conflict?.alias_text}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-2">
          {conflict?.conflicting_asset_ids.map((id) => (
            <button
              key={id}
              onClick={() => setSelectedId(id)}
              className={`w-full rounded-md border px-4 py-3 text-left text-sm font-mono transition-colors ${
                selectedId === id
                  ? "border-brand-600 bg-brand-50 text-brand-700"
                  : "border-border hover:bg-muted"
              }`}
            >
              <span className="text-xs text-muted-foreground mr-2">Asset</span>
              {id}
              {selectedId === id && (
                <span className="ml-2 text-xs font-sans text-brand-600">← winner</span>
              )}
            </button>
          ))}
        </div>

        <div className="mt-3">
          <label className="text-xs font-medium text-muted-foreground">
            Notes (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="Why this asset wins…"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={!selectedId || isPending}>
            {isPending ? "Resolving…" : "Resolve"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Ignore dialog ─────────────────────────────────────────────────────────────

interface IgnoreDialogProps {
  conflict: AliasConflict | null;
  onClose: () => void;
}

function IgnoreDialog({ conflict, onClose }: IgnoreDialogProps) {
  const [notes, setNotes] = useState("");
  const { mutate, isPending } = useIgnoreConflict();

  function handleSubmit() {
    if (!conflict) return;
    mutate(
      { conflictId: conflict.id, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Conflict ignored");
          onClose();
        },
        onError: () => toast.error("Failed to ignore conflict"),
      }
    );
  }

  return (
    <Dialog open={!!conflict} onOpenChange={(open) => !open && onClose()}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Ignore Conflict</DialogTitle>
          <DialogDescription>
            Mark{" "}
            <span className="font-mono font-medium">{conflict?.alias_text}</span> as an
            intentional overlap — both assets legitimately share this alias.
          </DialogDescription>
        </DialogHeader>

        <div>
          <label className="text-xs font-medium text-muted-foreground">
            Reason (optional)
          </label>
          <textarea
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            rows={2}
            placeholder="e.g. Homonyms in different cities"
            className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
          />
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={isPending}>
            Cancel
          </Button>
          <Button variant="outline" onClick={handleSubmit} disabled={isPending}>
            {isPending ? "Ignoring…" : "Ignore conflict"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main table ────────────────────────────────────────────────────────────────

export function ConflictQueue() {
  const [page, setPage] = useState(0);
  const { data, isLoading, error } = useOpenConflicts(page);
  const [resolving, setResolving] = useState<AliasConflict | null>(null);
  const [ignoring, setIgnoring] = useState<AliasConflict | null>(null);

  if (isLoading) {
    return (
      <p className="text-sm text-muted-foreground p-4">Loading conflicts…</p>
    );
  }
  if (error) {
    return <p className="text-sm text-red-500 p-4">Failed to load conflicts.</p>;
  }

  const conflicts = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <ResolveDialog conflict={resolving} onClose={() => setResolving(null)} />
      <IgnoreDialog conflict={ignoring} onClose={() => setIgnoring(null)} />

      <Card>
        <CardContent className="p-0">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                <th className="px-4 py-3">Alias</th>
                <th className="px-4 py-3">Key</th>
                <th className="px-4 py-3 text-right">Assets</th>
                <th className="px-4 py-3">Detected</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {conflicts.length === 0 && (
                <tr>
                  <td
                    colSpan={5}
                    className="px-4 py-10 text-center text-muted-foreground"
                  >
                    No open conflicts — queue is clear.
                  </td>
                </tr>
              )}
              {conflicts.map((c) => (
                <tr
                  key={c.id}
                  className="border-b last:border-0 hover:bg-muted/30"
                >
                  <td className="px-4 py-3 font-medium">{c.alias_text}</td>
                  <td className="px-4 py-3 font-mono text-xs text-muted-foreground">
                    {c.alias_key}
                  </td>
                  <td className="px-4 py-3 text-right">
                    <span className="inline-flex items-center rounded-full bg-amber-100 px-2 py-0.5 text-xs font-medium text-amber-700">
                      {c.conflicting_asset_ids.length}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(c.detected_at), { addSuffix: true })}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2 justify-end">
                      <Button
                        size="sm"
                        onClick={() => setResolving(c)}
                      >
                        Resolve
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => setIgnoring(c)}
                      >
                        Ignore
                      </Button>
                    </div>
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
    </>
  );
}
