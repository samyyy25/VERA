import { Router } from 'express';
import { getNearbyResponders, getEmergencyPackage } from '../controllers/location.controller';

const router = Router();

router.get('/nearby', getNearbyResponders);
router.get('/emergency-package', getEmergencyPackage);

export default router;
