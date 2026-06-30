"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.Approval = exports.Deliverable = exports.Comment = exports.PresenceSession = exports.ProjectInvite = exports.AuditLog = exports.SourceDocument = exports.TraceLink = exports.Document = exports.Task = exports.Diagram = exports.Notification = exports.ADRReview = exports.ADRDecision = exports.Requirement = exports.Meeting = exports.TeamMember = exports.Project = exports.User = void 0;
const mongoose_1 = require("mongoose");
const UserSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    rut: { type: String, required: true, unique: true, index: true },
    passwordHash: { type: String, required: true },
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' },
    assignedProjects: [{ type: mongoose_1.Schema.Types.ObjectId, ref: 'Project' }]
}, { timestamps: true });
exports.User = (0, mongoose_1.model)('User', UserSchema);
const ProjectSchema = new mongoose_1.Schema({
    name: { type: String, required: true },
    description: { type: String, default: '' },
    problem: { type: String, default: '' },
    objectives: { type: String, default: '' },
    restrictions: { type: String, default: '' },
    companyName: { type: String, default: '' },
    companyContact: { type: String, default: '' },
    methodology: { type: String, enum: ['Scrum', 'Kanban', 'Waterfall', 'Hibrida', 'Personalizada'], default: 'Scrum' }
}, { timestamps: true });
exports.Project = (0, mongoose_1.model)('Project', ProjectSchema);
const TeamMemberSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
    operationalRole: { type: String, default: 'Full Stack Developer' },
    workload: { type: Number, default: 0 },
    canComment: { type: Boolean, default: true }
}, { timestamps: true });
exports.TeamMember = (0, mongoose_1.model)('TeamMember', TeamMemberSchema);
const MeetingSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    date: { type: Date, default: Date.now },
    transcription: { type: String, default: '' },
    summary: { type: String, default: '' },
    agreements: [{ type: String }],
    tasks: [{ type: String }],
    risks: [{ type: String }]
}, { timestamps: true });
exports.Meeting = (0, mongoose_1.model)('Meeting', MeetingSchema);
const RequirementSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    type: { type: String, enum: ['Functional', 'Non-Functional'], required: true },
    priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
    status: { type: String, enum: ['Draft', 'Approved', 'In-Progress', 'Completed'], default: 'Draft' },
    source: { type: String, default: 'Manual' }
}, { timestamps: true });
exports.Requirement = (0, mongoose_1.model)('Requirement', RequirementSchema);
const ADRDecisionSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    code: { type: String, required: true },
    title: { type: String, required: true },
    status: {
        type: String,
        enum: ['Draft', 'InReview', 'ChangesRequested', 'Accepted', 'Rejected', 'Superseded'],
        default: 'Draft'
    },
    context: { type: String, default: '' },
    decision: { type: String, default: '' },
    consequences: { type: String, default: '' },
    version: { type: Number, default: 1 },
    submittedAt: { type: Date },
    reviewedAt: { type: Date },
    acceptedAt: { type: Date },
    rejectedAt: { type: Date },
    requiredApprovals: { type: Number, default: 2 },
    currentApprovals: { type: Number, default: 0 },
    finalDecisionNote: { type: String },
    supersededBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ADRDecision' }
}, { timestamps: true });
exports.ADRDecision = (0, mongoose_1.model)('ADRDecision', ADRDecisionSchema);
const ADRReviewSchema = new mongoose_1.Schema({
    adr: { type: mongoose_1.Schema.Types.ObjectId, ref: 'ADRDecision', required: true },
    reviewer: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    reviewerName: { type: String, required: true },
    hasRead: { type: Boolean, default: false },
    readAt: { type: Date },
    decision: { type: String, enum: ['Approved', 'Rejected', 'SuggestedChanges'] },
    comment: { type: String, default: '' }
}, { timestamps: true });
exports.ADRReview = (0, mongoose_1.model)('ADRReview', ADRReviewSchema);
const NotificationSchema = new mongoose_1.Schema({
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    message: { type: String, required: true },
    link: { type: String },
    isRead: { type: Boolean, default: false }
}, { timestamps: true });
exports.Notification = (0, mongoose_1.model)('Notification', NotificationSchema);
const DiagramSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    mermaidCode: { type: String, required: true },
    type: { type: String, default: 'Flowchart' }
}, { timestamps: true });
exports.Diagram = (0, mongoose_1.model)('Diagram', DiagramSchema);
const TaskSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    description: { type: String, default: '' },
    assignedTo: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', default: null },
    status: { type: String, enum: ['Todo', 'In-Progress', 'Review', 'Done'], default: 'Todo' },
    dueDate: { type: Date, default: null },
    sprint: { type: String, default: 'General' }
}, { timestamps: true });
exports.Task = (0, mongoose_1.model)('Task', TaskSchema);
const DocumentSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    owner: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    title: { type: String, required: true },
    templateType: { type: String, default: 'Personalizada' },
    content: { type: String, default: '' },
    status: { type: String, enum: ['Draft', 'Final'], default: 'Draft' },
    exportedPdfPath: { type: String, default: '' }
}, { timestamps: true });
exports.Document = (0, mongoose_1.model)('Document', DocumentSchema);
const TraceLinkSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    sourceType: { type: String, enum: ['Requirement', 'Diagram', 'Meeting', 'ADRDecision', 'Task', 'Document'], required: true },
    sourceId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    targetType: { type: String, enum: ['Requirement', 'Diagram', 'Meeting', 'ADRDecision', 'Task', 'Document'], required: true },
    targetId: { type: mongoose_1.Schema.Types.ObjectId, required: true },
    linkType: { type: String, enum: ['implements', 'relates', 'extracted_from', 'models', 'documents'], required: true },
    createdBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
