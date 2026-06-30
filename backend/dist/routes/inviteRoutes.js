"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const inviteController_1 = require("../controllers/inviteController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
// Public check
router.get('/check/:token', inviteController_1.checkInviteToken);
// Accept (requires authentication)
router.post('/accept/:token', auth_1.protect, inviteController_1.acceptInvite);
// Accept as Guest (does NOT require prior authentication / login)
router.post('/accept-guest/:token', inviteController_1.acceptInviteGuest);
// Scoped to projects
router.post('/project/:projectId', auth_1.protect, (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), inviteController_1.createInvite);
router.get('/project/:projectId', auth_1.protect, (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), inviteController_1.getInvitesByProject);
exports.default = router;
