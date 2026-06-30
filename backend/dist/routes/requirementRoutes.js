"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const requirementController_1 = require("../controllers/requirementController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
// Routes requiring project-level role validation
router.post('/', (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), requirementController_1.createRequirement);
router.post('/bulk', (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), requirementController_1.createRequirementsBulk);
router.get('/project/:projectId', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), requirementController_1.getRequirementsByProject);
router.post('/extract', (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), requirementController_1.extractRequirementsFromText);
// Individual resource endpoints (roles/ownership checked dynamically in controller)
router.get('/:id', requirementController_1.getRequirementById);
router.put('/:id', requirementController_1.updateRequirement);
router.delete('/:id', requirementController_1.deleteRequirement);
exports.default = router;
