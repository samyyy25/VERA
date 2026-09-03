"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateText = void 0;
const translationService_1 = require("../services/translation/translationService");
const translateText = async (req, res) => {
    try {
        const { text, targetLang, sourceLang } = req.body;
        if (!text) {
            return res.status(400).json({ error: 'text is required' });
        }
        const result = await translationService_1.translationService.translate(text, targetLang || 'en', sourceLang || 'auto');
        return res.status(200).json({
            success: true,
            data: result,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Translation error', message: error.message });
    }
};
exports.translateText = translateText;
