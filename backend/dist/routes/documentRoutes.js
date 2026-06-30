"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = require("express");
const multer_1 = __importDefault(require("multer"));
const documentController_1 = require("../controllers/documentController");
const auth_1 = require("../middleware/auth");
const router = (0, express_1.Router)();
const upload = (0, multer_1.default)({ storage: multer_1.default.memoryStorage() });
router.use(auth_1.protect);
// Accept a single file with field name 'file'
router.post('/upload', upload.single('file'), (0, auth_1.checkProjectPermission)(['Admin', 'Editor']), documentController_1.uploadDocument);
router.get('/project/:projectId', (0, auth_1.checkProjectPermission)(['Admin', 'Editor', 'Viewer']), documentController_1.getDocumentsByProject);
router.delete('/:id', documentController_1.deleteDocument);
exports.default = router;
