"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const auth_1 = require("../middleware/auth");
const auditController_1 = require("../controllers/auditController");
const router = (0, express_1.Router)();
// Only Project Admins or System Admins can retrieve audit logs
router.get('/project/:projectId', auth_1.protect, (0, auth_1.checkProjectPermission)(['Admin']), auditController_1.getAuditLogs);
exports.default = router;
