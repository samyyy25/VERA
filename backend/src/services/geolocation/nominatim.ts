import axios from 'axios';
import { config } from '../../config/env';

interface ReverseGeocodeResult {
  address: string;
  city?: string;
  state?: string;
  country?: string;
  postcode?: string;
  raw?: any;
}

// In-memory cache for reverse geocoding to respect OSM rate limits (max 1 req/sec)
const geocodeCache = new Map<string, { result: ReverseGeocodeResult; timestamp: number }>();
const CACHE_TTL_MS = 1000 * 60 * 60; // 1 hour

export const reverseGeocode = async (
  latitude: number,
  longitude: number
): Promise<ReverseGeocodeResult> => {
  // Round to 4 decimal places (~11 meters) for caching efficiency
  const cacheKey = `${latitude.toFixed(4)},${longitude.toFixed(4)}`;
  const cached = geocodeCache.get(cacheKey);

  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.result;
  }

  try {
    const url = `${config.externalApis.nominatimUrl}/reverse?format=json&lat=${latitude}&lon=${longitude}&zoom=18&addressdetails=1`;
    const response = await axios.get(url, {
      timeout: 5000,
      headers: {
        'User-Agent': 'VERA-Voice-Emergency-Response-Assistant/1.0 (vera-emergency-app@local.dev)',
        'Accept-Language': 'en',
      },
    });

    if (response.data && response.data.display_name) {
      const data = response.data;
      const addr = data.address || {};
      const result: ReverseGeocodeResult = {
        address: data.display_name,
        city: addr.city || addr.town || addr.village || addr.suburb,
        state: addr.state,
        country: addr.country,
        postcode: addr.postcode,
        raw: data,
      };

      geocodeCache.set(cacheKey, { result, timestamp: Date.now() });
      return result;
    }
  } catch (error: any) {
    console.warn(`Reverse geocoding failed for [${latitude}, ${longitude}]:`, error.message);
  }

  // Fallback if Nominatim fails or times out
  const fallbackResult: ReverseGeocodeResult = {
    address: `Coordinates: ${latitude.toFixed(5)}, ${longitude.toFixed(5)}`,
  };
  return fallbackResult;
};
