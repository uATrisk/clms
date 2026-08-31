import { Router } from 'express';
import { getProfile, updateProfile } from '../controllers/student-controller';
import { authenticate, authorize } from '../middlewares/auth-middleware';

const router = Router();

router.use(authenticate);
router.use(authorize(['STUDENT']));

router.get('/me', getProfile);
router.patch('/me', updateProfile);

export default router;
