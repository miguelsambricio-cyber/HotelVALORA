"use client";

import { useState } from "react";
import { toast } from "sonner";
import { GitMerge, Loader2, ScanLine, ShieldAlert, X } from "lucide-react";

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
  useAcceptRecommendation,
  useDismissRecommendation,
  useMergeRecommendationDetail,
  useMergeRecommendations,
  useRunScan,
} from "@/lib/api/dedup";
import type {
  AssetSnapshot,
  FalsePositiveSignal,
  MergeRecommendationDetail,
  MergeRecommendationListItem,
  RecommendationTier,
  ScoreBreakdown,
} from "@/types/dedup";

// ── Constants ──────────────────────────────────────────────────────────────

const TIER_CONFIG: Record<
  RecommendationTier,
  { label: string; bg: string; text: string; border: string }
> = {
  auto_merge:       { label: "Auto Merge",       bg: "bg-emerald-100", text: "text-emerald-700", border: "border-emerald-300" },
  needs_review:     { label: "Needs Review",      bg: "bg-amber-100",   text: "text-amber-700",   border: "border-amber-300" },
  likely_duplicate: { label: "Likely Duplicate",  bg: "bg-blue-100",    text: "text-blue-700",    border: "border-blue-300" },
  not_duplicate:    { label: "Not Duplicate",     bg: "bg-gray-100",    text: "text-gray-600",    border: "border-gray-200" },
};

const SIGNAL_LABELS: Record<string, string> = {
  disambiguation_token: "Disambiguation",
  star_rating_gap:      "Star Gap",
  room_count_ratio:     "Room Count",
  operator_mismatch:    "Operator",
  chain_scale_mismatch: "Chain Scale",
  geographic_distance:  "Distance",
};

// ── Score bar ──────────────────────────────────────────────────────────────

function ScoreBar({ score }: { score: number }) {
  const pct = Math.round(score * 100);
  const color =
    pct >= 85 ? "bg-emerald-500" : pct >= 65 ? "bg-amber-400" : "bg-rose-400";
  return (
    <div className="flex items-center gap-2">
      <div className="h-1.5 w-16 rounded-full bg-muted overflow-hidden">
        <div className={`h-full rounded-full ${color}`} style={{ width: `${pct}%` }} />
      </div>
      <span className="text-xs tabular-nums font-medium">{pct}%</span>
    </div>
  );
}

// ── Score breakdown table ─────────────────────────────────────────────────

function BreakdownTable({ breakdown }: { breakdown: ScoreBreakdown }) {
  const rows = [
    { key: "name_exact", label: "Name Exact" },
    { key: "name_fuzzy", label: "Name Fuzzy" },
    { key: "city",       label: "City" },
    { key: "operator",   label: "Operator" },
    { key: "address",    label: "Address" },
  ] as const;

  return (
    <table className="w-full text-xs">
      <thead>
        <tr className="border-b text-muted-foreground">
          <th className="text-left py-1.5 font-medium">Component</th>
          <th className="text-right py-1.5 font-medium">Weight</th>
          <th className="text-right py-1.5 font-medium">Score</th>
          <th className="text-left py-1.5 pl-3 font-medium">Detail</th>
        </tr>
      </thead>
      <tbody>
        {rows.map(({ key, label }) => {
          const c = breakdown[key];
          return (
            <tr key={key} className="border-b last:border-0">
              <td className="py-1.5 font-medium">{label}</td>
              <td className="py-1.5 text-right text-muted-foreground">
                {Math.round(c.weight * 100)}%
              </td>
              <td className="py-1.5 text-right">
                {c.score !== null ? (
                  <span
                    className={
                      c.score >= 0.85
                        ? "text-emerald-600 font-semibold"
                        : c.score >= 0.5
                        ? "text-amber-600"
                        : "text-rose-500"
                    }
                  >
                    {Math.round(c.score * 100)}%
                  </span>
                ) : (
                  <span className="text-muted-foreground">—</span>
                )}
              </td>
              <td className="py-1.5 pl-3 text-muted-foreground max-w-[160px] truncate">
                {c.detail}
              </td>
            </tr>
          );
        })}
      </tbody>
    </table>
  );
}

// ── Asset card ─────────────────────────────────────────────────────────────

function AssetCard({ snapshot, label }: { snapshot: AssetSnapshot; label: string }) {
  return (
    <div className="rounded-md border p-3 space-y-1 text-sm">
      <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
        {label}
      </p>
      <p className="font-semibold">{snapshot.asset_name}</p>
      <p className="text-muted-foreground">{snapshot.city}</p>
      {snapshot.operator && (
        <p className="text-xs text-muted-foreground">{snapshot.operator}</p>
      )}
      <div className="flex gap-3 text-xs text-muted-foreground pt-0.5">
        {snapshot.star_rating != null && (
          <span>{snapshot.star_rating}★</span>
        )}
        {snapshot.keys != null && <span>{snapshot.keys} keys</span>}
        {snapshot.chain_scale && <span>{snapshot.chain_scale}</span>}
      </div>
      {snapshot.address && (
        <p className="text-xs text-muted-foreground truncate">{snapshot.address}</p>
      )}
    </div>
  );
}

