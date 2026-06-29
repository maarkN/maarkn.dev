import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { projects as STATIC_PROJECTS } from "../src/lib/projects";
import { encodeStringList } from "../src/lib/json-list";

const db = new PrismaClient();

async function seedAdmin() {
  const email = (process.env.ADMIN_EMAIL ?? "admin@maarkn.dev").toLowerCase();
  const password = process.env.ADMIN_PASSWORD;

  if (!password) {
    console.warn(
      "[seed] ADMIN_PASSWORD is not set — skipping admin user creation. " +
        "Set ADMIN_EMAIL and ADMIN_PASSWORD in .env.local before running the seed if you want to log in."
    );
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);
  const user = await db.user.upsert({
    where: { email },
    update: { passwordHash, role: "admin" },
    create: { email, passwordHash, role: "admin", name: "Marco Filho" },
  });
  console.log(`[seed] admin user ready: ${user.email}`);
}

async function seedProjects() {
  // Idempotent: only insert when no projects exist yet, so re-running the seed
  // doesn't clobber edits the operator made through the admin UI.
  const existing = await db.project.count();
  if (existing > 0) {
    console.log(`[seed] projects already populated (${existing}) — skipping.`);
    return;
  }

  for (const p of STATIC_PROJECTS) {
    await db.project.create({
      data: {
        slug: p.slug,
        name: p.name,
        year: p.year,
        category: p.category,
        status: p.status,
        featured: p.featured,
        monogram: p.monogram,
        accentFrom: p.accent.from,
        accentTo: p.accent.to,
        stackJson: encodeStringList(p.stack),
        sourceVisibility: p.sourceVisibility ?? "public",
        repoUrl: p.sourceVisibility === "private" ? null : p.links?.repo ?? null,
        demoUrl: p.links?.demo ?? null,
        caseUrl: p.links?.case ?? null,
        featuresJson: encodeStringList([]),
      },
    });
  }
  console.log(`[seed] inserted ${STATIC_PROJECTS.length} projects.`);
}

const SALARY: Record<string, string> = {
  IE: "Base ≥ €68.911 (Critical Skills) - mire €90-130k",
  DE: "Blue Card ≥ €46k - mire €80-110k",
  NL: "HSM ≥ €71.3k/ano (€5.942/mês) - mire €80-120k +30% ruling",
};

