import { Router } from 'express';
import { submitOrder, trackOrder, raiseComplaint, getMyActiveOrder } from '../controllers/order-controller';
import { authenticate, authorize } from '../middlewares/auth-middleware';

const router = Router();

// Student-only endpoints
router.get('/my-active', authenticate, authorize(['STUDENT']), getMyActiveOrder);
router.post('/', authenticate, authorize(['STUDENT']), submitOrder);
router.post('/:orderCode/complaint', authenticate, authorize(['STUDENT']), raiseComplaint);

// Tracking endpoint accessible by STUDENT (owner) or STAFF
router.get('/track/:orderCode', authenticate, trackOrder);

export default router;
