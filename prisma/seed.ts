import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { SERVICES, OCCASIONS } from "../src/lib/taxonomy";

const prisma = new PrismaClient();

const DEMO_PASSWORD = "Occasions2026!";

type SeedProvider = {
  slug: string;
  aliases?: string[];
  userEmail: string;
  name: string;
  category: string;
  tagline: string;
  summary: string;
  descriptionParagraphs: string[];
  highlights: string[];
  area: string;
  province: string;
  areasServed: string[];
  priceLabel: string;
  priceNote: string;
  priceValue: number;
  budgetLevel: "low" | "medium" | "high" | "premium";
  guestLevel: "small" | "medium" | "large" | "extra_large";
  capacityMin: number;
  capacityMax: number;
  rating: number;
  reviewCount: number;
  responseTime: string;
  yearsExperience: string;
  serviceModel: string;
  serviceSlugs: string[];
  eventSlugs: string[];
  detailServices: string[];
  detailEventTypes: string[];
  verified: boolean;
  promoted: boolean;
  featured: boolean;
  images: string[];
  contact: { person: string; phone: string; email: string; whatsapp: string };
  reviews: { authorName: string; rating: number; comment: string; daysAgo: number }[];
};

const providers: SeedProvider[] = [
  {
    slug: "fresh-plate-catering",
    userEmail: "provider@freshplate.co.za",
    name: "Fresh Plate Catering",
    category: "Catering",
    tagline: "Full-service catering for weddings, funerals, parties and family functions.",
    summary:
      "Fresh Plate Catering helps families and event organisers serve reliable, well-presented meals without the stress of managing food service alone.",
    descriptionParagraphs: [
      "Fresh Plate Catering is a Limpopo-based catering provider offering food preparation, buffet setup and serving support for private and community functions.",
      "The team supports weddings, funerals, church gatherings, birthdays and corporate events with clear communication, flexible menu options and dependable delivery.",
      "Menus can be adjusted for traditional meals, formal meals, light refreshments and large guest counts.",
    ],
    highlights: [
      "Verified provider profile",
      "Suitable for small and large functions",
      "Buffet setup and serving team available",
      "Traditional menu options available",
      "Fast response time",
    ],
    area: "Polokwane",
    province: "Limpopo",
    areasServed: ["Polokwane", "Seshego", "Mankweng", "Lebowakgomo", "Mokopane"],
    priceLabel: "From R120 pp",
    priceNote: "estimated per guest",
    priceValue: 120,
    budgetLevel: "medium",
    guestLevel: "extra_large",
    capacityMin: 30,
    capacityMax: 500,
    rating: 4.9,
    reviewCount: 52,
    responseTime: "Usually responds within 20 minutes",
    yearsExperience: "6+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["catering"],
    eventSlugs: ["wedding", "funeral", "corporate-function"],
    detailServices: [
      "Buffet catering",
      "Plated meals",
      "Serving staff",
      "Menu planning",
      "Traditional meals",
      "Corporate lunch",
      "Funeral catering",
      "Wedding catering",
    ],
    detailEventTypes: [
      "Weddings",
      "Funerals",
      "Birthday Parties",
      "Church Events",
      "Traditional Ceremonies",
      "Corporate Functions",
    ],
    verified: true,
    promoted: true,
    featured: false,
    images: [
      "/images/services/chairs.jpg",
      "/images/providers/provider-1.jpg",
      "/images/providers/provider-3.jpg",
      "/images/providers/provider-2.jpg",
      "/images/services/decor.jpg",
      "/images/services/tents.jpg",
      "/images/hero/occasion-hero.jpg",
    ],
    contact: {
      person: "Fresh Plate Team",
      phone: "068 036 4445",
      email: "hello@freshplate.co.za",
      whatsapp: "27680364445",
    },
    reviews: [
      {
        authorName: "Thato M.",
        rating: 5,
        comment:
          "The food was delivered on time and the serving team was professional. Our family function went smoothly.",
        daysAgo: 14,
      },
      {
        authorName: "Lerato K.",
        rating: 5,
        comment:
          "Very clear communication and generous portions. I would use them again for a wedding or church event.",
        daysAgo: 30,
      },
      {
        authorName: "Mpho R.",
        rating: 4.8,
        comment: "Good value for the price. They helped us choose a menu that worked for our guest count.",
        daysAgo: 60,
      },
    ],
  },
  {
    slug: "mandlas-event-rentals",
    aliases: ["mandla-event-rentals"],
    userEmail: "provider@mandlasrentals.co.za",
    name: "Mandla’s Event Rentals",
    category: "Event Rentals",
    tagline: "Tents, chairs, tables and mobile fridges for family and community functions.",
    summary:
      "Mandla’s Event Rentals provides reliable event equipment for large family functions, church gatherings and outdoor ceremonies.",
    descriptionParagraphs: [
      "Mandla’s Event Rentals is a Mbombela-based equipment hire provider supplying tents, seating, tables and mobile fridges for outdoor and community events.",
      "The team handles setup and breakdown for funerals, weddings, church gatherings and traditional ceremonies across Mpumalanga.",
      "Packages can be scaled from small family gatherings to large multi-tent outdoor functions.",
    ],
    highlights: [
      "Verified provider profile",
      "Large-capacity outdoor setups",
      "Delivery and on-site setup included",
      "Experienced with funerals and traditional ceremonies",
      "Fast quote turnaround",
    ],
    area: "Mbombela",
    province: "Mpumalanga",
    areasServed: ["Mbombela", "White River", "Hazyview", "Bushbuckridge"],
    priceLabel: "From R1,500",
    priceNote: "estimated rental setup",
    priceValue: 1500,
    budgetLevel: "medium",
    guestLevel: "large",
    capacityMin: 50,
    capacityMax: 800,
    rating: 4.8,
    reviewCount: 36,
    responseTime: "Usually responds within 35 minutes",
    yearsExperience: "8+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["tents", "chairs-tables", "mobile-fridges"],
    eventSlugs: ["funeral", "wedding", "church-event"],
    detailServices: [
      "Tents",
      "Chairs",
      "Tables",
      "Mobile fridges",
      "Outdoor setup",
      "Funeral setup",
      "Wedding setup",
    ],
    detailEventTypes: ["Funerals", "Weddings", "Church Events", "Traditional Ceremonies"],
    verified: true,
    promoted: true,
    featured: true,
    images: [
      "/images/services/fridges.jpg",
      "/images/providers/provider-1.jpg",
      "/images/providers/provider-2.jpg",
      "/images/services/toilets.jpg",
      "/images/providers/provider-3.jpg",
      "/images/services/tents.jpg",
      "/images/hero/occasion-hero.jpg",
    ],
    contact: {
      person: "Mandla Sithole",
      phone: "076 214 9903",
      email: "hello@mandlasrentals.co.za",
      whatsapp: "27762149903",
    },
    reviews: [
      {
        authorName: "Nomsa D.",
        rating: 5,
        comment: "Tents were set up early and the team was very respectful during a family funeral.",
        daysAgo: 10,
      },
      {
        authorName: "Sipho V.",
        rating: 4.7,
        comment: "Great value for a large wedding — chairs and tables arrived on time.",
        daysAgo: 25,
      },
      {
        authorName: "Precious M.",
        rating: 4.9,
        comment: "Mobile fridges kept everything cold for our two-day church gathering. Highly recommend.",
        daysAgo: 45,
      },
    ],
  },
  {
    slug: "nkosi-catering-co",
    aliases: ["nkosi-catering"],
    userEmail: "provider@nkosicatering.co.za",
    name: "Nkosi Catering Co.",
    category: "Catering",
    tagline: "Traditional and modern catering packages for funerals, weddings and family gatherings.",
    summary:
      "Nkosi Catering Co. brings dependable, home-style catering to funerals, weddings and community events across Mpumalanga.",
    descriptionParagraphs: [
      "Nkosi Catering Co. is a Bushbuckridge-based catering team offering traditional and modern menu options for family and community functions.",
      "The team supplies serving staff and full setup, and works closely with families to plan appropriate menus for funerals and celebrations alike.",
      "Portion sizes and menus are adjusted to guest counts ranging from small gatherings to large weddings.",
    ],
    highlights: [
      "Verified provider profile",
      "Traditional and modern menu options",
      "Full setup and serving staff included",
      "Experienced with funeral catering",
      "Budget-friendly packages",
    ],
    area: "Bushbuckridge",
    province: "Mpumalanga",
    areasServed: ["Bushbuckridge", "Acornhoek", "Hazyview", "Mkhuhlu"],
    priceLabel: "From R85 pp",
    priceNote: "estimated per guest",
    priceValue: 85,
    budgetLevel: "low",
    guestLevel: "medium",
    capacityMin: 20,
    capacityMax: 400,
    rating: 4.7,
    reviewCount: 41,
    responseTime: "Usually responds within 40 minutes",
    yearsExperience: "5+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["catering"],
    eventSlugs: ["funeral", "wedding", "birthday-party"],
    detailServices: ["Traditional meals", "Buffet catering", "Serving staff", "Full setup"],
    detailEventTypes: ["Funerals", "Weddings", "Birthday Parties"],
    verified: true,
    promoted: false,
    featured: true,
    images: [
      "/images/services/catering.jpg",
      "/images/providers/provider-1.jpg",
      "/images/hero/occasion-hero.jpg",
      "/images/services/decor.jpg",
      "/images/providers/provider-2.jpg",
      "/images/services/tents.jpg",
    ],
    contact: {
      person: "Nkosi Family Catering Team",
      phone: "071 883 2260",
      email: "bookings@nkosicatering.co.za",
      whatsapp: "27718832260",
    },
    reviews: [
      {
        authorName: "Andile K.",
        rating: 4.8,
        comment: "Warm, traditional food and the team was very understanding during a difficult time.",
        daysAgo: 12,
      },
      {
        authorName: "Zanele T.",
        rating: 4.6,
        comment: "Affordable and reliable for our wedding of 120 guests.",
        daysAgo: 33,
      },
      {
        authorName: "Bongani S.",
        rating: 4.7,
        comment: "Serving staff were professional and everything was ready on time.",
        daysAgo: 50,
      },
    ],
  },
  {
    slug: "elegant-occasions-decor",
    userEmail: "provider@elegantoccasions.co.za",
    name: "Elegant Occasions Décor",
    category: "Décor",
    tagline: "Premium event styling for weddings, intimate celebrations and professional functions.",
    summary:
      "Elegant Occasions Décor designs polished, photo-ready event spaces for weddings, baby showers and corporate functions across Gauteng.",
    descriptionParagraphs: [
      "Elegant Occasions Décor is a Pretoria-based styling studio specialising in themed décor, floral arrangements and backdrop design.",
      "The team works with couples and event planners to design table styling, staging and backdrops that match a chosen theme and budget.",
      "Packages range from intimate baby showers to full wedding venue transformations.",
    ],
    highlights: [
      "Verified provider profile",
      "Custom theme design available",
      "Flowers and backdrops included",
      "Strong portfolio of wedding styling",
      "Popular for baby showers and corporate functions",
    ],
    area: "Pretoria",
    province: "Gauteng",
    areasServed: ["Pretoria", "Centurion", "Midrand", "Johannesburg"],
    priceLabel: "From R2,800",
    priceNote: "estimated styling package",
    priceValue: 2800,
    budgetLevel: "high",
    guestLevel: "medium",
    capacityMin: 20,
    capacityMax: 300,
    rating: 4.9,
    reviewCount: 41,
    responseTime: "Usually responds within 1 hour",
    yearsExperience: "7+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["decor"],
    eventSlugs: ["wedding", "baby-shower", "corporate-function"],
    detailServices: ["Décor styling", "Flowers", "Backdrops", "Table styling", "Theme design"],
    detailEventTypes: ["Weddings", "Baby Showers", "Corporate Functions"],
    verified: true,
    promoted: false,
    featured: true,
    images: [
      "/images/services/decor.jpg",
      "/images/providers/provider-3.jpg",
      "/images/providers/provider-1.jpg",
      "/images/hero/occasion-hero.jpg",
    ],
    contact: {
      person: "Naledi Mokoena",
      phone: "082 349 7710",
      email: "hello@elegantoccasions.co.za",
      whatsapp: "27823497710",
    },
    reviews: [
      {
        authorName: "Karabo N.",
        rating: 5,
        comment: "Our wedding backdrop was stunning — exactly what we pictured and more.",
        daysAgo: 8,
      },
      {
        authorName: "Refilwe M.",
        rating: 4.9,
        comment: "Beautiful baby shower styling, very professional team.",
        daysAgo: 22,
      },
      {
        authorName: "Tumi L.",
        rating: 4.8,
        comment: "Great communication throughout planning our corporate gala.",
        daysAgo: 40,
      },
    ],
  },
  {
    slug: "siyanda-mobile-toilets",
    userEmail: "provider@siyandatoilets.co.za",
    name: "Siyanda Mobile Toilets",
    category: "Mobile Toilets",
    tagline: "Portable toilet hire for outdoor functions, rural ceremonies and community gatherings.",
    summary:
      "Siyanda Mobile Toilets supplies clean, well-maintained portable toilets with cleaning support for outdoor events across Mpumalanga.",
    descriptionParagraphs: [
      "Siyanda Mobile Toilets is a Hazyview-based hire provider offering portable toilet units for outdoor and rural functions.",
      "The team includes cleaning and servicing support to keep units in good condition throughout multi-day events.",
      "Units are suitable for funerals, church gatherings and traditional ceremonies in areas without reliable fixed facilities.",
    ],
    highlights: [
      "Verified provider profile",
      "Cleaning support included",
      "Suited to rural and outdoor venues",
      "Experienced with large community gatherings",
      "Reliable delivery and collection",
    ],
    area: "Hazyview",
    province: "Mpumalanga",
    areasServed: ["Hazyview", "Bushbuckridge", "Mbombela", "Acornhoek"],
    priceLabel: "From R900",
    priceNote: "estimated per unit",
    priceValue: 900,
    budgetLevel: "low",
    guestLevel: "large",
    capacityMin: 50,
    capacityMax: 600,
    rating: 4.5,
    reviewCount: 18,
    responseTime: "Usually responds within 1 hour",
    yearsExperience: "4+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["mobile-toilets"],
    eventSlugs: ["funeral", "church-event", "traditional-ceremony"],
    detailServices: ["Portable toilet hire", "Cleaning support", "Delivery and collection"],
    detailEventTypes: ["Funerals", "Church Events", "Traditional Ceremonies"],
    verified: true,
    promoted: true,
    featured: false,
    images: ["/images/services/toilets.jpg", "/images/providers/provider-2.jpg", "/images/hero/occasion-hero.jpg"],
    contact: {
      person: "Siyanda Nkosi",
      phone: "079 662 1145",
      email: "bookings@siyandatoilets.co.za",
      whatsapp: "27796621145",
    },
    reviews: [
      {
        authorName: "Vusi M.",
        rating: 4.6,
        comment: "Units were clean and delivered a day before our event as agreed.",
        daysAgo: 18,
      },
      {
        authorName: "Nomvula P.",
        rating: 4.4,
        comment: "Good service for a rural venue with no other facilities nearby.",
        daysAgo: 35,
      },
    ],
  },
  {
    slug: "perfect-sound-sa",
    userEmail: "provider@perfectsound.co.za",
    name: "Perfect Sound SA",
    category: "Sound & DJ",
    tagline: "Sound systems, DJ services and event audio setup for private and public functions.",
    summary:
      "Perfect Sound SA provides sound systems, lighting and DJ services for parties, weddings and corporate functions in Gauteng.",
    descriptionParagraphs: [
      "Perfect Sound SA is a Soweto-based audio and entertainment provider offering sound system hire, lighting and DJ booking.",
      "The team sets up and manages sound for the full event, including microphones for speeches and announcements.",
      "Packages suit intimate parties as well as larger weddings and corporate functions.",
    ],
    highlights: [
      "Full sound and lighting setup",
      "Experienced event DJs available",
      "Microphones included for speeches",
      "Flexible packages for parties and weddings",
    ],
    area: "Soweto",
    province: "Gauteng",
    areasServed: ["Soweto", "Johannesburg", "Roodepoort"],
    priceLabel: "From R1,200",
    priceNote: "estimated per event",
    priceValue: 1200,
    budgetLevel: "medium",
    guestLevel: "medium",
    capacityMin: 30,
    capacityMax: 350,
    rating: 4.6,
    reviewCount: 24,
    responseTime: "Usually responds within 2 hours",
    yearsExperience: "5+ years",
    serviceModel: "I travel to the customer",
    serviceSlugs: ["sound-dj"],
    eventSlugs: ["birthday-party", "wedding", "corporate-function"],
    detailServices: ["Sound system hire", "DJ booking", "Lighting", "Microphones"],
    detailEventTypes: ["Birthday Parties", "Weddings", "Corporate Functions"],
    verified: false,
    promoted: false,
    featured: false,
    images: ["/images/services/sound.jpg", "/images/providers/provider-3.jpg", "/images/hero/occasion-hero.jpg"],
    contact: {
      person: "Thabo Mahlangu",
      phone: "083 501 8827",
      email: "hello@perfectsoundsa.co.za",
      whatsapp: "27835018827",
    },
    reviews: [
      {
        authorName: "Lebo K.",
        rating: 4.7,
        comment: "DJ read the crowd really well and the sound quality was excellent.",
        daysAgo: 15,
      },
      {
        authorName: "Kagiso R.",
        rating: 4.5,
        comment: "Lighting setup made our small function feel much more special.",
        daysAgo: 29,
      },
    ],
  },
];

