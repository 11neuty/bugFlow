import bcrypt from "bcrypt";
import { PrismaClient, Role } from "@prisma/client";

const prisma = new PrismaClient();
const DEFAULT_PROJECT_NAME = "Default Project";

const users = [
  {
    email: "admin@bugtracker.dev",
    username: "admin_user",
    password: "Admin123!",
    name: "Admin User",
    role: Role.ADMIN,
  },
  {
    email: "qa@bugtracker.dev",
    username: "qa_analyst",
    password: "Qa123456!",
    name: "QA Analyst",
    role: Role.QA,
  },
  {
    email: "dev@bugtracker.dev",
    username: "developer",
    password: "Dev123456!",
    name: "Developer",
    role: Role.DEVELOPER,
  },
];

async function main() {
  await prisma.project.upsert({
    where: { name: DEFAULT_PROJECT_NAME },
    update: {
      name: DEFAULT_PROJECT_NAME,
    },
    create: {
      name: DEFAULT_PROJECT_NAME,
    },
  });

  for (const user of users) {
    const password = await bcrypt.hash(user.password, 10);

    await prisma.user.upsert({
      where: { email: user.email },
      update: {
        name: user.name,
        username: user.username,
        role: user.role,
        password,
      },
      create: {
        email: user.email,
        username: user.username,
        name: user.name,
        role: user.role,
        password,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
