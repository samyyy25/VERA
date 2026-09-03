import axios from 'axios';
import { config } from '../../config/env';
import { calculateDistanceMeters } from '../riskEngine/riskScorer';

export interface NearbyResponderLocation {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'other';
  distance_meters: number;
  latitude: number;
  longitude: number;
  address?: string;
  phone?: string;
  directionsUrl: string;
}

export interface NearbyLocationsResult {
  hospital: NearbyResponderLocation | null;
  policeStation: NearbyResponderLocation | null;
  allLocations: NearbyResponderLocation[];
  searchRadiusMeters: number;
  source: 'overpass_live' | 'cached' | 'fallback_none';
}

const overpassCache = new Map<string, { data: NearbyLocationsResult; timestamp: number }>();
const OVERPASS_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

export class OverpassService {
  /**
   * Search real OSM hospitals and police stations around (latitude, longitude)
   */
  async findNearbyResponders(
    latitude: number,
    longitude: number,
    radiusMeters = 5000
  ): Promise<NearbyLocationsResult> {
    const cacheKey = `${latitude.toFixed(3)},${longitude.toFixed(3)},${radiusMeters}`;
    const cached = overpassCache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < OVERPASS_CACHE_TTL) {
      return { ...cached.data, source: 'cached' };
    }

    // Overpass QL Query for hospitals and police stations
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        node["healthcare"="hospital"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
      );
      out center 15;
    `;

    try {
      const response = await axios.post(
        config.externalApis.overpassUrl,
        `data=${encodeURIComponent(query)}`,
        {
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          timeout: 10000,
        }
      );

      const elements = response.data?.elements || [];
      const responders: NearbyResponderLocation[] = [];

      for (const el of elements) {
        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        if (!elLat || !elLon) continue;

        const tags = el.tags || {};
        const isHospital = tags.amenity === 'hospital' || tags.healthcare === 'hospital';
        const isPolice = tags.amenity === 'police';

        const name =
          tags.name ||
          tags['name:en'] ||
          (isHospital ? 'Civil Medical Center / Hospital' : 'Police Station / Post');

        const distance = Math.round(calculateDistanceMeters(latitude, longitude, elLat, elLon));

        const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${elLat},${elLon}`;

        responders.push({
          id: `osm_${el.id}`,
          name,
          type: isHospital ? 'hospital' : isPolice ? 'police' : 'other',
          distance_meters: distance,
          latitude: elLat,
          longitude: elLon,
          address: tags['addr:full'] || tags['addr:street'] || undefined,
          phone: tags.phone || tags['contact:phone'] || undefined,
          directionsUrl,
        });
      }

      // Sort by distance
      responders.sort((a, b) => a.distance_meters - b.distance_meters);

      const hospital = responders.find(r => r.type === 'hospital') || null;
      const policeStation = responders.find(r => r.type === 'police') || null;

      const result: NearbyLocationsResult = {
        hospital,
        policeStation,
        allLocations: responders,
        searchRadiusMeters: radiusMeters,
        source: 'overpass_live',
      };

      overpassCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    } catch (err: any) {
      console.warn('Overpass API query timeout or error:', err.message);

      return {
        hospital: null,
        policeStation: null,
        allLocations: [],
        searchRadiusMeters: radiusMeters,
        source: 'fallback_none',
      };
    }
  }

  /**
   * Generate directions link to nearest hospital or police station
   */
  getDirectionsLink(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}`;
  }
}

export const overpassService = new OverpassService();
