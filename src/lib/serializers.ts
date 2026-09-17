import type { Provider, Media, Review } from "@prisma/client";
import {
  serviceLabelsFor,
  eventLabelsFor,
  guestLevelFromDb,
} from "./taxonomy";

function timeAgo(date: Date): string {
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  const units: [number, string][] = [
    [60, "second"],
    [60, "minute"],
    [24, "hour"],
    [7, "day"],
    [4.345, "week"],
    [12, "month"],
    [Number.POSITIVE_INFINITY, "year"],
  ];

  let value = seconds;
  let unitLabel = "second";

  for (const [amount, name] of units) {
    if (value < amount) {
      unitLabel = name;
      break;
    }
    value = Math.floor(value / amount);
    unitLabel = name;
  }

  if (value <= 1 && unitLabel === "second") return "just now";

  return `${value} ${unitLabel}${value === 1 ? "" : "s"} ago`;
}

function locationLine(p: Provider) {
  return p.locationDisplay?.trim() || [p.area, p.province].filter(Boolean).join(", ");
}

/** Card shape used by GET /api/providers (matches src/data/search-results.ts ProviderListing) */
export function toProviderListing(p: Provider) {
  return {
    id: p.slug,
    name: p.name,
    image: null as string | null, // filled in by caller once media is loaded, see toProviderListingWithMedia
    location: locationLine(p),
    province: p.province,
    area: p.area,
    priceFrom: p.priceLabel,
    priceValue: p.priceValue,
    rating: p.rating,
    reviews: p.reviewCount,
    services: serviceLabelsFor(p.serviceSlugs),
    serviceSlugs: p.serviceSlugs,
    eventTypes: eventLabelsFor(p.eventSlugs),
    eventSlugs: p.eventSlugs,
    budgetLevel: p.budgetLevel,
    guestLevel: guestLevelFromDb(p.guestLevel),
    description: p.summary || p.description,
    isFeatured: p.featured,
    isVerified: p.verified,
    isSponsored: p.promoted,
  };
}

export function toProviderListingWithMedia(p: Provider & { media: Media[] }) {
  const listing = toProviderListing(p);
  const primaryImage = [...p.media].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return { ...listing, image: primaryImage?.url ?? "/images/providers/provider-1.jpg" };
}

/** Homepage featured-provider card (matches src/types/homepage.ts FeaturedProvider) */
export function toFeaturedProvider(p: Provider & { media: Media[] }) {
  const primaryImage = [...p.media].sort((a, b) => a.sortOrder - b.sortOrder)[0];
  return {
    id: p.slug,
    name: p.name,
    location: locationLine(p),
    services: serviceLabelsFor(p.serviceSlugs),
    eventTypes: eventLabelsFor(p.eventSlugs),
    priceFrom: p.priceLabel,
    rating: p.rating,
    reviews: p.reviewCount,
    image: primaryImage?.url ?? "/images/providers/provider-1.jpg",
    isVerified: p.verified,
    isFeatured: p.featured,
  };
}

/** Public profile shape (matches src/data/provider-details.ts ProviderDetail) */
export function toProviderDetail(
  p: Provider & { media: Media[]; reviews: Review[] },
  similar: (Provider & { media: Media[] })[],
) {
  const images = [...p.media]
    .sort((a, b) => a.sortOrder - b.sortOrder)
    .map((m) => m.url);

  const descriptionParagraphs = p.descriptionParagraphs.length
    ? p.descriptionParagraphs
    : p.description
      ? p.description.split(/\n{2,}/).map((s) => s.trim()).filter(Boolean)
      : [];

  const capacityLabel =
    p.capacityLabel?.trim() || `${p.capacityMin} - ${p.capacityMax} guests`;

  const detailServices = p.detailServices.length
    ? p.detailServices
    : serviceLabelsFor(p.serviceSlugs);

  const detailEventTypes = p.detailEventTypes.length
    ? p.detailEventTypes
    : eventLabelsFor(p.eventSlugs);

  return {
    id: p.slug,
    name: p.name,
    category: p.category,
    tagline: p.tagline,
    location: p.area,
    province: p.province,
    priceLabel: p.priceLabel,
    priceNote: p.priceNote,
    rating: p.rating,
    reviewCount: p.reviewCount,
    responseTime: p.responseTime,
    yearsExperience: p.yearsExperience,
    capacity: capacityLabel,
    verified: p.verified,
    promoted: p.promoted,
    images,
    services: detailServices,
    eventTypes: detailEventTypes,
    areasServed: p.areasServed,
    summary: p.summary,
    description: descriptionParagraphs,
    highlights: p.highlights,
    overview: buildOverview(p, capacityLabel),
    reviews: p.reviews
      .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())
      .map((r) => ({
        name: r.authorName,
        rating: r.rating,
        date: timeAgo(r.createdAt),
        comment: r.comment,
      })),
    contact: {
      person: p.contactPerson,
      phone: p.contactPhone,
      email: p.contactEmail,
      whatsapp: p.contactWhatsapp,
    },
    similar: similar.map((sp) => {
      const primaryImage = [...sp.media].sort((a, b) => a.sortOrder - b.sortOrder)[0];
      return {
        id: sp.slug,
        name: sp.name,
        image: primaryImage?.url ?? "/images/providers/provider-1.jpg",
        priceLabel: sp.priceLabel,
        location: sp.area,
      };
    }),
  };
}

