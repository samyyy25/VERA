import { Request, Response } from 'express';
import { overpassService } from '../services/emergency/overpassService';
import { smsService } from '../services/emergency/smsService';

export const getNearbyResponders = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const radius = parseInt((req.query.radius as string) || '5000', 10);

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
    }

    const responders = await overpassService.findNearbyResponders(lat, lon, radius);

    return res.status(200).json({
      success: true,
      data: responders,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Nearby search failed', message: error.message });
  }
};

export const getEmergencyPackage = async (req: Request, res: Response) => {
  try {
    const lat = parseFloat(req.query.lat as string);
    const lon = parseFloat(req.query.lon as string);
    const category = (req.query.category as string) || 'Accident';
    const riskScore = parseInt((req.query.risk_score as string) || '85', 10);
    const description = (req.query.description as string) || 'Emergency incident';

    if (isNaN(lat) || isNaN(lon)) {
      return res.status(400).json({ error: 'Valid lat and lon query parameters are required' });
    }

    const responders = await overpassService.findNearbyResponders(lat, lon, 5000);
    const nearestHospitalKm = responders.hospital ? responders.hospital.distance_meters / 1000 : undefined;

    const smsPayload = smsService.generateCompressedSMS(
      category,
      lat,
      lon,
      riskScore,
      description,
      nearestHospitalKm
    );

    return res.status(200).json({
      success: true,
      responders,
      smsPayload,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Emergency package generation failed', message: error.message });
  }
};
