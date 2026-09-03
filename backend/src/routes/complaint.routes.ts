import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getRecentEvents,
} from '../controllers/complaint.controller';


const router = Router();

// Citizen: Submit complaint
router.post('/', createComplaint);

// Admin & Feed: List complaints
router.get('/', getComplaints);

// Recent events across all complaints (for Dashboard feed)
router.get('/events', getRecentEvents);

// Detail & Timeline: Get single complaint
router.get('/:id', getComplaintById);


// Admin: Update status
router.patch('/:id/status', updateComplaintStatus);

export default router;