// Sample dashboard leads (section 10 + provider-dashboard.ts) — attached to Fresh Plate Catering.
const sampleLeads = [
  {
    providerSlug: "fresh-plate-catering",
    name: "Mpho Mdluli",
    email: "mpho@example.com",
    phone: "082 555 0182",
    eventType: "Wedding",
    serviceNeeded: "Buffet catering + serving staff",
    eventDate: "2026-08-14",
    location: "Polokwane",
    guests: "150 guests",
    budget: "R18,000 - R25,000",
    message:
      "I am planning a wedding and need catering for 150 guests. Please send availability and menu options.",
    status: "New" as const,
    urgency: "High" as const,
    contactMethod: "WhatsApp" as const,
    daysAgo: 0,
  },
  {
    providerSlug: "fresh-plate-catering",
    name: "Thabo Nkuna",
    email: "thabo@example.com",
    phone: "073 222 7710",
    eventType: "Funeral",
    serviceNeeded: "Traditional meals",
    eventDate: "2026-07-28",
    location: "Mankweng",
    guests: "220 guests",
    budget: "R12,000 - R18,000",
    message: "We need funeral catering urgently. Please confirm if you can assist and what is included.",
    status: "Contacted" as const,
    urgency: "High" as const,
    contactMethod: "Phone" as const,
    daysAgo: 1,
  },
  {
    providerSlug: "fresh-plate-catering",
    name: "Lerato Radebe",
    email: "lerato@example.com",
    phone: "071 444 9022",
    eventType: "Corporate Function",
    serviceNeeded: "Corporate lunch",
    eventDate: "2026-09-02",
    location: "Polokwane",
    guests: "80 guests",
    budget: "R8,000 - R12,000",
    message: "We need lunch catering for a business event. Please send package options.",
    status: "Quoted" as const,
    urgency: "Medium" as const,
    contactMethod: "Email" as const,
    daysAgo: 2,
  },
];

