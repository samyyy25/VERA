import { Router } from 'express';
import healthRoutes from './health.routes';
import complaintRoutes from './complaint.routes';
import incidentRoutes from './incident.routes';
import geocodeRoutes from './geocode.routes';
import aiRoutes from './ai.routes';
import translationRoutes from './translation.routes';
import locationRoutes from './location.routes';

const router = Router();

// Health & status endpoints
router.use('/health', healthRoutes);

// Complaint Management endpoints
router.use('/complaints', complaintRoutes);

// Escalated Emergency Incidents endpoints
router.use('/incidents', incidentRoutes);

// Geolocation & reverse geocoding endpoints
router.use('/geocode', geocodeRoutes);

// AI & OmniRoute endpoints
router.use('/ai', aiRoutes);

// Multilingual Translation endpoints
router.use('/translate', translationRoutes);

// Nearby Emergency Services (Overpass POIs) & SMS
router.use('/locations', locationRoutes);

export default router;
