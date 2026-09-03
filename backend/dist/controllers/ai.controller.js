"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkOmniRouteStatus = exports.generateSummary = exports.respondTriage = void 0;
const aiService_1 = require("../services/omniRoute/aiService");
const respondTriage = async (req, res) => {
    try {
        const { category, description, conversationHistory } = req.body;
        if (!category || !description) {
            return res.status(400).json({ error: 'category and description are required' });
        }
        const aiResult = await aiService_1.aiService.getNextEmergencyQuestion(category, description, conversationHistory || []);
        return res.status(200).json({
            success: true,
            data: aiResult,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'AI triage error', message: error.message });
    }
};
exports.respondTriage = respondTriage;
const generateSummary = async (req, res) => {
    try {
        const { category, description, conversationHistory, address } = req.body;
        if (!category || !description) {
            return res.status(400).json({ error: 'category and description are required' });
        }
        const summary = await aiService_1.aiService.generateResponderSummary(category, description, conversationHistory || [], address);
        return res.status(200).json({
            success: true,
            summary,
        });
    }
    catch (error) {
        return res.status(500).json({ error: 'Summary generation error', message: error.message });
    }
};
exports.generateSummary = generateSummary;
const checkOmniRouteStatus = async (_req, res) => {
    const isOnline = await aiService_1.aiService.isOmniRouteReachable();
    return res.status(200).json({
        success: true,
        omniroute_online: isOnline,
        endpoint: 'http://localhost:20128/v1',
    });
};
exports.checkOmniRouteStatus = checkOmniRouteStatus;
