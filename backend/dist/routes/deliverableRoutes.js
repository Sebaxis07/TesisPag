"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const deliverableController_1 = require("../controllers/deliverableController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.use(auth_1.protect);
router.post('/', (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), deliverableController_1.createDeliverable);
router.post('/:id/version', upload.single('file'), (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), deliverableController_1.uploadVersion);
router.patch('/:id/freeze', (0, auth_1.checkProjectPermission)(['Admin']), deliverableController_1.freezeDeliverable);
router.get('/project/:projectId', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), deliverableController_1.getProjectDeliverables);
router.get('/:id/download/:versionNumber', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), deliverableController_1.downloadVersion);
router.post('/:id/version/:versionNumber/approve', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), deliverableController_1.approveDeliverableVersion);
exports.default = router;
