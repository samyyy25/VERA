import {
  Complaint,
  ResponsePlan,
  ResponseUnit,
  ResponderStatusMap,
  ConfirmationStatus,
  RiskLevel,
} from '../../types/complaint';
import { overpassService, NearbyResponderLocation } from './overpassService';
import { calculateDistanceMeters } from '../riskEngine/riskScorer';

export const CATEGORY_AUTHORITY_MAP: Record<
  string,
  {
    type: 'Civic' | 'Urgent';
    primaryName: string;
    primaryType: 'municipal' | 'police' | 'hospital' | 'fire_station';
    secondaryName: string;
    secondaryType: 'municipal' | 'police' | 'hospital' | 'fire_station';
    action: string;
  }
> = {
  'Road damage': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Roads Dept',
    primaryType: 'municipal',
    secondaryName: 'Local Traffic Police Division',
    secondaryType: 'police',
    action: 'Alert Municipal Corporation Roads Dept for urgent road repair, pothole filling, and barricading.',
  },
  'Garbage/waste': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Sanitation Dept',
    primaryType: 'municipal',
    secondaryName: 'Zonal Solid Waste Management Cell',
    secondaryType: 'municipal',
    action: 'Dispatch Municipal Sanitation truck and solid waste collection crew for area clearing.',
  },
  'Streetlight problems': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Electrical Dept',
    primaryType: 'municipal',
    secondaryName: 'Local Police Night Patrol Unit',
    secondaryType: 'police',
    action: 'Alert Municipal Electrical Dept for streetlight restoration and electrical line inspection.',
  },
  'Water leakage': {
    type: 'Civic',
    primaryName: 'Municipal Corporation — Water & Sewerage Dept',
    primaryType: 'municipal',
    secondaryName: 'Municipal Jal Sansthan Emergency Response',
    secondaryType: 'municipal',
    action: 'Dispatch Municipal Water & Sewerage repair team to isolate supply line and fix leakage.',
  },
  'Noise complaints': {
    type: 'Civic',
    primaryName: 'Local Police — Non-Emergency Civic Cell',
    primaryType: 'police',
    secondaryName: 'Municipal Corporation Grievance Cell',
    secondaryType: 'municipal',
    action: 'Notify Local Police Civic Cell to investigate noise disturbance and enforce decibel compliance.',
  },
  'Harassment': {
    type: 'Urgent',
    primaryName: 'Police Department — Emergency Control Room',
    primaryType: 'police',
    secondaryName: 'Nearest Quick Response Patrol Unit (PCR)',
    secondaryType: 'police',
    action: 'Dispatch nearest Police Emergency Response Vehicle and open live tactical monitoring.',
  },
  'Suspicious activity': {
    type: 'Urgent',
    primaryName: 'Police Department — Patrol Unit',
    primaryType: 'police',
    secondaryName: 'Local Police Station Chowki',
    secondaryType: 'police',
    action: 'Alert Police Patrol Unit to intercept and inspect suspicious activity at coordinates.',
  },
  'Accident': {
    type: 'Urgent',
    primaryName: 'Nearest Hospital Emergency Trauma',
    primaryType: 'hospital',
    secondaryName: 'Police Dept — Traffic Emergency Division',
    secondaryType: 'police',
    action: 'Dispatch ALS Ambulance and notify Police Department for urgent rescue and perimeter control.',
  },
  'Fire': {
    type: 'Urgent',
    primaryName: 'Fire & Rescue Services',
    primaryType: 'fire_station',
    secondaryName: 'Municipal Corporation — Water Dept (Hydrants)',
    secondaryType: 'municipal',
    action: 'Dispatch Fire Tender, alert Trauma Hospital, and notify Municipal Water Dept for hydrant pressure.',
  },
  'Medical Emergency': {
    type: 'Urgent',
    primaryName: 'Nearest Hospital Emergency & Ambulance Services',
    primaryType: 'hospital',
    secondaryName: 'Local Emergency Medical Support',
    secondaryType: 'hospital',
    action: 'Dispatch Advanced Life Support (ALS) Ambulance and reserve emergency trauma bed.',
  },
  'Other civic issues': {
    type: 'Civic',
    primaryName: 'General Municipal Helpdesk & Public Grievances',
    primaryType: 'municipal',
    secondaryName: 'Zonal Civic Action Squad',
    secondaryType: 'municipal',
    action: 'Route complaint to General Municipal Helpdesk and assign field officer.',
  },
};

