"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const translation_controller_1 = require("../controllers/translation.controller");
const router = (0, express_1.Router)();
router.post('/', translation_controller_1.translateText);
exports.default = router;
