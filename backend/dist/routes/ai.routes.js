"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const ai_controller_1 = require("../controllers/ai.controller");
const router = (0, express_1.Router)();
router.post('/respond', ai_controller_1.respondTriage);
router.post('/summary', ai_controller_1.generateSummary);
router.get('/status', ai_controller_1.checkOmniRouteStatus);
exports.default = router;