// [country, company, city, fit, careersUrl, notes?] — mirrors the CSV tracker.
const APPLICATIONS: [string, string, string, string, string, string?][] = [
  ["IE", "Stripe", "Dublin", "⭐", "https://stripe.com/jobs"],
  ["IE", "Datadog", "Dublin", "⭐ Go", "https://careers.datadoghq.com"],
  ["IE", "Intercom", "Dublin", "⭐ IA/Fin", "https://www.intercom.com/careers"],
  ["IE", "Databricks", "Dublin", "⭐ IA", "https://www.databricks.com/company/careers"],
  ["IE", "Genesys", "Galway", "⭐ IA/ML", "https://www.genesys.com/company/careers"],
  ["IE", "Tines", "Dublin", "⭐ IA", "https://www.tines.com/careers", "confirmar se a vaga paga ≥€68.9k"],
  ["IE", "Google", "Dublin", "Bom", "https://careers.google.com"],
  ["IE", "Meta", "Dublin", "Bom", "https://www.metacareers.com"],
  ["IE", "Microsoft", "Dublin", "Bom", "https://careers.microsoft.com"],
  ["IE", "Amazon-AWS", "Dublin", "Bom", "https://www.amazon.jobs"],
  ["IE", "Workday", "Dublin", "Bom", "https://www.workday.com/en-us/company/careers.html"],
  ["IE", "HubSpot", "Dublin", "Bom", "https://www.hubspot.com/careers"],
  ["IE", "Apple", "Cork", "Bom", "https://jobs.apple.com/en-ie/search?location=ireland-IRL"],
  ["IE", "LinkedIn", "Dublin", "Bom", "https://careers.linkedin.com"],
  ["IE", "Mastercard", "Dublin", "Bom", "https://careers.mastercard.com"],
  ["IE", "Workhuman", "Dublin", "Bom", "https://www.workhuman.com/careers", "confirmar se paga ≥€68.9k"],
  ["DE", "Zalando", "Berlim", "⭐", "https://jobs.zalando.com"],
  ["DE", "Delivery Hero", "Berlim", "⭐", "https://careers.deliveryhero.com"],
  ["DE", "Forto", "Berlim", "⭐ Node/Go", "https://forto.com/en/career"],
  ["DE", "Contentful", "Berlim", "⭐ Node/TS", "https://www.contentful.com/careers"],
  ["DE", "DeepL", "Colônia-Berlim", "⭐ IA", "https://jobs.deepl.com"],
  ["DE", "Aleph Alpha", "Heidelberg", "⭐ IA", "https://jobs.ashbyhq.com/AlephAlpha"],
  ["DE", "Parloa", "Berlim", "⭐ Go/TS+LLM", "https://parloa.com/careers"],
  ["DE", "Celonis", "Munique", "⭐ IA", "https://www.celonis.com/careers"],
  ["DE", "Datadog", "Berlim", "⭐ Go", "https://careers.datadoghq.com"],
  ["DE", "N26", "Berlim", "Bom", "https://n26.com/en/careers"],
  ["DE", "Trade Republic", "Berlim", "Bom", "https://traderepublic.com/en/careers"],
  ["DE", "HelloFresh", "Berlim", "Bom", "https://careers.hellofresh.com"],
  ["DE", "GetYourGuide", "Berlim", "Bom", "https://careers.getyourguide.com"],
  ["DE", "Solaris", "Berlim", "Bom", "https://www.solarisgroup.com/en/careers"],
  ["DE", "SAP", "Walldorf-Berlim", "Bom", "https://jobs.sap.com"],
  ["DE", "Personio", "Munique", "Bom", "https://www.personio.com/careers"],
  ["NL", "Uber", "Amsterdã", "⭐ Go", "https://www.uber.com/careers"],
  ["NL", "Databricks", "Amsterdã", "⭐ IA", "https://www.databricks.com/company/careers"],
  ["NL", "DataSnipper", "Amsterdã", "⭐ IA/LLM", "https://careers.datasnipper.com"],
  ["NL", "Adyen", "Amsterdã", "⭐", "https://www.adyen.com/careers"],
  ["NL", "Booking.com", "Amsterdã", "⭐", "https://careers.booking.com"],
  ["NL", "Miro", "Amsterdã", "⭐", "https://miro.com/careers"],
  ["NL", "Mollie", "Amsterdã", "⭐", "https://jobs.mollie.com"],
  ["NL", "Just Eat Takeaway", "Amsterdã", "⭐", "https://careers.justeattakeaway.com"],
  ["NL", "Elastic", "Amsterdã", "⭐ Go", "https://www.elastic.co/careers"],
  ["NL", "Catawiki", "Amsterdã", "⭐", "https://catawiki.careers"],
  ["NL", "bunq", "Amsterdã", "Bom", "https://careers.bunq.com"],
  ["NL", "Backbase", "Amsterdã", "Bom", "https://www.backbase.com/careers"],
  ["NL", "ING", "Amsterdã", "Bom", "https://www.ing.jobs"],
  ["NL", "Philips", "Eindhoven", "Bom", "https://www.careers.philips.com"],
  ["NL", "ASML", "Eindhoven", "Bom", "https://www.asml.com/careers"],
  ["NL", "TomTom", "Amsterdã", "Bom", "https://www.tomtom.com/careers"],
];

async function seedApplications() {
  const existing = await db.jobApplication.count();
  if (existing > 0) {
    console.log(`[seed] applications already populated (${existing}) — skipping.`);
    return;
  }
  for (const [country, company, city, fit, careersUrl, notes] of APPLICATIONS) {
    await db.jobApplication.create({
      data: {
        company,
        country,
        city,
        fit,
        careersUrl,
        source: "company_site",
        status: "not_applied",
        sponsorsVisa: true,
        targetSalary: SALARY[country] ?? null,
        notes: notes ?? null,
      },
    });
  }
  console.log(`[seed] inserted ${APPLICATIONS.length} applications.`);
}

async function main() {
  await seedAdmin();
  await seedProjects();
  await seedApplications();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