export class ResponsePlanService {
  /**
   * Calculates realistic estimated response time in minutes based on distance
   * using an average urban emergency response speed of ~25-30 km/h with siren priority
   * plus standard 2-minute dispatch prep overhead.
   */
  public calculateETA(distanceKm: number): number {
    if (distanceKm <= 0.5) return 3;
    const travelTimeMinutes = (distanceKm / 25) * 60;
    const totalETA = Math.round(travelTimeMinutes + 2);
    return Math.max(3, Math.min(totalETA, 60));
  }

  private mapResponderToUnit(
    loc: NearbyResponderLocation,
    defaultStatus: ResponseUnit['status'] = 'Alerted'
  ): ResponseUnit {
    const distanceKm = +(loc.distance_meters / 1000).toFixed(1);
    const etaMinutes = this.calculateETA(distanceKm);

    return {
      id: loc.id,
      name: loc.name,
      type: loc.type,
      distance_km: distanceKm,
      estimated_eta_minutes: etaMinutes,
      is_estimate: true,
      phone:
        loc.phone ||
        (loc.type === 'hospital'
          ? '108'
          : loc.type === 'police'
          ? '100'
          : loc.type === 'municipal'
          ? '1533 / 1916'
          : '112'),
      address: loc.address,
      directions_url: loc.directionsUrl,
      latitude: loc.latitude,
      longitude: loc.longitude,
      status: defaultStatus,
    };
  }