function buildOverview(p: Provider, capacityLabel: string) {
  return [
    {
      title: "Service Overview",
      rows: [
        { label: "Main service", value: p.category || "—" },
        { label: "Price estimate", value: p.priceLabel || "—" },
        { label: "Guest capacity", value: capacityLabel },
        { label: "Response time", value: p.responseTime || "—" },
      ],
    },
    {
      title: "Occasions Supported",
      rows: (p.detailEventTypes.length ? p.detailEventTypes : eventLabelsFor(p.eventSlugs)).map(
        (label) => ({ label, value: "Yes" }),
      ),
    },
  ];
}

export type ProfileTask = { label: string; completed: boolean };

// The single source of truth for listing completeness — used for both the
// checklist AND the percentage badge, so they can never disagree with each
// other. "Banking/payment setup" was deliberately left out: payments aren't
// built yet (see BACKEND_HANDOFF.md non-goals), so a task that can never be
// completed doesn't belong in a completion checklist.
export function buildProfileTasks(p: Provider & { media?: Media[] }): ProfileTask[] {
  return [
    { label: "Business details added", completed: Boolean(p.name && p.category) },
    { label: "Contact details verified", completed: Boolean(p.contactPhone && p.contactEmail) },
    { label: "Service areas added", completed: p.areasServed.length > 0 },
    { label: "Gallery uploaded", completed: (p.media?.length ?? 0) > 0 },
    { label: "Pricing guidance added", completed: Boolean(p.priceLabel) },
    { label: "Reviews imported", completed: p.reviewCount > 0 },
  ];
}

export function profileCompletionPercent(tasks: ProfileTask[]): number {
  if (tasks.length === 0) return 0;
  const completed = tasks.filter((t) => t.completed).length;
  return Math.round((completed / tasks.length) * 100);
}

/** Provider-dashboard "provider" block (matches src/data/provider-dashboard.ts)
 * `liveQuoteCount` should be a real `prisma.lead.count(...)` for this provider
 * — not the stored `quoteRequests` counter, which can drift out of sync with
 * the actual Lead rows (e.g. if a lead is ever deleted). */
export function toDashboardProviderSummary(
  p: Provider & { media?: Media[] },
  liveQuoteCount: number,
) {
  const tasks = buildProfileTasks(p);

  return {
    name: p.name,
    category: p.category,
    packageName:
      p.packageCode === "featured"
        ? "Featured Provider"
        : p.packageCode === "premium"
          ? "Premium Partner"
          : "Free Listing",
    packageStatus: p.packageStatus,
    location: locationLine(p),
    profileCompletion: profileCompletionPercent(tasks),
    rating: p.rating,
    reviews: p.reviewCount,
    responseTime: p.responseTime,
    profileViews: p.profileViews,
    quoteRequests: liveQuoteCount,
    conversionRate:
      p.profileViews > 0
        ? `${Math.min(100, Math.round((liveQuoteCount / p.profileViews) * 100))}%`
        : "0%",
    activeSince: p.createdAt.toLocaleDateString("en-ZA", { month: "long", year: "numeric" }),
  };
}

export function toLead(lead: {
  id: string;
  name: string;
  eventType: string;
  serviceNeeded: string;
  eventDate: string;
  location: string;
  guests: string;
  budget: string;
  phone: string;
  email: string;
  message: string;
  status: string;
  urgency: string;
  contactMethod: string;
  createdAt: Date;
}) {
  return {
    id: lead.id,
    name: lead.name,
    eventType: lead.eventType,
    serviceNeeded: lead.serviceNeeded,
    eventDate: lead.eventDate,
    location: lead.location,
    guests: lead.guests,
    budget: lead.budget,
    phone: lead.phone,
    email: lead.email,
    message: lead.message,
    status: lead.status,
    urgency: lead.urgency,
    receivedAt: lead.createdAt.toISOString(),
    contactMethod: lead.contactMethod,
  };
}
