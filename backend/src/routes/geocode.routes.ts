import { Router, Request, Response } from 'express';
import { reverseGeocode } from '../services/geolocation/nominatim';

const router = Router();

router.get('/reverse', async (req: Request, res: Response) => {
  const lat = parseFloat(req.query.lat as string);
  const lon = parseFloat(req.query.lon as string);

  if (isNaN(lat) || isNaN(lon)) {
    return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
  }

  try {
    const result = await reverseGeocode(lat, lon);
    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Reverse geocoding failed', message: error.message });
  }
});

export default router;
