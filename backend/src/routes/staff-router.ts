import { Router } from 'express';
import { getOrdersQueue, acceptOrder, updateOrderStatus } from '../controllers/staff-controller';
import { authenticate, authorize } from '../middlewares/auth-middleware';

const router = Router();

// Order Queue (Washer Dashboard)
router.get('/orders/queue', authenticate, authorize(['WASHER', 'ADMIN']), getOrdersQueue);

// Order Acceptance (Dual-count verification)
router.patch('/orders/:id/accept', authenticate, authorize(['WASHER', 'ADMIN']), acceptOrder);

// Order Status Updates (Set ETA / Mark Ready)
router.patch('/orders/:id/status', authenticate, authorize(['WASHER', 'ADMIN']), updateOrderStatus);

export default router;