TraceLinkSchema.index({ project: 1, sourceId: 1 });
TraceLinkSchema.index({ project: 1, targetId: 1 });
exports.TraceLink = (0, mongoose_1.model)('TraceLink', TraceLinkSchema);
const SourceDocumentSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    filename: { type: String, required: true },
    fileType: { type: String, required: true },
    fileSize: { type: Number, required: true },
    checksum: { type: String, required: true },
    status: { type: String, enum: ['uploaded', 'parsed', 'chunked', 'failed'], default: 'uploaded' },
    errorMessage: { type: String },
    documentType: { type: String, enum: ['context', 'guideline'], default: 'context' },
    chunkCount: { type: Number, default: 0 },
    chunks: [{
            text: { type: String, required: true },
            index: { type: Number, required: true },
            tokenCount: { type: Number, required: true }
        }],
    guidelineStructure: [{
            title: { type: String, required: true },
            level: { type: Number, default: 1 },
            instruction: { type: String },
            suggestedContent: { type: String },
            suggestedDraft: { type: String }
        }],
    uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });
SourceDocumentSchema.index({ project: 1, checksum: 1 }, { unique: true });
SourceDocumentSchema.index({ "chunks.text": "text" });
exports.SourceDocument = (0, mongoose_1.model)('SourceDocument', SourceDocumentSchema);
const AuditLogSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    action: { type: String, required: true },
    resourceType: { type: String, required: true },
    resourceId: { type: String, required: true },
    details: { type: String, default: '' },
    timestamp: { type: Date, default: Date.now }
}, { timestamps: true });
AuditLogSchema.index({ project: 1, timestamp: -1 });
exports.AuditLog = (0, mongoose_1.model)('AuditLog', AuditLogSchema);
const ProjectInviteSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    email: { type: String, required: true },
    role: { type: String, enum: ['Viewer'], default: 'Viewer', required: true },
    canComment: { type: Boolean, default: true, required: true },
    invitedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    token: { type: String, required: true, unique: true },
    status: { type: String, enum: ['Pending', 'Accepted', 'Expired', 'Revoked'], default: 'Pending', required: true },
    expiresAt: { type: Date, required: true },
    acceptedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    acceptedAt: { type: Date }
}, { timestamps: true });
exports.ProjectInvite = (0, mongoose_1.model)('ProjectInvite', ProjectInviteSchema);
const PresenceSessionSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    status: { type: String, enum: ['Online', 'Away', 'Offline'], default: 'Online', required: true },
    currentView: { type: String, default: '' },
    lastSeenAt: { type: Date, default: Date.now, required: true },
    lastHeartbeatAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });
// Index for automatic cleanup or querying
PresenceSessionSchema.index({ project: 1, lastHeartbeatAt: -1 });
exports.PresenceSession = (0, mongoose_1.model)('PresenceSession', PresenceSessionSchema);
const CommentSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    resourceType: { type: String, enum: ['requirement', 'meeting', 'adr', 'diagram', 'task', 'report'], required: true },
    resourceId: { type: String, required: true },
    content: { type: String, required: true },
    isResolved: { type: Boolean, default: false, required: true },
    resolvedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User' },
    resolvedAt: { type: Date },
    replies: [{
            user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            userName: { type: String, required: true },
            content: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }]
}, { timestamps: true });
CommentSchema.index({ project: 1, resourceType: 1, resourceId: 1 });
exports.Comment = (0, mongoose_1.model)('Comment', CommentSchema);
const DeliverableSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    name: { type: String, required: true },
    description: { type: String, default: '' },
    dueDate: { type: Date, required: true },
    status: {
        type: String,
        enum: ['Pending', 'InReview', 'Approved', 'ChangesRequested', 'Finalized'],
        default: 'Pending',
        required: true
    },
    versions: [{
            versionNumber: { type: Number, required: true },
            filename: { type: String, required: true },
            fileSize: { type: Number, required: true },
            filePath: { type: String, required: true },
            comment: { type: String, default: '' },
            uploadedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            uploadedByName: { type: String, required: true },
            createdAt: { type: Date, default: Date.now }
        }]
}, { timestamps: true });
exports.Deliverable = (0, mongoose_1.model)('Deliverable', DeliverableSchema);
const ApprovalSchema = new mongoose_1.Schema({
    project: { type: mongoose_1.Schema.Types.ObjectId, ref: 'Project', required: true },
    itemType: {
        type: String,
        enum: ['Requirement', 'Meeting', 'Deliverable', 'Report', 'ADRDecision'],
        required: true
    },
    itemId: { type: String, required: true },
    title: { type: String, required: true },
    status: {
        type: String,
        enum: ['Pending', 'Approved', 'Rejected', 'ChangesRequested'],
        default: 'Pending',
        required: true
    },
    requestedBy: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
    requestedByName: { type: String, required: true },
    approvals: [{
            user: { type: mongoose_1.Schema.Types.ObjectId, ref: 'User', required: true },
            userName: { type: String, required: true },
            status: { type: String, enum: ['Approved', 'Rejected', 'ChangesRequested'], required: true },
            note: { type: String, default: '' },
            updatedAt: { type: Date, default: Date.now }
        }],
    requiredApprovalsCount: { type: Number, default: 1 },
    currentApprovalsCount: { type: Number, default: 0 }
}, { timestamps: true });
ApprovalSchema.index({ project: 1, itemType: 1, itemId: 1 });
exports.Approval = (0, mongoose_1.model)('Approval', ApprovalSchema);
