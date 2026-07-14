import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const DEMO_USERNAME = "demo";
const DEMO_PASSWORD = "demo";
const DEMO_EMAIL = "demo@frond.dev";

async function main() {
  const passwordHash = await bcrypt.hash(DEMO_PASSWORD, 10);

  const user = await prisma.user.upsert({
    where: { email: DEMO_EMAIL },
    update: {
      username: DEMO_USERNAME,
      name: "Demo User",
      passwordHash,
    },
    create: {
      email: DEMO_EMAIL,
      username: DEMO_USERNAME,
      name: "Demo User",
      passwordHash,
      avatarUrl: "",
    },
  });

  const org = await prisma.organization.upsert({
    where: { slug: "demo" },
    update: { name: "Demo Organization" },
    create: {
      name: "Demo Organization",
      slug: "demo",
      plan: "free",
    },
  });

  await prisma.organizationMember.upsert({
    where: {
      organizationId_userId: {
        organizationId: org.id,
        userId: user.id,
      },
    },
    update: { role: "owner" },
    create: {
      organizationId: org.id,
      userId: user.id,
      role: "owner",
    },
  });

  await prisma.project.upsert({
    where: {
      organizationId_slug: {
        organizationId: org.id,
        slug: "sample-api",
      },
    },
    update: { name: "Sample API" },
    create: {
      organizationId: org.id,
      name: "Sample API",
      slug: "sample-api",
      description: "Demo documentation project",
      visibility: "public",
      config: {},
    },
  });

  console.log("Seed complete");
  console.log(`  Demo login: ${DEMO_USERNAME} / ${DEMO_PASSWORD}`);
  console.log(`  Demo email:  ${DEMO_EMAIL}`);
  console.log(`  Org slug:    ${org.slug}`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
