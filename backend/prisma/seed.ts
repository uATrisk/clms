import { PrismaClient, StaffRole, OrderStatus, ComplaintCategory, ComplaintStatus, StudentGender } from '@prisma/client';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';

// ----------------------------------------------------------------------
// SAFETY GUARD: Must execute before any Prisma instantiation or database operation
// ----------------------------------------------------------------------
dotenv.config();

if (process.env.NODE_ENV !== 'development') {
  console.error('❌ SEED SAFETY ABORT: NODE_ENV must be exactly "development" to run this destructive script.');
  process.exit(1);
}

if (process.env.SEED_ALLOW_DESTRUCTIVE !== 'true') {
  console.error('❌ SEED SAFETY ABORT: Missing explicit consent. SEED_ALLOW_DESTRUCTIVE=true must be set in your environment variables to authorize the database wipe.');
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('❌ SEED SAFETY ABORT: DATABASE_URL is missing from the environment variables.');
  process.exit(1);
}

const prisma = new PrismaClient();

async function main() {
  console.log('🌱 Starting comprehensive database seed for local development...');

  // 1. Clean existing records in safe reverse-dependency order
  // Note: Using deleteMany to ensure idempotency when running multiple times locally
  console.log('🧹 Cleaning existing records (reverse dependency order)...');
  await prisma.complaint.deleteMany();
  await prisma.statusHistory.deleteMany();
  await prisma.order.deleteMany();
  await prisma.announcement.deleteMany();
  await prisma.student.deleteMany();
  await prisma.staff.deleteMany();

  // 2. Create Staff Members
  console.log('👥 Seeding Staff...');
  const saltRounds = 10;
  const defaultPassword = 'Password123!';
  const passwordHash = await bcrypt.hash(defaultPassword, saltRounds);

  const admin = await prisma.staff.create({
    data: { name: 'Admin Warden', username: 'admin_warden', role: StaffRole.ADMIN, passwordHash, active: true }
  });

  const washerJohn = await prisma.staff.create({
    data: { name: 'Washer John', username: 'washer_john', role: StaffRole.WASHER, passwordHash, active: true }
  });

  const washerSarah = await prisma.staff.create({
    data: { name: 'Washer Sarah', username: 'washer_sarah', role: StaffRole.WASHER, passwordHash, active: true }
  });

  const collectorAlex = await prisma.staff.create({
    data: { name: 'Collection Alex', username: 'alex_collect', role: StaffRole.COLLECTION, passwordHash, active: true }
  });

  console.log(`✅ Created 4 staff accounts (Password: ${defaultPassword})`);

  // 3. Create Students
  console.log('🎓 Seeding Students...');

  const student1 = await prisma.student.create({
    data: { name: 'Test Student One', email: 'test1@rishihood.edu.in', collegeId: 'SU2026-001', bagNumber: 'B-001', mobileNumber: '9999999991', gender: StudentGender.MALE }
  });

  const student2 = await prisma.student.create({
    data: { name: 'Test Student Two', email: 'test2@rishihood.edu.in', collegeId: 'SU2026-002', bagNumber: 'G-002', mobileNumber: '9999999992', gender: StudentGender.FEMALE }
  });

  const student3 = await prisma.student.create({
    data: { name: 'Test Student Three', email: 'test3@rishihood.edu.in', collegeId: 'SU2026-003', bagNumber: 'B-003', mobileNumber: '9999999993', gender: StudentGender.MALE }
  });

  const student4 = await prisma.student.create({
    data: { name: 'Test Student Four', email: 'test4@rishihood.edu.in', collegeId: 'SU2026-004', bagNumber: 'G-004', mobileNumber: '9999999994', gender: StudentGender.FEMALE }
  });

  const student5 = await prisma.student.create({
    data: { name: 'Test Student Five', email: 'test5@rishihood.edu.in', collegeId: 'SU2026-005', bagNumber: 'B-005', mobileNumber: '9999999995', gender: StudentGender.MALE }
  });

  const student6 = await prisma.student.create({
    data: { name: 'Test New Student', email: 'test6@rishihood.edu.in' } // No profile completed yet
  });

  console.log('✅ Created 6 students (1 without profile)');

  // 4. Create Orders & Status Histories in various lifecycle stages
  console.log('🧺 Seeding Orders & Audit Trails...');
  const now = new Date();

  // A helper function to create an order and its initial status history
  const createOrder = async (studentId: string, bagNumber: string, orderCode: string, selfReportedCount: number) => {
    const order = await prisma.order.create({
      data: {
        studentId,
        bagNumber,
        orderCode,
        selfReportedCount,
        status: OrderStatus.SUBMITTED
      }
    });

    await prisma.statusHistory.create({
      data: {
        orderId: order.id,
        fromStatus: null,
        toStatus: OrderStatus.SUBMITTED,
        note: 'Order submitted by student'
      }
    });
    return order;
  };

  const updateOrderStatus = async (orderId: string, fromStatus: OrderStatus, toStatus: OrderStatus, staffId: string, extraData: any = {}, note: string = '') => {
    const order = await prisma.order.update({
      where: { id: orderId },
      data: { status: toStatus, ...extraData }
    });

    await prisma.statusHistory.create({
      data: {
        orderId,
        fromStatus,
        toStatus,
        changedById: staffId,
        note
      }
    });
    return order;
  };

  // Order 1: SUBMITTED (Just dropped off)
  const order1 = await createOrder(student1.id, student1.bagNumber!, 'LN-1001', 12);

  // Order 2: ACCEPTED (Received by washer, count verified)
  const order2 = await createOrder(student2.id, student2.bagNumber!, 'LN-1002', 15);
  await updateOrderStatus(order2.id, OrderStatus.SUBMITTED, OrderStatus.ACCEPTED, washerJohn.id, { verifiedCount: 15, acceptedAt: new Date(now.getTime() - 1000 * 60 * 60) }, 'Verified count matches bag contents');

  // Order 3: PROCESSING (Washing in progress)
  const order3 = await createOrder(student3.id, student3.bagNumber!, 'LN-1003', 8);
  await updateOrderStatus(order3.id, OrderStatus.SUBMITTED, OrderStatus.ACCEPTED, washerSarah.id, { verifiedCount: 8, acceptedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24) });
  await updateOrderStatus(order3.id, OrderStatus.ACCEPTED, OrderStatus.PROCESSING, washerSarah.id, {
    assignedWasherId: washerSarah.id,
    expectedReadyAt: new Date(now.getTime() + 1000 * 60 * 60 * 48) // Due in 2 days
  });

  // Order 4: DELAYED (Washing was delayed, new ETA)
  const order4 = await createOrder(student4.id, student4.bagNumber!, 'LN-1004', 20);
  await updateOrderStatus(order4.id, OrderStatus.SUBMITTED, OrderStatus.ACCEPTED, washerJohn.id, { verifiedCount: 20, acceptedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) });
  await updateOrderStatus(order4.id, OrderStatus.ACCEPTED, OrderStatus.PROCESSING, washerJohn.id, { assignedWasherId: washerJohn.id });
  await updateOrderStatus(order4.id, OrderStatus.PROCESSING, OrderStatus.DELAYED, washerJohn.id, {
    expectedReadyAt: new Date(now.getTime() + 1000 * 60 * 60 * 24)
  }, 'Equipment maintenance delay');

  // Order 5: READY (Ready for collection with plaintext OTP via ADR 009)
  const order5 = await createOrder(student5.id, student5.bagNumber!, 'LN-1005', 10);
  await updateOrderStatus(order5.id, OrderStatus.SUBMITTED, OrderStatus.ACCEPTED, washerSarah.id, { verifiedCount: 10, acceptedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 3) });
  await updateOrderStatus(order5.id, OrderStatus.ACCEPTED, OrderStatus.PROCESSING, washerSarah.id, { assignedWasherId: washerSarah.id });

  const otpPlain = '456789';
  const hashedOtp = await bcrypt.hash(otpPlain, 10);

  await updateOrderStatus(order5.id, OrderStatus.PROCESSING, OrderStatus.READY, washerSarah.id, {
    actualReadyAt: new Date(),
    collectionOtp: hashedOtp,
    collectionOtpPlain: otpPlain, // ADR 009
    otpExpiresAt: new Date(now.getTime() + 1000 * 60 * 60 * 24 * 7) // Valid for 7 days
  });

  // Historical Order 6: COLLECTED (Fully completed)
  // Re-use student1 here for order history tests, safe since order6 is terminal
  const order6 = await createOrder(student1.id, student1.bagNumber!, 'LN-0999', 14);
  await updateOrderStatus(order6.id, OrderStatus.SUBMITTED, OrderStatus.ACCEPTED, washerJohn.id, { verifiedCount: 14, acceptedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 10) });
  await updateOrderStatus(order6.id, OrderStatus.ACCEPTED, OrderStatus.PROCESSING, washerJohn.id, { assignedWasherId: washerJohn.id });
  await updateOrderStatus(order6.id, OrderStatus.PROCESSING, OrderStatus.READY, washerJohn.id, { actualReadyAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 8) });
  await updateOrderStatus(order6.id, OrderStatus.READY, OrderStatus.COLLECTED, collectorAlex.id, {
    collectedAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7),
    returnedCount: 14,
    collectionOtpPlain: null // Scoped clearing
  }, 'Verified with OTP');

  console.log('✅ Created 6 Orders (1 terminal, 5 active across various states)');

  // 5. Create Complaints
  console.log('⚠️ Seeding Complaints...');

  // Open complaint on order 6
  await prisma.complaint.create({
    data: {
      orderId: order6.id,
      category: ComplaintCategory.MISSING,
      description: 'I am missing one pair of blue socks from my returned bag.',
      status: ComplaintStatus.OPEN
    }
  });

  // Resolved complaint also on order 6
  await prisma.complaint.create({
    data: {
      orderId: order6.id,
      category: ComplaintCategory.WRONG_COUNT,
      description: 'The app said 14 but I got 15 items.',
      status: ComplaintStatus.RESOLVED,
      resolutionNote: 'Extra item belonged to G-002, retrieved and redelivered.',
      handledById: admin.id,
      resolvedAt: new Date()
    }
  });

  console.log('✅ Created 2 Complaints');

  // 6. Create Announcements
  console.log('📢 Seeding Announcements...');

  await prisma.announcement.create({
    data: {
      title: 'Monsoon Laundry Delays',
      body: 'Due to heavy rains, drying times are extended. Please expect an additional 24-48 hours for turnaround. We appreciate your patience!',
      createdById: admin.id,
      isActive: true
    }
  });

  await prisma.announcement.create({
    data: {
      title: 'Welcome to the New CLMS',
      body: 'Welcome to the new digital laundry system! Ensure your profile is updated with your correct physical bag number to prevent drop-off delays.',
      createdById: admin.id,
      isActive: true,
      createdAt: new Date(now.getTime() - 1000 * 60 * 60 * 24 * 7)
    }
  });

  await prisma.announcement.create({
    data: {
      title: 'Old Notice',
      body: 'This notice is archived and should not appear on the student dashboard.',
      createdById: admin.id,
      isActive: false
    }
  });

  console.log('✅ Created 3 Announcements (2 active, 1 archived)');

  console.log('\n🎉 Database Seed Complete! Ready for local development.');
}

main()
  .catch((e) => {
    console.error('❌ SEEDING FAILED:');
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
