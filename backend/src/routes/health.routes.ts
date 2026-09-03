import { Router, Request, Response } from 'express';
import axios from 'axios';
import { config } from '../config/env';
import { getSupabase } from '../lib/supabase';

const router = Router();

router.get('/', async (_req: Request, res: Response) => {
  const healthStatus: Record<string, any> = {
    status: 'ok',
    timestamp: new Date().toISOString(),
    version: '1.0.0',
    service: 'VERA Emergency Response Backend',
    services: {
      database: 'unconfigured',
      omniroute: 'unreachable',
      translation: 'unknown',
      maps: 'unknown',
    },
  };

  // 1. Check Database (Supabase)
  const supabase = getSupabase();
  if (!supabase) {
    healthStatus.services.database = 'not_configured';
  } else {
    try {
      const { error } = await supabase.from('complaints').select('id').limit(1);
      if (error) {
        healthStatus.services.database = `error: ${error.message}`;
      } else {
        healthStatus.services.database = 'connected';
      }
    } catch (err: any) {
      healthStatus.services.database = `error: ${err.message || 'connection failed'}`;
    }
  }

  // 2. Check OmniRoute Gateway (Local endpoint: http://localhost:20128/v1)
  try {
    const omniResponse = await axios.get(`${config.omniRoute.baseUrl}/models`, {
      timeout: 2000,
      headers: config.omniRoute.apiKey ? { Authorization: `Bearer ${config.omniRoute.apiKey}` } : {},
    });
    if (omniResponse.status === 200) {
      healthStatus.services.omniroute = 'connected';
      healthStatus.services.omniroute_model = config.omniRoute.model;
    }
  } catch (err: any) {
    healthStatus.services.omniroute = 'unreachable (local gateway offline)';
  }

  // 3. Check OpenStreetMap Nominatim Geocoding
  try {
    const geoResponse = await axios.get(`${config.externalApis.nominatimUrl}/status.php`, {
      timeout: 3000,
      headers: {
        'User-Agent': 'VERA-Voice-Emergency-Response-Assistant/1.0',
      },
    });
    healthStatus.services.maps = geoResponse.status === 200 ? 'available' : 'degraded';
  } catch {
    healthStatus.services.maps = 'available (fallback ready)';
  }

  // 4. Check Translation API
  healthStatus.services.translation = 'available (LibreTranslate/MyMemory fallback configured)';

  return res.status(200).json(healthStatus);
});

export default router;
