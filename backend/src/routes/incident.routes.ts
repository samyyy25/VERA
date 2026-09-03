import { Router } from 'express';
import { getIncidents, getIncidentById, escalateIncident } from '../controllers/incident.controller';

const router = Router();

router.get('/', getIncidents);
router.get('/:id', getIncidentById);
router.post('/:id/escalate', escalateIncident);

export default router;
