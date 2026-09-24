import { Router } from 'express';
import {
  createComplaint,
  getComplaints,
  getComplaintById,
  updateComplaintStatus,
  getRecentEvents,
  seedDemoComplaints,
} from '../controllers/complaint.controller';
import {
  getIncidentUpdates,
  createIncidentUpdate,
  togglePinUpdate,
} from '../controllers/incident.controller';

const router = Router();

// Seed demo data (4 realistic records)
router.post('/seed', seedDemoComplaints);

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

// Live Incident Updates
router.get('/:id/updates', getIncidentUpdates);
router.post('/:id/updates', createIncidentUpdate);
router.patch('/:id/updates/:updateId/pin', togglePinUpdate);

export default router;