async function main() {
  console.log("Seeding taxonomy...");

  // Note: `count` fields here are gone on purpose — the "N providers" number
  // shown on the homepage is now computed live in GET /api/categories/services
  // (a COUNT of real live providers per service), never a seeded guess.
  const homepageServiceContent: Record<string, { image: string; description: string }> = {
    catering: { image: "/images/services/catering.jpg", description: "Food services for funerals, weddings and private functions." },
    tents: { image: "/images/services/tents.jpg", description: "Tent hire for outdoor and large community events." },
    "chairs-tables": { image: "/images/services/chairs.jpg", description: "Seating and table hire for all occasion sizes." },
    "mobile-toilets": { image: "/images/services/toilets.jpg", description: "Portable toilet hire for outdoor events." },
    "mobile-fridges": { image: "/images/services/fridges.jpg", description: "Cold-room and mobile fridge rentals." },
    decor: { image: "/images/services/decor.jpg", description: "Event styling, flowers, backdrops and table setups." },
    "sound-dj": { image: "/images/services/sound.jpg", description: "Sound systems, DJs and entertainment setup." },
    photography: { image: "/images/services/photography.jpg", description: "Event photography and video coverage." },
  };

  for (const [index, service] of SERVICES.entries()) {
    const homepage = homepageServiceContent[service.slug];
    await prisma.service.upsert({
      where: { slug: service.slug },
      create: {
        slug: service.slug,
        label: service.label,
        sortOrder: index,
        homepageImage: homepage?.image ?? "",
        homepageDescription: homepage?.description ?? "",
      },
      update: {},
    });
  }

  const homepageOccasionDescriptions: Record<string, string> = {
    funeral: "Find catering, tents, chairs, toilets and more.",
    wedding: "Compare décor, venues, catering, sound and photography.",
    "birthday-party": "Plan parties with food, décor, entertainment and equipment.",
    "church-event": "Hire tents, chairs, sound systems and catering providers.",
    "traditional-ceremony": "Find trusted providers for cultural and family gatherings.",
    "corporate-function": "Book professional services for business functions.",
  };

  for (const [index, occasion] of OCCASIONS.entries()) {
    await prisma.occasion.upsert({
      where: { slug: occasion.slug },
      create: {
        slug: occasion.slug,
        label: occasion.label,
        homepageId: occasion.homepageId,
        homepageDescription: homepageOccasionDescriptions[occasion.slug] ?? "",
        sortOrder: index,
      },
      update: {},
    });
  }

  console.log("Seeding demo users...");

  const customerPasswordHash = await bcrypt.hash(DEMO_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: "customer@example.com" },
    create: {
      email: "customer@example.com",
      passwordHash: customerPasswordHash,
      name: "Demo Customer",
      role: "customer",
    },
    update: {},
  });

  console.log("Seeding providers...");

  for (const p of providers) {
    const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

    const user = await prisma.user.upsert({
      where: { email: p.userEmail },
      create: {
        email: p.userEmail,
        passwordHash,
        name: p.contact.person,
        phone: p.contact.phone,
        role: "provider",
      },
      update: {},
    });

    const provider = await prisma.provider.upsert({
      where: { slug: p.slug },
      create: {
        slug: p.slug,
        aliases: p.aliases ?? [],
        userId: user.id,
        name: p.name,
        category: p.category,
        tagline: p.tagline,
        summary: p.summary,
        description: p.descriptionParagraphs.join("\n\n"),
        descriptionParagraphs: p.descriptionParagraphs,
        highlights: p.highlights,
        area: p.area,
        province: p.province,
        areasServed: p.areasServed,
        priceLabel: p.priceLabel,
        priceNote: p.priceNote,
        priceValue: p.priceValue,
        budgetLevel: p.budgetLevel,
        guestLevel: p.guestLevel,
        capacityMin: p.capacityMin,
        capacityMax: p.capacityMax,
        rating: p.rating,
        reviewCount: p.reviewCount,
        responseTime: p.responseTime,
        yearsExperience: p.yearsExperience,
        serviceModel: p.serviceModel,
        serviceSlugs: p.serviceSlugs,
        eventSlugs: p.eventSlugs,
        detailServices: p.detailServices,
        detailEventTypes: p.detailEventTypes,
        verified: p.verified,
        promoted: p.promoted,
        featured: p.featured,
        status: "live",
        packageCode: p.promoted ? "featured" : "starter",
        packageStatus: "Active",
        contactPerson: p.contact.person,
        contactPhone: p.contact.phone,
        contactEmail: p.contact.email,
        contactWhatsapp: p.contact.whatsapp,
        // Honest starting point — real page visits increment this from
        // here (see GET /api/providers/:slug). We deliberately don't seed
        // a fabricated head-start number anymore; a freshly seeded demo
        // provider should look freshly seeded, not like it already has a
        // month of traffic. `quoteRequests` is no longer stored at all —
        // the dashboard computes it live from the Lead table instead.
        profileViews: 0,
      },
      update: {},
    });

    for (const [index, url] of p.images.entries()) {
      await prisma.media.upsert({
        where: { id: `${provider.id}-seed-media-${index}` },
        create: { id: `${provider.id}-seed-media-${index}`, providerId: provider.id, url, sortOrder: index },
        update: {},
      }).catch(async () => {
        // upsert-by-fixed-id is a seeding convenience; fall back to a plain create if it already ran.
        const exists = await prisma.media.findFirst({ where: { providerId: provider.id, url } });
        if (!exists) {
          await prisma.media.create({ data: { providerId: provider.id, url, sortOrder: index } });
        }
      });
    }

    for (const review of p.reviews) {
      const exists = await prisma.review.findFirst({
        where: { providerId: provider.id, authorName: review.authorName, comment: review.comment },
      });
      if (!exists) {
        await prisma.review.create({
          data: {
            providerId: provider.id,
            authorName: review.authorName,
            rating: review.rating,
            comment: review.comment,
            createdAt: new Date(Date.now() - review.daysAgo * 24 * 60 * 60 * 1000),
          },
        });
      }
    }
  }

  console.log("Seeding sample leads...");

  for (const lead of sampleLeads) {
    const provider = await prisma.provider.findUnique({ where: { slug: lead.providerSlug } });
    if (!provider) continue;

    const exists = await prisma.lead.findFirst({ where: { providerId: provider.id, email: lead.email } });
    if (exists) continue;

    await prisma.lead.create({
      data: {
        providerId: provider.id,
        name: lead.name,
        email: lead.email,
        phone: lead.phone,
        eventType: lead.eventType,
        serviceNeeded: lead.serviceNeeded,
        eventDate: lead.eventDate,
        location: lead.location,
        guests: lead.guests,
        budget: lead.budget,
        message: lead.message,
        status: lead.status,
        urgency: lead.urgency,
        contactMethod: lead.contactMethod,
        createdAt: new Date(Date.now() - lead.daysAgo * 24 * 60 * 60 * 1000),
      },
    });
  }

  console.log("\nDone. Demo logins (password for all: " + DEMO_PASSWORD + "):");
  console.log("  customer@example.com  (customer)");
  for (const p of providers) {
    console.log(`  ${p.userEmail}  (provider — ${p.name})`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
