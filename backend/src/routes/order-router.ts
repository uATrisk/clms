import { Router } from 'express';
import { submitOrder, trackOrder } from '../controllers/order-controller';

const router = Router();

// Public endpoints
router.post('/', submitOrder);
router.get('/track/:orderCode', trackOrder);

export default router;
