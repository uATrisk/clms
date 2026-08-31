import { Router } from 'express';
import {
  getOrdersQueue,
  getActiveOrders,
  acceptOrder,
  updateOrderStatus,
  bulkUpdateOrderStatus,
  searchOrders,
  collectOrder,
} from '../controllers/staff-controller';
import { authenticate, authorize } from '../middlewares/auth-middleware';

const router = Router();

// Order Queue (Washer Dashboard)
router.get('/orders/queue', authenticate, authorize(['WASHER', 'ADMIN']), getOrdersQueue);
router.get('/orders/active', authenticate, authorize(['WASHER', 'ADMIN']), getActiveOrders);

// Order Acceptance (Dual-count verification)
router.patch('/orders/:id/accept', authenticate, authorize(['WASHER', 'ADMIN']), acceptOrder);

// Bulk Order Status Updates (Mark Ready in batch) - placed before :id param route
router.patch('/orders/bulk/status', authenticate, authorize(['WASHER', 'ADMIN']), bulkUpdateOrderStatus);

// Order Status Updates (Set ETA / Mark Ready)
router.patch('/orders/:id/status', authenticate, authorize(['WASHER', 'ADMIN']), updateOrderStatus);

// Order Search (Collection Center)
router.get('/orders/search', authenticate, authorize(['COLLECTION', 'WASHER', 'ADMIN']), searchOrders);

// Order Handover / Collection
router.patch('/orders/:id/collect', authenticate, authorize(['COLLECTION', 'WASHER', 'ADMIN']), collectOrder);

export default router;
