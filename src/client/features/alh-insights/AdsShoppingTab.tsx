import type { ReactNode } from "react";
import { SectionHeader } from "@/client/components/PageHeader";
import { Badge } from "@/client/components/ui/badge";
import {
  Table,
  TableBody,
  TableCard,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/client/components/ui/table";
import {
  fmtInt,
  fmtPct,
  fmtUsd,
  monthLabel,
  NotPublished,
  OwnerBadge,
  type AlhInsightsData,
} from "./shared";

type Ads = NonNullable<AlhInsightsData["adsAndShopping"]>;

function Section({
  title,
  hint,
  children,
}: {
  title: string;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section className="space-y-2">
      <SectionHeader title={title} hint={hint} />
      <TableCard>
        <Table>{children}</Table>
      </TableCard>
    </section>
  );
}

function ShoppingShare({ rows }: { rows: Ads["shoppingShare"] }) {
  return (
    <Section
      title="Google Shopping by seller"
      hint="Share of your product searches where each seller appears, with prices and ratings."
    >
      <TableHeader>
        <TableRow>
          <TableHead>Seller</TableHead>
          <TableHead className="text-right">Searches present</TableHead>
          <TableHead className="text-right">Listings</TableHead>
          <TableHead className="text-right">Median price</TableHead>
          <TableHead className="text-right">Rating</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.slice(0, 25).map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">
              <span className="mr-2">{r.seller}</span>
              <OwnerBadge owner={r.owner} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtPct(r.shareOfTerms)} ({r.termsPresent}/{r.termsChecked})
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.listings}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtUsd(r.medianPrice)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.avgRating == null ? "–" : r.avgRating.toFixed(1)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Section>
  );
}

function BrandListings({ rows }: { rows: Ads["brandListings"] }) {
  if (!rows.length) return null;
  return (
    <Section
      title="Your products in Google Shopping"
      hint="Listings that are yours or name one of your brands, often sold by a retailer."
    >
      <TableHeader>
        <TableRow>
          <TableHead>Product</TableHead>
          <TableHead>Seller</TableHead>
          <TableHead>Search</TableHead>
          <TableHead className="text-right">Price</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="max-w-sm truncate font-medium">
              {r.title}
            </TableCell>
            <TableCell>{r.seller}</TableCell>
            <TableCell className="text-muted-foreground">{r.term}</TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtUsd(r.price)}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Section>
  );
}

function PaidKeywords({ rows }: { rows: Ads["paidKeywords"] }) {
  return (
    <Section
      title="Paid keywords"
      hint="Google Ads keywords your sites and competitors bid on, and where you rank organically for the same search."
    >
      <TableHeader>
        <TableRow>
          <TableHead>Keyword</TableHead>
          <TableHead>Advertiser</TableHead>
          <TableHead className="text-right">Volume</TableHead>
          <TableHead className="text-right">CPC</TableHead>
          <TableHead className="text-right">Your organic rank</TableHead>
          <TableHead>Ad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">
              <span className="mr-2">{r.keyword}</span>
              {r.bidsOnOurBrand && (
                <Badge variant="destructive">Bids on your brand</Badge>
              )}
            </TableCell>
            <TableCell>
              <span className="mr-2">{r.brand ?? r.domain}</span>
              <OwnerBadge owner={r.owner} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {fmtInt(r.searchVolume)}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.cpc == null ? "–" : `$${r.cpc.toFixed(2)}`}
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.ourBestOrganicPosition ?? "not ranking"}
            </TableCell>
            <TableCell className="max-w-xs truncate text-muted-foreground">
              {r.adTitle}
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Section>
  );
}

function AdShare({ rows }: { rows: Ads["adShare"] }) {
  if (!rows.length) return null;
  const checked = rows[0]!.keywordsChecked;
  const withAds = rows[0]!.keywordsWithAds;
  return (
    <Section
      title="Text ads on your searches"
      hint={`${withAds} of ${checked} checked searches showed text ads. For product searches Google mostly shows Shopping instead.`}
    >
      <TableHeader>
        <TableRow>
          <TableHead>Advertiser</TableHead>
          <TableHead className="text-right">Searches with their ad</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((r) => (
          <TableRow key={r.id}>
            <TableCell className="font-medium">
              <span className="mr-2">{r.brand ?? r.adDomain}</span>
              <OwnerBadge owner={r.owner} />
            </TableCell>
            <TableCell className="text-right tabular-nums">
              {r.keywordsWithTheirAd} ({fmtPct(r.shareOfKeywords)})
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Section>
  );
}

export function AdsShoppingTab({
  ads,
}: {
  ads: AlhInsightsData["adsAndShopping"];
}) {
  if (!ads) return <NotPublished what="Ads & Shopping research" />;
  return (
    <div className="space-y-6">
      <p className="text-sm text-muted-foreground">
        Category-wide research across your product searches and competitors (
        {monthLabel(ads.month)}). The same for every project.
      </p>
      <ShoppingShare rows={ads.shoppingShare} />
      <BrandListings rows={ads.brandListings} />
      <PaidKeywords rows={ads.paidKeywords} />
      <AdShare rows={ads.adShare} />
    </div>
  );
}
