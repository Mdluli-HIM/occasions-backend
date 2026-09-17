export function slugify(input: string): string {
  return input
    .normalize("NFKD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export function guestLevelFromMax(maxGuests: number): "small" | "medium" | "large" | "extra_large" {
  if (maxGuests < 50) return "small";
  if (maxGuests <= 150) return "medium";
  if (maxGuests <= 300) return "large";
  return "extra_large";
}

export function normaliseWhatsapp(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "";
  if (digits.startsWith("27")) return digits;
  if (digits.startsWith("0")) return `27${digits.slice(1)}`;
  return digits;
}
