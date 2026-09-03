import { Router } from 'express';
import { respondTriage, generateSummary, checkOmniRouteStatus } from '../controllers/ai.controller';

const router = Router();

router.post('/respond', respondTriage);
router.post('/summary', generateSummary);
router.get('/status', checkOmniRouteStatus);

export default router;
