"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.aiService = exports.AIService = void 0;
const axios_1 = __importDefault(require("axios"));
const env_1 = require("../../config/env");
// Fallback sequence of short context-aware questions when OmniRoute is offline
const EMERGENCY_FALLBACK_QUESTIONS = [
    "Are you or anyone nearby in immediate danger right now?",
    "Is anyone bleeding heavily or unconscious?",
    "How many people are injured or affected?",
    "Are you in a safe location to wait for responders?",
    "Do you require an ambulance, police, or fire response first?",
];
class AIService {
    /**
     * Check if local OmniRoute gateway is currently reachable
     */
    async isOmniRouteReachable() {
        try {
            const res = await axios_1.default.get(`${env_1.config.omniRoute.baseUrl}/models`, {
                timeout: 2000,
                headers: env_1.config.omniRoute.apiKey ? { Authorization: `Bearer ${env_1.config.omniRoute.apiKey}` } : {},
            });
            return res.status === 200;
        }
        catch {
            return false;
        }
    }
    /**
     * Generates the next short context-aware emergency question (Section 13)
     */
    async getNextEmergencyQuestion(incidentCategory, initialDescription, conversationHistory = []) {
        const isOnline = await this.isOmniRouteReachable();
        if (isOnline) {
            try {
                const systemPrompt = `You are VERA (Voice Emergency Response Assistant), an AI emergency dispatcher triage agent.
Your mission:
1. Ask exactly ONE short, clear, empathetic, but urgent emergency question to triage this incident.
2. Prioritize: 1. Immediate life danger, 2. Unconsciousness or bleeding injuries, 3. Number of victims, 4. Location safety.
3. NEVER ask multiple questions at once. Keep the question under 20 words.
4. IMPORTANT SAFETY: Never claim that you have dispatched an ambulance or police unless an official dispatch command is confirmed.

Current incident category: ${incidentCategory}
Initial citizen description: "${initialDescription}"`;
                const messages = [
                    { role: 'system', content: systemPrompt },
                    ...conversationHistory,
                ];
                const response = await axios_1.default.post(`${env_1.config.omniRoute.baseUrl}/chat/completions`, {
                    model: env_1.config.omniRoute.model,
                    messages,
                    temperature: 0.3,
                    max_tokens: 60,
                }, {
                    timeout: 6000,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(env_1.config.omniRoute.apiKey ? { Authorization: `Bearer ${env_1.config.omniRoute.apiKey}` } : {}),
                    },
                });
                const aiText = response.data?.choices?.[0]?.message?.content?.trim();
                if (aiText) {
                    return {
                        message: aiText,
                        source: 'omniroute',
                        modelUsed: env_1.config.omniRoute.model,
                    };
                }
            }
            catch (err) {
                console.warn('OmniRoute request error, falling back to rule-based triage:', err.message);
            }
        }
        // Fail-Safe Fallback (Guarantees demo and emergency workflow never fail)
        const assistantCount = conversationHistory.filter(m => m.role === 'assistant').length;
        const fallbackIndex = Math.min(assistantCount, EMERGENCY_FALLBACK_QUESTIONS.length - 1);
        const fallbackText = EMERGENCY_FALLBACK_QUESTIONS[fallbackIndex];
        return {
            message: fallbackText,
            source: 'rule_fallback',
            modelUsed: 'deterministic_triage_engine',
        };
    }
    /**
     * Generates a structured Responder Summary from dialogue history (Section 20)
     */
    async generateResponderSummary(category, description, conversationHistory, address) {
        const isOnline = await this.isOmniRouteReachable();
        if (isOnline) {
            try {
                const prompt = `Synthesize an Emergency Responder Briefing (max 80 words) based on the user's report and triage dialogue.
Category: ${category}
Address: ${address || 'GPS Coordinates'}
Report: "${description}"
Dialogue:
${conversationHistory.map(m => `${m.role.toUpperCase()}: ${m.content}`).join('\n')}

Format cleanly with:
- SITUATION:
- INJURIES/VICTIMS:
- IMMEDIATE HAZARDS:
- RECOMMENDED UNITS:`;
                const response = await axios_1.default.post(`${env_1.config.omniRoute.baseUrl}/chat/completions`, {
                    model: env_1.config.omniRoute.model,
                    messages: [{ role: 'user', content: prompt }],
                    temperature: 0.2,
                    max_tokens: 150,
                }, {
                    timeout: 6000,
                    headers: {
                        'Content-Type': 'application/json',
                        ...(env_1.config.omniRoute.apiKey ? { Authorization: `Bearer ${env_1.config.omniRoute.apiKey}` } : {}),
                    },
                });
                const summaryText = response.data?.choices?.[0]?.message?.content?.trim();
                if (summaryText)
                    return summaryText;
            }
            catch (err) {
                console.warn('OmniRoute summary generation fallback:', err);
            }
        }
        // Deterministic fallback summary
        return `SITUATION: ${category.toUpperCase()} reported at ${address || 'GPS Location'}.\nDETAILS: ${description}\nACTION: Immediate responder verification requested. Responder notification package prepared.`;
    }
}
exports.AIService = AIService;
exports.aiService = new AIService();
