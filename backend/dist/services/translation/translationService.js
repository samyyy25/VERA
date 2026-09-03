"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translationService = exports.TranslationService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
const translationCache = new Map();
class TranslationService {
    /**
     * Translate text between languages (e.g. Hindi/Spanish/French -> English)
     */
    async translate(text, targetLang = 'en', sourceLang = 'auto') {
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
            const libreRes = await axios_1.default.post(`${env_1.config.externalApis.libreTranslateUrl}/translate`, {
                q: text,
                source: sourceLang === 'auto' ? 'auto' : sourceLang,
                target: targetLang,
                format: 'text',
            }, { timeout: 3000 });
            if (libreRes.data?.translatedText) {
                const result = {
                    originalText: text,
                    translatedText: libreRes.data.translatedText,
                    sourceLang: libreRes.data.detectedLanguage?.language || sourceLang,
                    targetLang,
                    service: 'libretranslate',
                };
                translationCache.set(cacheKey, result);
                return result;
            }
        }
        catch {
            // Proceed to MyMemory fallback
        }
        // 2. Try MyMemory API (Free public endpoint)
        try {
            const srcPair = sourceLang === 'auto' ? 'autodetect' : sourceLang;
            const myMemoryUrl = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${srcPair}|${targetLang}`;
            const myMemRes = await axios_1.default.get(myMemoryUrl, { timeout: 4000 });
            if (myMemRes.data?.responseData?.translatedText) {
                const translated = myMemRes.data.responseData.translatedText;
                const result = {
                    originalText: text,
                    translatedText: translated,
                    sourceLang: myMemRes.data.matches?.[0]?.['source'] || sourceLang,
                    targetLang,
                    service: 'mymemory',
                };
                translationCache.set(cacheKey, result);
                return result;
            }
        }
        catch (err) {
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
exports.TranslationService = TranslationService;
exports.translationService = new TranslationService();
