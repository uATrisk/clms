import { PrismaClient, StaffRole } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Seeding database...');

  // Clean existing staff records (optional for local idempotency)
  await prisma.staff.deleteMany();

  const saltRounds = 10;
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const staffMembers = [
    {
      name: 'Washer John',
      username: 'washer_john',
      role: StaffRole.WASHER,
      passwordHash: passwordHash,
      active: true,
    },
    {
      name: 'Washer Sarah',
      username: 'washer_sarah',
      role: StaffRole.WASHER,
      passwordHash: passwordHash,
      active: true,
    },
    {
      name: 'Collection Staff Alex',
      username: 'alex_collect',
      role: StaffRole.COLLECTION,
      passwordHash: passwordHash,
      active: true,
    },
    {
      name: 'Admin Warden',
      username: 'admin_warden',
      role: StaffRole.ADMIN,
      passwordHash: passwordHash,
      active: true,
    },
  ];

  for (const staff of staffMembers) {
    const created = await prisma.staff.create({
      data: staff,
    });
    console.log(`Created staff: ${created.name} (${created.username}) - Role: ${created.role}`);
  }

  console.log('✅ Seeding completed! Default password for all seeded accounts: "Password123!"');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
