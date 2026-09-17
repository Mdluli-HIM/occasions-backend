// Canonical taxonomy — see BACKEND_HANDOFF.md section 3.
// Keep these slugs stable; they are baked into the frontend's query params
// and select options.

export const SERVICES: { slug: string; label: string }[] = [
  { slug: "catering", label: "Catering" },
  { slug: "tents", label: "Tents" },
  { slug: "chairs-tables", label: "Chairs & Tables" },
  { slug: "mobile-toilets", label: "Mobile Toilets" },
  { slug: "mobile-fridges", label: "Mobile Fridges" },
  { slug: "decor", label: "Décor" },
  { slug: "sound-dj", label: "Sound & DJ" },
  { slug: "photography", label: "Photography" },
  { slug: "venues", label: "Venues" },
  { slug: "generators", label: "Generators" },
];

export const OCCASIONS: { slug: string; label: string; homepageId?: string }[] = [
  { slug: "funeral", label: "Funeral", homepageId: "funerals" },
  { slug: "wedding", label: "Wedding", homepageId: "weddings" },
  { slug: "birthday-party", label: "Birthday Party", homepageId: "birthdays" },
  { slug: "church-event", label: "Church Event", homepageId: "church-events" },
  { slug: "traditional-ceremony", label: "Traditional Ceremony", homepageId: "traditional-ceremonies" },
  { slug: "corporate-function", label: "Corporate Function", homepageId: "corporate-functions" },
  { slug: "baby-shower", label: "Baby Shower" },
  { slug: "graduation", label: "Graduation" },
  { slug: "school-event", label: "School Event" },
];

export const BUDGET_LEVELS = ["any", "low", "medium", "high", "premium"] as const;
export const GUEST_LEVELS = ["any", "small", "medium", "large", "extra-large"] as const;

export function serviceLabel(slug: string) {
  return SERVICES.find((s) => s.slug === slug)?.label ?? slug;
}

export function eventLabel(slug: string) {
  return OCCASIONS.find((e) => e.slug === slug)?.label ?? slug;
}

export function serviceLabelsFor(slugs: string[]) {
  return slugs.map(serviceLabel);
}

export function eventLabelsFor(slugs: string[]) {
  return slugs.map(eventLabel);
}

// GuestLevel enum in Postgres can't contain a hyphen — map at the API boundary.
export function guestLevelToDb(level: string): "small" | "medium" | "large" | "extra_large" {
  return level === "extra-large" ? "extra_large" : (level as "small" | "medium" | "large");
}

export function guestLevelFromDb(level: string): "small" | "medium" | "large" | "extra-large" {
  return level === "extra_large" ? "extra-large" : (level as "small" | "medium" | "large");
}

// Onboarding step 3 ("service-type") uses slightly different main-service
// labels than the search taxonomy — see BACKEND_HANDOFF.md section 3.
// Maps the onboarding label to one-or-more canonical service slugs, plus
// the display category label stored on the provider.
export const ONBOARDING_SERVICE_MAP: Record<
  string,
  { category: string; serviceSlugs: string[] }
> = {
  Catering: { category: "Catering", serviceSlugs: ["catering"] },
  "Tents & Stretch Tents": { category: "Tents", serviceSlugs: ["tents"] },
  "Décor & Styling": { category: "Décor", serviceSlugs: ["decor"] },
  Photography: { category: "Photography", serviceSlugs: ["photography"] },
  Venue: { category: "Venues", serviceSlugs: ["venues"] },
  "Event Rentals": {
    category: "Event Rentals",
    serviceSlugs: ["chairs-tables", "mobile-toilets", "mobile-fridges"],
  },
};

// Onboarding "occasions" tags are close to, but not identical in casing to,
// the canonical occasion labels — normalise on save.
export function mapOccasionLabelsToSlugs(labels: string[]): string[] {
  const bySingular = new Map(OCCASIONS.map((o) => [o.label.toLowerCase(), o.slug]));
  const aliasMap: Record<string, string> = {
    weddings: "wedding",
    funerals: "funeral",
    "birthday parties": "birthday-party",
    "church events": "church-event",
    "traditional ceremonies": "traditional-ceremony",
    "corporate functions": "corporate-function",
    "baby showers": "baby-shower",
    graduations: "graduation",
    "school events": "school-event",
  };

  return labels
    .map((label) => {
      const key = label.trim().toLowerCase();
      return bySingular.get(key) ?? aliasMap[key] ?? null;
    })
    .filter((slug): slug is string => Boolean(slug));
}
