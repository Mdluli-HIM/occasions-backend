import bcrypt from "bcryptjs";
import { prisma } from "../src/lib/prisma";

const EMAIL = "testprovider@occasions.co.za";
const PASSWORD = "TestPass123!";

const CUSTOMER_EMAIL = "testcustomer@occasions.co.za";
const CUSTOMER_PASSWORD = "TestPass123!";

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 10);

  const customerPasswordHash = await bcrypt.hash(CUSTOMER_PASSWORD, 10);
  await prisma.user.upsert({
    where: { email: CUSTOMER_EMAIL },
    update: { passwordHash: customerPasswordHash, role: "customer" },
    create: {
      email: CUSTOMER_EMAIL,
      passwordHash: customerPasswordHash,
      name: "Test Customer",
      phone: "0827654321",
      role: "customer",
    },
  });

  const user = await prisma.user.upsert({
    where: { email: EMAIL },
    update: { passwordHash, role: "provider" },
    create: {
      email: EMAIL,
      passwordHash,
      name: "Test Provider",
      phone: "0821234567",
      role: "provider",
    },
  });

  const provider = await prisma.provider.upsert({
    where: { userId: user.id },
    update: {},
    create: {
      slug: "test-catering-co",
      userId: user.id,
      name: "Test Catering Co",
      category: "Catering",
      tagline: "Delicious food for every occasion",
      summary: "A test provider created for local QA of the leads flow.",
      description:
        "We are a test catering business created for local testing of the Occasions leads and quote request flow.",
      area: "Polokwane",
      province: "Limpopo",
      priceLabel: "R150 / guest",
      priceNote: "Final price depends on menu and guest count",
      priceValue: 150,
      budgetLevel: "medium",
      guestLevel: "medium",
      capacityMin: 30,
      capacityMax: 500,
      rating: 4.8,
      reviewCount: 12,
      responseTime: "Within 2 hours",
      yearsExperience: "5 years",
      serviceModel: "Full service",
      serviceSlugs: ["catering"],
      eventSlugs: ["wedding", "corporate-function", "birthday-party"],
      detailServices: ["Buffet catering", "Plated meals"],
      detailEventTypes: ["Wedding", "Corporate Function", "Birthday Party"],
      verified: true,
      status: "live",
      contactPerson: "Test Provider",
      contactPhone: "0821234567",
      contactEmail: EMAIL,
      contactWhatsapp: "27821234567",
    },
  });

  const leadSeeds = [
    {
      status: "New" as const,
      name: "Naledi Mahlangu",
      eventType: "Wedding",
      eventDate: "2026-12-15",
      location: "Polokwane",
      guests: "150",
      budget: "R20 000 - R30 000",
      message: "Looking for buffet catering for 150 guests, need a quote soon.",
      urgency: "High" as const,
    },
    {
      status: "Viewed" as const,
      name: "Thabo Nkosi",
      eventType: "Corporate Function",
      eventDate: "2026-11-02",
      location: "Polokwane",
      guests: "80",
      budget: "R10 000 - R20 000",
      message: "Need catering for a year-end function, buffet style.",
      urgency: "Medium" as const,
    },
    {
      status: "Contacted" as const,
      name: "Refilwe Sithole",
      eventType: "Birthday Party",
      eventDate: "2026-10-18",
      location: "Seshego",
      guests: "60",
      budget: "R10 000 - R20 000",
      message: "50th birthday, would like a tasting before confirming.",
      urgency: "Medium" as const,
    },
    {
      status: "Quoted" as const,
      name: "Johan van der Merwe",
      eventType: "Wedding",
      eventDate: "2027-01-24",
      location: "Polokwane",
      guests: "200",
      budget: "R30 000 - R50 000",
      message: "Quote received, comparing against two other caterers.",
      urgency: "Low" as const,
    },
    {
      status: "Accepted" as const,
      name: "Amanda Peters",
      eventType: "Wedding",
      eventDate: "2026-12-05",
      location: "Bendor, Polokwane",
      guests: "120",
      budget: "R20 000 - R30 000",
      message: "Confirmed — please send the deposit invoice.",
      urgency: "High" as const,
    },
    {
      status: "Completed" as const,
      name: "Sipho Dlamini",
      eventType: "Corporate Function",
      eventDate: "2026-08-14",
      location: "Polokwane",
      guests: "100",
      budget: "R10 000 - R20 000",
      message: "Event went well, thanks for the great service.",
      urgency: "Low" as const,
    },
    {
      status: "Closed" as const,
      name: "Lindiwe Zulu",
      eventType: "Birthday Party",
      eventDate: "2026-09-01",
      location: "Polokwane",
      guests: "40",
      budget: "Under R10 000",
      message: "Went with another provider this time, budget didn't line up.",
      urgency: "Low" as const,
    },
  ];

  for (const [index, lead] of leadSeeds.entries()) {
    await prisma.lead.create({
      data: {
        providerId: provider.id,
        name: lead.name,
        email: `${lead.name.toLowerCase().replace(/[^a-z]+/g, ".")}@example.com`,
        phone: `08${(10000000 + index).toString().padStart(8, "0")}`,
        eventType: lead.eventType,
        serviceNeeded: "Catering",
        eventDate: lead.eventDate,
        location: lead.location,
        guests: lead.guests,
        budget: lead.budget,
        message: lead.message,
        status: lead.status,
        urgency: lead.urgency,
        contactMethod: "Email",
      },
    });
  }

  console.log("\nTest provider ready.");
  console.log("  Login email:   ", EMAIL);
  console.log("  Login password:", PASSWORD);
  console.log("  Provider slug: ", provider.slug);
  console.log(`  Leads created: ${leadSeeds.length} (one per status)`);
  console.log("\nTest customer ready.");
  console.log("  Login email:   ", CUSTOMER_EMAIL);
  console.log("  Login password:", CUSTOMER_PASSWORD, "\n");
}

main()
  .catch((error) => {
    console.error(error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
