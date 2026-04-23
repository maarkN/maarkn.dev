import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";
import { projects as STATIC_PROJECTS } from "../src/lib/projects";

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
        stack: p.stack,
        repoUrl: p.links?.repo ?? null,
        demoUrl: p.links?.demo ?? null,
        caseUrl: p.links?.case ?? null,
        features: [],
      },
    });
  }
  console.log(`[seed] inserted ${STATIC_PROJECTS.length} projects.`);
}

async function main() {
  await seedAdmin();
  await seedProjects();
}

main()
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await db.$disconnect();
  });
