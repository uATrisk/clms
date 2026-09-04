import assert from 'node:assert';
import { Request, Response, NextFunction } from 'express';
import { acceptOrder } from './staff-controller';
import { prisma } from '../db';

// Simple automated test runner using Node.js assert
async function runTests() {
  console.log('🧪 Running tests for acceptOrder flow...');

  // Mock Request, Response, NextFunction
  const mockReq = (user: any, body: any, params: any) => ({
    user,
    body,
    params,
  } as unknown as Request);

  const mockRes = () => {
    const res: any = {};
    res.status = (code: number) => {
      res.statusCode = code;
      return res;
    };
    res.json = (data: any) => {
      res.body = data;
      return res;
    };
    return res;
  };

  // Test 1: Missing staff ID in token
  {
    const req = mockReq(undefined, { verifiedCount: 5 }, { id: 'test-order' });
    const res = mockRes();
    let capturedError: any = null;
    const next: NextFunction = (err) => {
      capturedError = err;
    };

    await acceptOrder(req, res, next);
    assert(capturedError !== null, 'Should return an error for missing staff ID');
    assert.strictEqual(capturedError.status, 401, 'Should return 401 status when staff ID is missing');
    console.log('✅ Test 1 Passed: Missing staff ID in token is rejected with 401');
  }

  // Test 2: Invalid/non-existent staff ID (foreign key protection)
  {
    const req = mockReq({ id: '00000000-0000-0000-0000-000000000000', role: 'WASHER' }, { verifiedCount: 5 }, { id: 'test-order' });
    const res = mockRes();
    let capturedError: any = null;
    const next: NextFunction = (err) => {
      capturedError = err;
    };

    await acceptOrder(req, res, next);
    assert(capturedError !== null, 'Should return an error for non-existent staff ID');
    assert.strictEqual(capturedError.status, 401, 'Should return 401 status for invalid staff');
    console.log('✅ Test 2 Passed: Invalid staff ID is rejected with 401 before DB foreign key constraint');
  }

  // Test 3: Inactive staff ID is rejected with 401
  {
    const originalFindUnique = prisma.staff.findUnique;
    (prisma.staff as any).findUnique = async () => ({
      id: 'mock-inactive-staff-id',
      username: 'inactive_washer',
      name: 'Inactive Washer',
      role: 'WASHER',
      active: false,
    });

    try {
      const req = mockReq({ id: 'mock-inactive-staff-id', role: 'WASHER' }, { verifiedCount: 5 }, { id: 'test-order' });
      const res = mockRes();
      let capturedError: any = null;
      const next: NextFunction = (err) => {
        capturedError = err;
      };

      await acceptOrder(req, res, next);
      assert(capturedError !== null, 'Should return an error for inactive staff ID');
      assert.strictEqual(capturedError.status, 401, 'Should return 401 status for inactive staff');
      console.log('✅ Test 3 Passed: Inactive staff ID is rejected with 401');
    } finally {
      prisma.staff.findUnique = originalFindUnique;
    }
  }

  // Test 4: Validation Error on negative or invalid count (with valid active staff)
  {
    const originalFindUnique = prisma.staff.findUnique;
    (prisma.staff as any).findUnique = async () => ({
      id: 'mock-active-staff-id',
      username: 'active_washer',
      name: 'Active Washer',
      role: 'WASHER',
      active: true,
    });

    try {
      const req = mockReq({ id: 'mock-active-staff-id', role: 'WASHER' }, { verifiedCount: -1 }, { id: 'test-order' });
      const res = mockRes();
      let capturedError: any = null;
      const next: NextFunction = (err) => {
        capturedError = err;
      };

      await acceptOrder(req, res, next);
      assert(capturedError !== null, 'Should fail validation on negative count');
      assert.strictEqual(capturedError.status, 400, 'Should return 400 status for validation failure');
      console.log('✅ Test 4 Passed: Verified count validation protects boundary with 400');
    } finally {
      prisma.staff.findUnique = originalFindUnique;
    }
  }

  console.log('🎉 All acceptance flow tests passed successfully!');
}

runTests().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
