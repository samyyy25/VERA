import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from .env file
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

export const config = {
  port: parseInt(process.env.PORT || '5000', 10),
  nodeEnv: process.env.NODE_ENV || 'development',
  corsOrigin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  
  supabase: {
    url: process.env.SUPABASE_URL || process.env.VITE_SUPABASE_URL || '',
    serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    anonKey: process.env.SUPABASE_ANON_KEY || process.env.VITE_SUPABASE_ANON_KEY || '',
  },

  omniRoute: {
    baseUrl: process.env.OMNIROUTE_BASE_URL || 'http://localhost:20128/v1',
    apiKey: process.env.OMNIROUTE_API_KEY || '',
    model: process.env.OMNIROUTE_MODEL || 'default-model',
  },

  externalApis: {
    libreTranslateUrl: process.env.LIBRETRANSLATE_URL || 'https://libretranslate.com',
    nominatimUrl: process.env.NOMINATIM_URL || 'https://nominatim.openstreetmap.org',
    overpassUrl: process.env.OVERPASS_URL || 'https://overpass-api.de/api/interpreter',
  },

  email: {
    apiKey: process.env.EMAIL_SERVICE_API_KEY || '',
    fromAddress: process.env.EMAIL_FROM_ADDRESS || 'VERA Emergency Dispatch <notifications@vera-emergency.local>',
  },
};