  /**
   * Generates realistic fallback responders if external geocoding finds no results
   */
  private generateFallbackResponders(
    category: string,
    latitude: number,
    longitude: number
  ): { hospital: ResponseUnit; police: ResponseUnit; municipal: ResponseUnit; primaryMapped: ResponseUnit; secondaryMapped: ResponseUnit } {
    const config = CATEGORY_AUTHORITY_MAP[category] || CATEGORY_AUTHORITY_MAP['Other civic issues'];

    const hospitalLat = latitude + 0.012;
    const hospitalLon = longitude + 0.009;
    const policeLat = latitude - 0.014;
    const policeLon = longitude + 0.011;
    const municipalLat = latitude + 0.008;
    const municipalLon = longitude - 0.012;

    const hospitalDistKm = +(calculateDistanceMeters(latitude, longitude, hospitalLat, hospitalLon) / 1000).toFixed(1);
    const policeDistKm = +(calculateDistanceMeters(latitude, longitude, policeLat, policeLon) / 1000).toFixed(1);
    const municipalDistKm = +(calculateDistanceMeters(latitude, longitude, municipalLat, municipalLon) / 1000).toFixed(1);

    const hospital: ResponseUnit = {
      id: 'resp_fallback_hospital',
      name: category === 'Accident' || category === 'Medical Emergency' ? config.primaryName : 'Nearest Hospital Emergency & Trauma Care',
      type: 'hospital',
      distance_km: hospitalDistKm,
      estimated_eta_minutes: this.calculateETA(hospitalDistKm),
      is_estimate: true,
      phone: '108 / 112',
      address: `Nearby Medical Post (GPS: ${hospitalLat.toFixed(4)}, ${hospitalLon.toFixed(4)})`,
      directions_url: overpassService.getDirectionsLink(latitude, longitude, hospitalLat, hospitalLon),
      latitude: hospitalLat,
      longitude: hospitalLon,
      status: 'Alerted',
    };

    const police: ResponseUnit = {
      id: 'resp_fallback_police',
      name: config.primaryType === 'police' ? config.primaryName : config.secondaryType === 'police' ? config.secondaryName : 'Local Police Station & Patrol Unit',
      type: 'police',
      distance_km: policeDistKm,
      estimated_eta_minutes: this.calculateETA(policeDistKm),
      is_estimate: true,
      phone: '100 / 112',
      address: `Nearby Police Sector (GPS: ${policeLat.toFixed(4)}, ${policeLon.toFixed(4)})`,
      directions_url: overpassService.getDirectionsLink(latitude, longitude, policeLat, policeLon),
      latitude: policeLat,
      longitude: policeLon,
      status: 'Alerted',
    };

    const municipal: ResponseUnit = {
      id: 'resp_fallback_municipal',
      name: config.primaryType === 'municipal' ? config.primaryName : config.secondaryType === 'municipal' ? config.secondaryName : 'Municipal Corporation Zonal Office',
      type: 'municipal',
      distance_km: municipalDistKm,
      estimated_eta_minutes: this.calculateETA(municipalDistKm),
      is_estimate: true,
      phone: '1533 / 1916',
      address: `Municipal Corporation Zonal Office (GPS: ${municipalLat.toFixed(4)}, ${municipalLon.toFixed(4)})`,
      directions_url: overpassService.getDirectionsLink(latitude, longitude, municipalLat, municipalLon),
      latitude: municipalLat,
      longitude: municipalLon,
      status: 'Alerted',
    };

    // Primary mapped unit
    const primaryLat = config.primaryType === 'hospital' ? hospitalLat : config.primaryType === 'police' ? policeLat : municipalLat;
    const primaryLon = config.primaryType === 'hospital' ? hospitalLon : config.primaryType === 'police' ? policeLon : municipalLon;
    const primaryDist = config.primaryType === 'hospital' ? hospitalDistKm : config.primaryType === 'police' ? policeDistKm : municipalDistKm;

    const primaryMapped: ResponseUnit = {
      id: `resp_primary_${category.replace(/\s+/g, '_').toLowerCase()}`,
      name: config.primaryName,
      type: config.primaryType,
      distance_km: primaryDist,
      estimated_eta_minutes: this.calculateETA(primaryDist),
      is_estimate: true,
      phone: config.primaryType === 'hospital' ? '108' : config.primaryType === 'police' ? '100' : '1533 / 1916',
      address: `Zonal Operations Unit (GPS: ${primaryLat.toFixed(4)}, ${primaryLon.toFixed(4)})`,
      directions_url: overpassService.getDirectionsLink(latitude, longitude, primaryLat, primaryLon),
      latitude: primaryLat,
      longitude: primaryLon,
      status: 'Alerted',
    };

    // Secondary mapped unit
    const secondaryLat = config.secondaryType === 'hospital' ? hospitalLat : config.secondaryType === 'police' ? policeLat : municipalLat;
    const secondaryLon = config.secondaryType === 'hospital' ? hospitalLon : config.secondaryType === 'police' ? policeLon : municipalLon;
    const secondaryDist = config.secondaryType === 'hospital' ? hospitalDistKm : config.secondaryType === 'police' ? policeDistKm : municipalDistKm;

    const secondaryMapped: ResponseUnit = {
      id: `resp_secondary_${category.replace(/\s+/g, '_').toLowerCase()}`,
      name: config.secondaryName,
      type: config.secondaryType,
      distance_km: secondaryDist,
      estimated_eta_minutes: this.calculateETA(secondaryDist),
      is_estimate: true,
      phone: config.secondaryType === 'hospital' ? '108' : config.secondaryType === 'police' ? '100' : '1533 / 1916',
      address: `Support Division (GPS: ${secondaryLat.toFixed(4)}, ${secondaryLon.toFixed(4)})`,
      directions_url: overpassService.getDirectionsLink(latitude, longitude, secondaryLat, secondaryLon),
      latitude: secondaryLat,
      longitude: secondaryLon,
      status: 'Alerted',
    };

    return { hospital, police, municipal, primaryMapped, secondaryMapped };
  }