// ── Detail dialog ──────────────────────────────────────────────────────────

interface DetailDialogProps {
  recId: string | null;
  onClose: () => void;
}

function DetailDialog({ recId, onClose }: DetailDialogProps) {
  const [notes, setNotes] = useState("");
  const { data: rec, isLoading } = useMergeRecommendationDetail(recId);
  const { mutate: accept, isPending: accepting } = useAcceptRecommendation();
  const { mutate: dismiss, isPending: dismissing } = useDismissRecommendation();

  const busy = accepting || dismissing;

  function handleAccept() {
    if (!rec) return;
    accept(
      { id: rec.id, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Merge accepted — recorded in merge history");
          onClose();
        },
        onError: () => toast.error("Failed to accept recommendation"),
      }
    );
  }

  function handleDismiss() {
    if (!rec) return;
    dismiss(
      { id: rec.id, notes: notes || undefined },
      {
        onSuccess: () => {
          toast.success("Dismissed — this pair will not resurface");
          onClose();
        },
        onError: () => toast.error("Failed to dismiss recommendation"),
      }
    );
  }

  const tierCfg = rec ? TIER_CONFIG[rec.recommendation as RecommendationTier] : null;

  return (
    <Dialog open={!!recId} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <GitMerge className="h-4 w-4" />
            Merge Recommendation
          </DialogTitle>
          <DialogDescription>
            Review the scoring breakdown before making a decision.
          </DialogDescription>
        </DialogHeader>

        {isLoading || !rec ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="space-y-4">
            {/* Tier badge + score */}
            <div className="flex items-center gap-3">
              {tierCfg && (
                <span
                  className={`inline-flex items-center rounded-full border px-2.5 py-1 text-xs font-semibold ${tierCfg.bg} ${tierCfg.text} ${tierCfg.border}`}
                >
                  {tierCfg.label}
                </span>
              )}
              <ScoreBar score={Number(rec.final_score)} />
              <span className="text-xs text-muted-foreground">
                {rec.confidence_label} confidence
              </span>
            </div>

            {/* Rationale */}
            <p className="text-sm text-muted-foreground border-l-2 border-brand-300 pl-3 italic">
              {rec.rationale}
            </p>

            {/* Asset cards */}
            <div className="grid grid-cols-2 gap-3">
              <AssetCard snapshot={rec.asset_a_snapshot as AssetSnapshot} label="Asset A" />
              <AssetCard snapshot={rec.asset_b_snapshot as AssetSnapshot} label="Asset B" />
            </div>

            {/* Score breakdown */}
            <div>
              <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                Score Breakdown
              </p>
              <BreakdownTable breakdown={rec.score_breakdown as ScoreBreakdown} />
            </div>

            {/* False positive signals */}
            {(rec.false_positive_signals as FalsePositiveSignal[]).length > 0 && (
              <div>
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-2">
                  False Positive Signals
                </p>
                <div className="space-y-1.5">
                  {(rec.false_positive_signals as FalsePositiveSignal[]).map((sig, i) => (
                    <div
                      key={i}
                      className="flex items-start gap-2 rounded-md bg-amber-50 border border-amber-200 px-3 py-2 text-xs"
                    >
                      <ShieldAlert className="h-3.5 w-3.5 text-amber-600 mt-0.5 shrink-0" />
                      <div>
                        <span className="font-medium text-amber-700">
                          {SIGNAL_LABELS[sig.signal_type] ?? sig.signal_type}
                        </span>
                        <span className="text-amber-600 ml-1">{sig.detail}</span>
                      </div>
                      <span className="ml-auto text-amber-500 tabular-nums">
                        {Math.round(sig.severity * 100)}%
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Notes */}
            <div>
              <label className="text-xs font-medium text-muted-foreground">
                Review notes (optional)
              </label>
              <textarea
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Why accept or dismiss…"
                className="mt-1 w-full rounded-md border bg-background px-3 py-2 text-sm placeholder:text-muted-foreground focus:outline-none focus:ring-2 focus:ring-ring"
              />
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button
            variant="outline"
            onClick={handleDismiss}
            disabled={busy || !rec || rec.status !== "pending_review"}
          >
            <X className="h-3.5 w-3.5 mr-1.5" />
            {dismissing ? "Dismissing…" : "Dismiss"}
          </Button>
          <Button
            onClick={handleAccept}
            disabled={busy || !rec || rec.status !== "pending_review"}
          >
            <GitMerge className="h-3.5 w-3.5 mr-1.5" />
            {accepting ? "Accepting…" : "Accept Merge"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ── Main queue ─────────────────────────────────────────────────────────────

const TIER_FILTER_OPTIONS: { value: string; label: string }[] = [
  { value: "", label: "All tiers" },
  { value: "auto_merge", label: "Auto Merge" },
  { value: "needs_review", label: "Needs Review" },
  { value: "likely_duplicate", label: "Likely Duplicate" },
];

export function MergeQueue() {
  const [page, setPage] = useState(0);
  const [tierFilter, setTierFilter] = useState("");
  const [detailId, setDetailId] = useState<string | null>(null);
  const { data, isLoading, error } = useMergeRecommendations(
    page,
    20,
    "pending_review",
    tierFilter || undefined,
  );
  const { mutate: scan, isPending: scanning } = useRunScan();

  function handleScan() {
    scan(undefined, {
      onSuccess: (result) =>
        toast.success(
          `Scan complete — ${result.new_recommendations} new, ${result.updated_recommendations} updated`
        ),
      onError: () => toast.error("Scan failed"),
    });
  }

  if (isLoading) {
    return <p className="text-sm text-muted-foreground p-4">Loading recommendations…</p>;
  }
  if (error) {
    return <p className="text-sm text-red-500 p-4">Failed to load recommendations.</p>;
  }

  const items = data?.data ?? [];
  const meta = data?.meta;

  return (
    <>
      <DetailDialog recId={detailId} onClose={() => setDetailId(null)} />

      <div className="space-y-3">
        {/* Toolbar */}
        <div className="flex items-center justify-between gap-3">
          <div className="flex gap-2">
            {TIER_FILTER_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                onClick={() => { setTierFilter(opt.value); setPage(0); }}
                className={`rounded-full px-3 py-1 text-xs font-medium border transition-colors ${
                  tierFilter === opt.value
                    ? "bg-brand-600 text-white border-brand-600"
                    : "bg-background text-muted-foreground border-border hover:bg-muted"
                }`}
              >
                {opt.label}
              </button>
            ))}
          </div>
          <Button
            size="sm"
            variant="outline"
            onClick={handleScan}
            disabled={scanning}
          >
            <ScanLine className="h-3.5 w-3.5 mr-1.5" />
            {scanning ? "Scanning…" : "Run Scan"}
          </Button>
        </div>

        {/* Table */}
        <Card>
          <CardContent className="p-0">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b bg-muted/50 text-left text-xs text-muted-foreground">
                  <th className="px-4 py-3">Asset A</th>
                  <th className="px-4 py-3">Asset B</th>
                  <th className="px-4 py-3">Score</th>
                  <th className="px-4 py-3">Tier</th>
                  <th className="px-4 py-3">Signals</th>
                  <th className="px-4 py-3" />
                </tr>
              </thead>
              <tbody>
                {items.length === 0 && (
                  <tr>
                    <td colSpan={6} className="px-4 py-10 text-center text-muted-foreground">
                      No merge recommendations — queue is clear.
                    </td>
                  </tr>
                )}
                {items.map((rec) => (
                  <MergeRow
                    key={rec.id}
                    rec={rec}
                    onOpen={() => setDetailId(rec.id)}
                  />
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
      </div>
    </>
  );
}

function MergeRow({
  rec,
  onOpen,
}: {
  rec: MergeRecommendationListItem;
  onOpen: () => void;
}) {
  const snap_a = rec.asset_a_snapshot as AssetSnapshot;
  const snap_b = rec.asset_b_snapshot as AssetSnapshot;
  const tier = TIER_CONFIG[rec.recommendation as RecommendationTier] ?? TIER_CONFIG.not_duplicate;
  const signals = rec.false_positive_signals as FalsePositiveSignal[];
  const maxSeverity = signals.length
    ? Math.max(...signals.map((s) => s.severity))
    : 0;

  return (
    <tr className="border-b last:border-0 hover:bg-muted/30 cursor-pointer" onClick={onOpen}>
      <td className="px-4 py-3">
        <p className="font-medium truncate max-w-[180px]">{snap_a.asset_name}</p>
        <p className="text-xs text-muted-foreground">{snap_a.city}</p>
      </td>
      <td className="px-4 py-3">
        <p className="font-medium truncate max-w-[180px]">{snap_b.asset_name}</p>
        <p className="text-xs text-muted-foreground">{snap_b.city}</p>
      </td>
      <td className="px-4 py-3">
        <ScoreBar score={Number(rec.final_score)} />
      </td>
      <td className="px-4 py-3">
        <span
          className={`inline-flex items-center rounded-full border px-2 py-0.5 text-xs font-medium ${tier.bg} ${tier.text} ${tier.border}`}
        >
          {tier.label}
        </span>
      </td>
      <td className="px-4 py-3">
        {signals.length > 0 ? (
          <span
            className={`inline-flex items-center gap-1 text-xs font-medium ${
              maxSeverity >= 0.7 ? "text-rose-600" : "text-amber-600"
            }`}
          >
            <ShieldAlert className="h-3 w-3" />
            {signals.length}
          </span>
        ) : (
          <span className="text-xs text-muted-foreground">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <Button size="sm" variant="outline" onClick={(e) => { e.stopPropagation(); onOpen(); }}>
          Review
        </Button>
      </td>
    </tr>
  );
}
