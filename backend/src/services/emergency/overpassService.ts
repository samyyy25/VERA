import axios from 'axios';
import { config } from '../../config/env';
import { calculateDistanceMeters } from '../riskEngine/riskScorer';

export interface NearbyResponderLocation {
  id: string;
  name: string;
  type: 'hospital' | 'police' | 'fire_station' | 'municipal' | 'other';
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
  municipalOffice: NearbyResponderLocation | null;
  allLocations: NearbyResponderLocation[];
  searchRadiusMeters: number;
  source: 'overpass_live' | 'cached' | 'fallback_synthetic' | 'fallback_none';
}

const overpassCache = new Map<string, { data: NearbyLocationsResult; timestamp: number }>();
const OVERPASS_CACHE_TTL = 1000 * 60 * 30; // 30 minutes

const OVERPASS_ENDPOINTS = [
  config.externalApis.overpassUrl || 'https://overpass-api.de/api/interpreter',
  'https://lz4.overpass-api.de/api/interpreter',
  'https://overpass.private.coffee/api/interpreter',
  'https://maps.mail.ru/osm/tools/overpass/api/interpreter',
];

export class OverpassService {
  /**
   * Search real OSM hospitals, police stations, and municipal offices around (latitude, longitude)
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

    // Overpass QL Query for hospitals, police stations, and municipal corporation offices
    const query = `
      [out:json][timeout:15];
      (
        node["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="hospital"](around:${radiusMeters},${latitude},${longitude});
        node["healthcare"="hospital"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="police"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="townhall"](around:${radiusMeters},${latitude},${longitude});
        way["amenity"="townhall"](around:${radiusMeters},${latitude},${longitude});
        node["office"="government"](around:${radiusMeters},${latitude},${longitude});
        node["amenity"="public_building"](around:${radiusMeters},${latitude},${longitude});
      );
      out center 15;
    `.trim();

    let responseData: any = null;

    // Try endpoints with fallback
    for (const endpoint of OVERPASS_ENDPOINTS) {
      try {
        const response = await axios.post(
          endpoint,
          `data=${encodeURIComponent(query)}`,
          {
            headers: {
              'Content-Type': 'application/x-www-form-urlencoded; charset=UTF-8',
              'User-Agent': 'VERA-Voice-Emergency-Response-Assistant/1.0 (vera-emergency-app@local.dev)',
              'Accept': 'application/json',
            },
            timeout: 8000,
          }
        );

        if (response.data && Array.isArray(response.data.elements)) {
          responseData = response.data;
          break;
        }
      } catch (err: any) {
        console.warn(`Overpass API mirror (${endpoint}) failed: ${err.message}`);
      }
    }

    if (responseData && Array.isArray(responseData.elements) && responseData.elements.length > 0) {
      const elements = responseData.elements;
      const responders: NearbyResponderLocation[] = [];

      for (const el of elements) {
        const elLat = el.lat || el.center?.lat;
        const elLon = el.lon || el.center?.lon;
        if (!elLat || !elLon) continue;

        const tags = el.tags || {};
        const isHospital = tags.amenity === 'hospital' || tags.healthcare === 'hospital';
        const isPolice = tags.amenity === 'police';
        const isMunicipal =
          tags.amenity === 'townhall' ||
          tags.office === 'government' ||
          tags.amenity === 'public_building' ||
          tags.government === 'administrative';

        const name =
          tags.name ||
          tags['name:en'] ||
          (isHospital
            ? 'Civil Medical Center / Hospital'
            : isPolice
            ? 'Police Station / Post'
            : isMunicipal
            ? 'Municipal Corporation Ward & Zonal Office'
            : 'Public Authority Response Cell');

        const distance = Math.round(calculateDistanceMeters(latitude, longitude, elLat, elLon));
        const directionsUrl = `https://www.google.com/maps/dir/?api=1&origin=${latitude},${longitude}&destination=${elLat},${elLon}`;

        responders.push({
          id: `osm_${el.id}`,
          name,
          type: isHospital ? 'hospital' : isPolice ? 'police' : isMunicipal ? 'municipal' : 'other',
          distance_meters: distance,
          latitude: elLat,
          longitude: elLon,
          address: tags['addr:full'] || tags['addr:street'] || undefined,
          phone: tags.phone || tags['contact:phone'] || (isMunicipal ? '1533 / 1916' : undefined),
          directionsUrl,
        });
      }

      // Sort by distance
      responders.sort((a, b) => a.distance_meters - b.distance_meters);

      const hospital = responders.find(r => r.type === 'hospital') || null;
      const policeStation = responders.find(r => r.type === 'police') || null;
      const municipalOffice = responders.find(r => r.type === 'municipal') || null;

      const result: NearbyLocationsResult = {
        hospital,
        policeStation,
        municipalOffice,
        allLocations: responders,
        searchRadiusMeters: radiusMeters,
        source: 'overpass_live',
      };

      overpassCache.set(cacheKey, { data: result, timestamp: Date.now() });
      return result;
    }

    // Fallback: Generate synthetic local emergency stations around user coordinates if OSM is unavailable or empty
    const fallbackHospitalLat = latitude + 0.012;
    const fallbackHospitalLon = longitude + 0.009;
    const fallbackPoliceLat = latitude - 0.014;
    const fallbackPoliceLon = longitude + 0.011;
    const fallbackMuniLat = latitude + 0.008;
    const fallbackMuniLon = longitude - 0.012;

    const hospitalFallback: NearbyResponderLocation = {
      id: 'fallback_hosp_1',
      name: 'District General & Emergency Trauma Hospital',
      type: 'hospital',
      distance_meters: Math.round(calculateDistanceMeters(latitude, longitude, fallbackHospitalLat, fallbackHospitalLon)),
      latitude: fallbackHospitalLat,
      longitude: fallbackHospitalLon,
      phone: '108 / 112',
      address: 'Zonal Medical Complex',
      directionsUrl: this.getDirectionsLink(latitude, longitude, fallbackHospitalLat, fallbackHospitalLon),
    };

    const policeFallback: NearbyResponderLocation = {
      id: 'fallback_pol_1',
      name: 'Local Police Station & QRT Post',
      type: 'police',
      distance_meters: Math.round(calculateDistanceMeters(latitude, longitude, fallbackPoliceLat, fallbackPoliceLon)),
      latitude: fallbackPoliceLat,
      longitude: fallbackPoliceLon,
      phone: '100 / 112',
      address: 'Sector Police Headquarters',
      directionsUrl: this.getDirectionsLink(latitude, longitude, fallbackPoliceLat, fallbackPoliceLon),
    };

    const municipalFallback: NearbyResponderLocation = {
      id: 'fallback_muni_1',
      name: 'Municipal Corporation Zonal Office',
      type: 'municipal',
      distance_meters: Math.round(calculateDistanceMeters(latitude, longitude, fallbackMuniLat, fallbackMuniLon)),
      latitude: fallbackMuniLat,
      longitude: fallbackMuniLon,
      phone: '1533 / 1916',
      address: 'Municipal Civic Ward Center',
      directionsUrl: this.getDirectionsLink(latitude, longitude, fallbackMuniLat, fallbackMuniLon),
    };

    const fallbackResult: NearbyLocationsResult = {
      hospital: hospitalFallback,
      policeStation: policeFallback,
      municipalOffice: municipalFallback,
      allLocations: [hospitalFallback, policeFallback, municipalFallback],
      searchRadiusMeters: radiusMeters,
      source: 'fallback_synthetic',
    };

    return fallbackResult;
  }

  /**
   * Generate directions link to nearest hospital or police station
   */
  getDirectionsLink(fromLat: number, fromLon: number, toLat: number, toLon: number): string {
    return `https://www.google.com/maps/dir/?api=1&origin=${fromLat},${fromLon}&destination=${toLat},${toLon}`;
  }
}

export const overpassService = new OverpassService();
