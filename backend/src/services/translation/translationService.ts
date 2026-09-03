import axios from 'axios';
import { config } from '../../config/env';

export interface TranslationResult {
  originalText: string;
  translatedText: string;
  sourceLang: string;
  targetLang: string;
  service: 'libretranslate' | 'mymemory' | 'cached' | 'fallback';
}

const translationCache = new Map<string, TranslationResult>();

export class TranslationService {
  /**
   * Translate text between languages (e.g. Hindi/Spanish/French -> English)
   */
  async translate(text: string, targetLang = 'en', sourceLang = 'auto'): Promise<TranslationResult> {
    if (!text || text.trim() === '') {
      return {
        originalText: '',
        translatedText: '',
        sourceLang,
        targetLang,
        service: 'fallback',
      };
    }

    const cacheKey = `${sourceLang}:${targetLang}:${text.trim().toLowerCase()}`;
    const cached = translationCache.get(cacheKey);
    if (cached) {
      return { ...cached, service: 'cached' };
    }

    // 1. Try LibreTranslate (if configured/available)
    try {
      const libreRes = await axios.post(
        `${config.externalApis.libreTranslateUrl}/translate`,
        {
          q: text,
          source: sourceLang === 'auto' ? 'auto' : sourceLang,
          target: targetLang,
          format: 'text',
        },
        { timeout: 3000 }
      );

      if (libreRes.data?.translatedText) {
        const result: TranslationResult = {
          originalText: text,
          translatedText: libreRes.data.translatedText,
          sourceLang: libreRes.data.detectedLanguage?.language || sourceLang,
          targetLang,
          service: 'libretranslate',
        };
        translationCache.set(cacheKey, result);
        return result;
      }
    } catch {
      // Proceed to MyMemory fallback
    }

    // 2. Try MyMemory API (Free public endpoint)
    try {
      const srcPair = sourceLang === 'auto' ? 'autodetect' : sourceLang;
      const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(
        text
      )}&langpair=${srcPair}|${targetLang}`;

      const myMemRes = await axios.get(myMemoryUrl, { timeout: 4000 });
      if (myMemRes.data?.responseData?.translatedText) {
        const translated = myMemRes.data.responseData.translatedText;
        const result: TranslationResult = {
          originalText: text,
          translatedText: translated,
          sourceLang: myMemRes.data.matches?.[0]?.['source'] || sourceLang,
          targetLang,
          service: 'mymemory',
        };
        translationCache.set(cacheKey, result);
        return result;
      }
    } catch (err: any) {
      console.warn('MyMemory translation error:', err.message);
    }

    // 3. Fallback: Return original text gracefully
    return {
      originalText: text,
      translatedText: text,
      sourceLang,
      targetLang,
      service: 'fallback',
    };
  }
}

export const translationService = new TranslationService();
