import { Router } from 'express';
import { getStudentAnnouncements } from '../controllers/announcement-controller';
import { authenticate, authorize } from '../middlewares/auth-middleware';

const router = Router();

// Student-facing announcement feed
router.get('/', authenticate, authorize(['STUDENT']), getStudentAnnouncements);

export default router;
