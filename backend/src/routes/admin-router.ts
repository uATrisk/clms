import { Router } from 'express';
import { authenticate, authorize } from '../middlewares/auth-middleware';
import {
  getStaffList,
  createStaff,
  updateStaffActiveStatus,
  getOrdersList,
  getAnalyticsSummary,
  getComplaintsList,
  updateComplaint,
} from '../controllers/admin-controller';
import {
  getAdminAnnouncements,
  createAnnouncement,
  updateAnnouncement,
} from '../controllers/announcement-controller';

const router = Router();

router.use(authenticate);
router.use(authorize(['ADMIN']));

// Staff management
router.get('/staff', getStaffList);
router.post('/staff', createStaff);
router.patch('/staff/:id', updateStaffActiveStatus);

// Master order view
router.get('/orders', getOrdersList);

// Complaints view & handling
router.get('/complaints', getComplaintsList);
router.patch('/complaints/:id', updateComplaint);

// Announcements management
router.get('/announcements', getAdminAnnouncements);
router.post('/announcements', createAnnouncement);
router.patch('/announcements/:id', updateAnnouncement);

// Analytics
router.get('/analytics/summary', getAnalyticsSummary);

export default router;