  /**
   * Creates an automated, actionable VERA Response Plan for an incident
   */
  public async generateResponsePlan(complaint: Complaint): Promise<ResponsePlan> {
    const lat = complaint.latitude;
    const lon = complaint.longitude;
    const category = complaint.category;
    const priority: RiskLevel = complaint.risk_level || 'CRITICAL';

    const config = CATEGORY_AUTHORITY_MAP[category] || CATEGORY_AUTHORITY_MAP['Other civic issues'];

    // 1. Fetch nearby physical responders via Overpass / OSM
    const searchResult = await overpassService.findNearbyResponders(lat, lon, 6000);
    const allResponders: ResponseUnit[] = [];

    const fallbacks = this.generateFallbackResponders(category, lat, lon);

    // Formulate primary responder with real OSM coordinates if available, or exact department name
    let primaryResponse: ResponseUnit = fallbacks.primaryMapped;
    let secondaryResponse: ResponseUnit = fallbacks.secondaryMapped;

    if (config.primaryType === 'hospital' && searchResult.hospital) {
      primaryResponse = {
        ...this.mapResponderToUnit(searchResult.hospital, 'Alerted'),
        name: `${searchResult.hospital.name} (${config.primaryName})`,
      };
    } else if (config.primaryType === 'police' && searchResult.policeStation) {
      primaryResponse = {
        ...this.mapResponderToUnit(searchResult.policeStation, 'Alerted'),
        name: `${searchResult.policeStation.name} (${config.primaryName})`,
      };
    } else if (config.primaryType === 'municipal' && searchResult.municipalOffice) {
      primaryResponse = {
        ...this.mapResponderToUnit(searchResult.municipalOffice, 'Alerted'),
        name: `${searchResult.municipalOffice.name} — ${config.primaryName}`,
      };
    }

    if (config.secondaryType === 'police' && searchResult.policeStation) {
      secondaryResponse = {
        ...this.mapResponderToUnit(searchResult.policeStation, 'Alerted'),
        name: `${searchResult.policeStation.name} (${config.secondaryName})`,
      };
    } else if (config.secondaryType === 'hospital' && searchResult.hospital) {
      secondaryResponse = {
        ...this.mapResponderToUnit(searchResult.hospital, 'Alerted'),
        name: `${searchResult.hospital.name} (${config.secondaryName})`,
      };
    } else if (config.secondaryType === 'municipal' && searchResult.municipalOffice) {
      secondaryResponse = {
        ...this.mapResponderToUnit(searchResult.municipalOffice, 'Alerted'),
        name: `${searchResult.municipalOffice.name} — ${config.secondaryName}`,
      };
    }

    allResponders.push(primaryResponse);
    allResponders.push(secondaryResponse);
    if (!allResponders.some(r => r.type === 'municipal')) allResponders.push(fallbacks.municipal);

    return {
      incident_id: complaint.id,
      priority,
      primary_response: primaryResponse,
      secondary_response: secondaryResponse,
      all_responders: allResponders,
      recommended_action: config.action,
      human_confirmation_required: priority === 'CRITICAL' || priority === 'HIGH',
      confirmation_status: 'PENDING_CONFIRMATION',
      responder_status: {
        police: 'Alerted',
        hospital: 'Alerted',
        ambulance: 'Standby',
        citizen: 'In contact',
      },
      created_at: new Date().toISOString(),
    };
  }

  /**
   * Applies human confirmation to the response plan
   */
  public confirmPlan(
    plan: ResponsePlan,
    confirmedBy = 'AUTHORIZED_OPERATOR'
  ): ResponsePlan {
    const now = new Date().toISOString();

    const updatedResponders = plan.all_responders.map(r => ({
      ...r,
      status: r.type === 'hospital' ? ('Alerted' as const) : ('Dispatched' as const),
    }));

    return {
      ...plan,
      confirmation_status: 'CONFIRMED',
      confirmed_at: now,
      confirmed_by: confirmedBy,
      primary_response: plan.primary_response
        ? { ...plan.primary_response, status: 'Dispatched' }
        : null,
      secondary_response: plan.secondary_response
        ? { ...plan.secondary_response, status: 'Dispatched' }
        : null,
      all_responders: updatedResponders,
      responder_status: {
        police: 'Dispatched',
        hospital: 'Alerted',
        ambulance: 'En route',
        citizen: 'Safe / Awaiting assistance',
      },
    };
  }
}

export const responsePlanService = new ResponsePlanService();
