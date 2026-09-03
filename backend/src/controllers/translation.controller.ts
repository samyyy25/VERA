import { Request, Response } from 'express';
import { translationService } from '../services/translation/translationService';

export const translateText = async (req: Request, res: Response) => {
  try {
    const { text, targetLang, sourceLang } = req.body;

    if (!text) {
      return res.status(400).json({ error: 'text is required' });
    }

    const result = await translationService.translate(
      text,
      targetLang || 'en',
      sourceLang || 'auto'
    );

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error: any) {
    return res.status(500).json({ error: 'Translation error', message: error.message });
  }
};
