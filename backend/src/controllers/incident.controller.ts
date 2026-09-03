import { Request, Response } from 'express';
import { complaintStore } from '../services/store/complaintStore';

export const getIncidents = async (_req: Request, res: Response) => {
  try {
    const incidents = await complaintStore.getAllIncidents();
    return res.status(200).json({
      success: true,
      count: incidents.length,
      incidents,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const getIncidentById = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { complaint, events, incident } = await complaintStore.getComplaintById(id);

    if (!complaint) {
      return res.status(404).json({ error: 'Incident not found' });
    }

    return res.status(200).json({
      success: true,
      complaint,
      incident,
      events,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};

export const escalateIncident = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { reason, note } = req.body;

    const updated = await complaintStore.updateStatus(
      id,
      'Critical Incident',
      'ADMIN_OVERRIDE',
      note || `Manual emergency escalation triggered: ${reason || 'Operator discretion'}`
    );

    if (!updated) {
      return res.status(404).json({ error: 'Complaint not found' });
    }

    return res.status(200).json({
      success: true,
      message: 'Incident escalated to Critical Emergency',
      complaint: updated,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Internal Server Error', message: error.message });
  }
};
