import { Request, Response } from 'express';
import { z } from 'zod';
import { complaintStore } from '../services/store/complaintStore';
import { reverseGeocode } from '../services/geolocation/nominatim';
import { ComplaintStatus } from '../types/complaint';

const createComplaintSchema = z.object({
  category: z.string().min(1, 'Category is required'),
  description: z.string().min(3, 'Description must be at least 3 characters'),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  gps_accuracy: z.number().optional().nullable(),
  address: z.string().optional().nullable(),
  photo_url: z.string().optional().nullable(),
  video_url: z.string().optional().nullable(),
  voice_transcript: z.string().optional().nullable(),
  device_session_id: z.string().min(1, 'Device session ID is required'),
});


const updateStatusSchema = z.object({
  status: z.enum([
    'Reported',
    'Verified',
    'In Progress',
    'Critical Incident',
    'Emergency Response',
    'Resolved',
  ]),
  note: z.string().optional(),
  changed_by: z.string().optional().default('ADMIN'),
});

export const createComplaint = async (req: Request, res: Response) => {
  try {
    const parseResult = createComplaintSchema.safeParse(req.body);
    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const data = parseResult.data;

    // Automatic reverse geocoding if address wasn't provided by client
    let address = data.address;
    if (!address || address.trim() === '') {
      const geo = await reverseGeocode(data.latitude, data.longitude);
      address = geo.address;
    }

    const result = await complaintStore.createComplaint({
      ...data,
      address: address || undefined,
      gps_accuracy: data.gps_accuracy || undefined,
      photo_url: data.photo_url || undefined,
      video_url: data.video_url || undefined,
      voice_transcript: data.voice_transcript || undefined,
    });


    return res.status(201).json({
      success: true,
      message: result.complaint.status === 'Critical Incident' 
        ? '🚨 Emergency detected: Incident automatically escalated to Critical Incident'
        : 'Complaint submitted successfully',
      complaint: result.complaint,
      risk_evaluation: result.riskEvaluation,
      incident: result.incident,
    });
  } catch (error: any) {
    console.error('Error creating complaint:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getComplaints = async (req: Request, res: Response) => {
  try {
    const { category, status, risk_level, search } = req.query;

    const complaints = await complaintStore.getAllComplaints({
      category: category as string,
      status: status as string,
      risk_level: risk_level as string,
      search: search as string,
    });

    return res.status(200).json({
      success: true,
      count: complaints.length,
      complaints,
    });
  } catch (error: any) {
    console.error('Error listing complaints:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getComplaintById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { complaint, events } = await complaintStore.getComplaintById(id);

    if (!complaint) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    return res.status(200).json({
      success: true,
      complaint,
      events,
    });
  } catch (error: any) {
    console.error('Error fetching complaint details:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const updateComplaintStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const parseResult = updateStatusSchema.safeParse(req.body);

    if (!parseResult.success) {
      return res.status(400).json({
        error: 'Validation failed',
        details: parseResult.error.errors,
      });
    }

    const { status, note, changed_by } = parseResult.data;
    const updated = await complaintStore.updateStatus(
      id,
      status as ComplaintStatus,
      changed_by || 'ADMIN',
      note
    );

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    return res.status(200).json({
      success: true,
      message: `Complaint status updated to ${status}`,
      complaint: updated,
    });
  } catch (error: any) {
    console.error('Error updating status:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getRecentEvents = async (req: Request, res: Response) => {
  try {
    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const events = await complaintStore.getRecentEvents(limit);
    return res.status(200).json({ success: true, count: events.length, events });
  } catch (error: any) {
    console.error('Error fetching recent events:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const seedDemoComplaints = async (_req: Request, res: Response) => {
  try {
    const result = await complaintStore.seedDemoData();
    return res.status(200).json({
      success: true,
      message: `Successfully seeded ${result.seeded} demo complaints into VERA`,
      count: result.complaints.length,
      complaints: result.complaints,
    });
  } catch (error: any) {
    console.error('Error seeding demo data:', error);
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

