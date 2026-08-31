import { Router } from 'express';
import { login, googleAuth } from '../controllers/auth-controller';

const router = Router();

router.post('/login', login);
router.post('/google', googleAuth);

export default router;
