"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const projectController_1 = require("../controllers/projectController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
router.use(auth_1.protect);
router.post('/', projectController_1.createProject);
router.get('/', projectController_1.getProjects);
router.get('/:id', projectController_1.getProjectById);
router.put('/:id', projectController_1.updateProject);
router.delete('/:id', projectController_1.deleteProject);
router.post('/:projectId/members', projectController_1.addTeamMember);
router.get('/:projectId/members', projectController_1.getTeamMembers);
router.delete('/members/:memberId', projectController_1.removeTeamMember);
// AI stack comparison route
router.post('/:projectId/compare-stacks', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), projectController_1.compareProjectStacks);
router.post('/:projectId/presentation-helper', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), projectController_1.generatePresentationDefense);
exports.default = router;
