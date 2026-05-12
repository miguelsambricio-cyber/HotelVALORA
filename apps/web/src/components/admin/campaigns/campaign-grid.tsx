import type { CampaignRow } from "@/lib/admin/campaigns/live";
import { CampaignCard, NewCampaignCard } from "./campaign-card";

/**
 * Mobile-first campaign card grid. Stacks 1-col on small screens,
 * 2-col at md, 3-col at xl. The "+ New campaign" card is always the
 * last cell.
 */
export function CampaignGrid({
  campaigns,
  newHref,
  hrefForCampaign,
}: {
  campaigns: CampaignRow[];
  newHref: string;
  hrefForCampaign: (id: string) => string;
}) {
  return (
    <section>
      <header className="mb-3 flex flex-wrap items-baseline justify-between gap-2">
        <div>
          <p className="font-headline text-[10px] font-extrabold uppercase tracking-[0.25em] text-slate-500">
            Activation
          </p>
          <h2 className="font-headline text-xl font-extrabold tracking-tight text-forest-900">
            Campaigns
          </h2>
        </div>
        <p className="font-mono text-[10.5px] text-slate-500">
          {campaigns.length} {campaigns.length === 1 ? "campaign" : "campaigns"} · institutional growth ops
        </p>
      </header>
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {campaigns.map((c) => (
          <CampaignCard key={c.id} campaign={c} editHref={hrefForCampaign(c.id)} />
        ))}
        <NewCampaignCard href={newHref} />
      </div>
    </section>
  );
}
