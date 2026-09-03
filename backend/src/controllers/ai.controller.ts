import { Request, Response } from 'express';
import { aiService } from '../services/omniRoute/aiService';

export const respondTriage = async (req: Request, res: Response) => {
  try {
    const { category, description, conversationHistory } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'category and description are required' });
    }

    const aiResult = await aiService.getNextEmergencyQuestion(
      category,
      description,
      conversationHistory || []
    );

    return res.status(200).json({
      success: true,
      data: aiResult,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'AI triage error', message: error.message });
  }
};

export const generateSummary = async (req: Request, res: Response) => {
  try {
    const { category, description, conversationHistory, address } = req.body;

    if (!category || !description) {
      return res.status(400).json({ error: 'category and description are required' });
    }

    const summary = await aiService.generateResponderSummary(
      category,
      description,
      conversationHistory || [],
      address
    );

    return res.status(200).json({
      success: true,
      summary,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Summary generation error', message: error.message });
  }
};

export const checkOmniRouteStatus = async (_req: Request, res: Response) => {
  const isOnline = await aiService.isOmniRouteReachable();
  return res.status(200).json({
    success: true,
    omniroute_online: isOnline,
    endpoint: 'http://localhost:20128/v1',
  });
};
