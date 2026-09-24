import { Router } from 'express';
import {
  getIncidents,
  getIncidentById,
  escalateIncident,
  getResponsePlan,
  confirmResponsePlan,
  modifyResponsePlan,
  getIncidentUpdates,
  createIncidentUpdate,
  togglePinUpdate,
} from '../controllers/incident.controller';

const router = Router();

router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.post('/:id/escalate', escalateIncident);

// Phase 2: Response Orchestration Routes
router.get('/:id/response-plan', getResponsePlan);
router.post('/:id/confirm-response', confirmResponsePlan);
router.post('/:id/modify-response', modifyResponsePlan);

// Live Incident Updates Routes
router.get('/:id/updates', getIncidentUpdates);
router.post('/:id/updates', createIncidentUpdate);
router.patch('/:id/updates/:updateId/pin', togglePinUpdate);

export default router;
