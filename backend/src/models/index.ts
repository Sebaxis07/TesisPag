import { Schema, model, Document as MongooseDocument } from 'mongoose';

// 1. USER
export interface IUser extends MongooseDocument {
  name: string;
  rut: string;
  passwordHash: string;
  role: 'Admin' | 'Editor' | 'Viewer';
  assignedProjects: Schema.Types.ObjectId[];
}

const UserSchema = new Schema<IUser>({
  name: { type: String, required: true },
  rut: { type: String, required: true, unique: true, index: true },
  passwordHash: { type: String, required: true },
  role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], default: 'Viewer' },
  assignedProjects: [{ type: Schema.Types.ObjectId, ref: 'Project' }]
}, { timestamps: true });

export const User = model<IUser>('User', UserSchema);

// 2. PROJECT
export interface IProject extends MongooseDocument {
  name: string;
  description: string;
  problem: string;
  objectives: string;
  restrictions: string;
  companyName: string;
  companyContact: string;
  methodology: string; // e.g., 'Scrum', 'Kanban', 'Waterfall', 'Hibrida', 'Personalizada'
  createdAt: Date;
}

const ProjectSchema = new Schema<IProject>({
  name: { type: String, required: true },
  description: { type: String, default: '' },
  problem: { type: String, default: '' },
  objectives: { type: String, default: '' },
  restrictions: { type: String, default: '' },
  companyName: { type: String, default: '' },
  companyContact: { type: String, default: '' },
  methodology: { type: String, enum: ['Scrum', 'Kanban', 'Waterfall', 'Hibrida', 'Personalizada'], default: 'Scrum' }
}, { timestamps: true });

export const Project = model<IProject>('Project', ProjectSchema);

export interface ITeamMember extends MongooseDocument {
  user: Schema.Types.ObjectId;
  project: Schema.Types.ObjectId;
  role: 'Admin' | 'Editor' | 'Viewer';
  operationalRole: string; // e.g. "Líder Técnico", "Líder Funcional", "Líder Documental"
  workload: number; // e.g. percentage 0-100
  canComment: boolean;
}

const TeamMemberSchema = new Schema<ITeamMember>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  role: { type: String, enum: ['Admin', 'Editor', 'Viewer'], required: true },
  operationalRole: { type: String, default: 'Full Stack Developer' },
  workload: { type: Number, default: 0 },
  canComment: { type: Boolean, default: true }
}, { timestamps: true });

export const TeamMember = model<ITeamMember>('TeamMember', TeamMemberSchema);

// 4. MEETING
export interface IMeeting extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  title: string;
  date: Date;
  transcription: string;
  summary: string;
  agreements: string[];
  tasks: string[];
  risks: string[];
}

const MeetingSchema = new Schema<IMeeting>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  date: { type: Date, default: Date.now },
  transcription: { type: String, default: '' },
  summary: { type: String, default: '' },
  agreements: [{ type: String }],
  tasks: [{ type: String }],
  risks: [{ type: String }]
}, { timestamps: true });

export const Meeting = model<IMeeting>('Meeting', MeetingSchema);

// 5. REQUIREMENT
export interface IRequirement extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  code: string; // e.g., RF-01, RN-02
  title: string;
  description: string;
  type: 'Functional' | 'Non-Functional';
  priority: 'High' | 'Medium' | 'Low';
  status: 'Draft' | 'Approved' | 'In-Progress' | 'Completed';
  source: string; // e.g., "Reunión 28/06", "Sebastian Vasquez"
}

const RequirementSchema = new Schema<IRequirement>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  code: { type: String, required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  type: { type: String, enum: ['Functional', 'Non-Functional'], required: true },
  priority: { type: String, enum: ['High', 'Medium', 'Low'], default: 'Medium' },
  status: { type: String, enum: ['Draft', 'Approved', 'In-Progress', 'Completed'], default: 'Draft' },
  source: { type: String, default: 'Manual' }
}, { timestamps: true });

export const Requirement = model<IRequirement>('Requirement', RequirementSchema);

// 6. ADR DECISION
export interface IADRDecision extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  code: string; // e.g., ADR-01
  title: string;
  status: 'Draft' | 'InReview' | 'ChangesRequested' | 'Accepted' | 'Rejected' | 'Superseded';
  context: string;
  decision: string;
  consequences: string;
  version: number;
  submittedAt?: Date;
  reviewedAt?: Date;
  acceptedAt?: Date;
  rejectedAt?: Date;
  requiredApprovals: number;
  currentApprovals: number;
  finalDecisionNote?: string;
  supersededBy?: Schema.Types.ObjectId;
}

const ADRDecisionSchema = new Schema<IADRDecision>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
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
  supersededBy: { type: Schema.Types.ObjectId, ref: 'ADRDecision' }
}, { timestamps: true });

export const ADRDecision = model<IADRDecision>('ADRDecision', ADRDecisionSchema);

// 6b. ADR REVIEW
export interface IADRReview extends MongooseDocument {
  adr: Schema.Types.ObjectId;
  reviewer: Schema.Types.ObjectId;
  reviewerName: string;
  hasRead: boolean;
  readAt?: Date;
  decision?: 'Approved' | 'Rejected' | 'SuggestedChanges';
  comment?: string;
  createdAt: Date;
}

const ADRReviewSchema = new Schema<IADRReview>({
  adr: { type: Schema.Types.ObjectId, ref: 'ADRDecision', required: true },
  reviewer: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  reviewerName: { type: String, required: true },
  hasRead: { type: Boolean, default: false },
  readAt: { type: Date },
  decision: { type: String, enum: ['Approved', 'Rejected', 'SuggestedChanges'] },
  comment: { type: String, default: '' }
}, { timestamps: true });

export const ADRReview = model<IADRReview>('ADRReview', ADRReviewSchema);

// 6c. NOTIFICATION
export interface INotification extends MongooseDocument {
  user: Schema.Types.ObjectId;
  project: Schema.Types.ObjectId;
  message: string;
  link?: string;
  isRead: boolean;
  createdAt: Date;
}

const NotificationSchema = new Schema<INotification>({
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  message: { type: String, required: true },
  link: { type: String },
  isRead: { type: Boolean, default: false }
}, { timestamps: true });

export const Notification = model<INotification>('Notification', NotificationSchema);

// 7. DIAGRAM
export interface IDiagram extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  title: string;
  description: string;
  mermaidCode: string;
  type: string; // e.g. 'Architecture', 'Flowchart', 'Use Case'
}

const DiagramSchema = new Schema<IDiagram>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  mermaidCode: { type: String, required: true },
  type: { type: String, default: 'Flowchart' }
}, { timestamps: true });

export const Diagram = model<IDiagram>('Diagram', DiagramSchema);

// 8. TASK
export interface ITask extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  title: string;
  description: string;
  assignedTo: Schema.Types.ObjectId | null;
  status: 'Todo' | 'In-Progress' | 'Review' | 'Done';
  dueDate: Date | null;
  sprint: string; // e.g., "Sprint 1", "Fase de Requerimientos"
}

const TaskSchema = new Schema<ITask>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  description: { type: String, default: '' },
  assignedTo: { type: Schema.Types.ObjectId, ref: 'User', default: null },
  status: { type: String, enum: ['Todo', 'In-Progress', 'Review', 'Done'], default: 'Todo' },
  dueDate: { type: Date, default: null },
  sprint: { type: String, default: 'General' }
}, { timestamps: true });

export const Task = model<ITask>('Task', TaskSchema);

// 9. DOCUMENT / REPORT
export interface IDocument extends MongooseDocument {
  project: Schema.Types.ObjectId;
  owner: Schema.Types.ObjectId;
  title: string;
  templateType: string; // e.g. 'Capítulo 1: Introducción', 'Propuesta Técnica', 'Plan de Proyecto'
  content: string; // markdown content
  status: 'Draft' | 'Final';
  exportedPdfPath: string;
}

const DocumentSchema = new Schema<IDocument>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  owner: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  title: { type: String, required: true },
  templateType: { type: String, default: 'Personalizada' },
  content: { type: String, default: '' },
  status: { type: String, enum: ['Draft', 'Final'], default: 'Draft' },
  exportedPdfPath: { type: String, default: '' }
}, { timestamps: true });

export const Document = model<IDocument>('Document', DocumentSchema);

// 10. TRACE LINK
export interface ITraceLink extends MongooseDocument {
  project: Schema.Types.ObjectId;
  sourceType: 'Requirement' | 'Diagram' | 'Meeting' | 'ADRDecision' | 'Task' | 'Document';
  sourceId: Schema.Types.ObjectId;
  targetType: 'Requirement' | 'Diagram' | 'Meeting' | 'ADRDecision' | 'Task' | 'Document';
  targetId: Schema.Types.ObjectId;
  linkType: 'implements' | 'relates' | 'extracted_from' | 'models' | 'documents';
  createdBy: Schema.Types.ObjectId;
  createdAt: Date;
}

const TraceLinkSchema = new Schema<ITraceLink>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  sourceType: { type: String, enum: ['Requirement', 'Diagram', 'Meeting', 'ADRDecision', 'Task', 'Document'], required: true },
  sourceId: { type: Schema.Types.ObjectId, required: true },
  targetType: { type: String, enum: ['Requirement', 'Diagram', 'Meeting', 'ADRDecision', 'Task', 'Document'], required: true },
  targetId: { type: Schema.Types.ObjectId, required: true },
  linkType: { type: String, enum: ['implements', 'relates', 'extracted_from', 'models', 'documents'], required: true },
  createdBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

TraceLinkSchema.index({ project: 1, sourceId: 1 });
TraceLinkSchema.index({ project: 1, targetId: 1 });

export const TraceLink = model<ITraceLink>('TraceLink', TraceLinkSchema);

// 11. SOURCE DOCUMENT (For RAG)
export interface ISourceDocument extends MongooseDocument {
  project: Schema.Types.ObjectId;
  filename: string;
  fileType: string;
  fileSize: number;
  checksum: string;
  status: 'uploaded' | 'parsed' | 'chunked' | 'failed';
  errorMessage?: string;
  documentType: 'context' | 'guideline';
  chunkCount: number;
  chunks: Array<{
    text: string;
    index: number;
    tokenCount: number;
  }>;
  guidelineStructure?: Array<{
    title: string;
    level: number;
    instruction: string;
    suggestedContent?: string;
    suggestedDraft?: string;
  }>;
  uploadedBy: Schema.Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const SourceDocumentSchema = new Schema<ISourceDocument>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
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
  uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true }
}, { timestamps: true });

SourceDocumentSchema.index({ project: 1, checksum: 1 }, { unique: true });
SourceDocumentSchema.index({ "chunks.text": "text" });

export const SourceDocument = model<ISourceDocument>('SourceDocument', SourceDocumentSchema);

// 12. AUDIT LOG
export interface IAuditLog extends MongooseDocument {
  project: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  userName: string;
  action: string;
  resourceType: string;
  resourceId: string;
  details: string;
  timestamp: Date;
}

const AuditLogSchema = new Schema<IAuditLog>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  action: { type: String, required: true },
  resourceType: { type: String, required: true },
  resourceId: { type: String, required: true },
  details: { type: String, default: '' },
  timestamp: { type: Date, default: Date.now }
}, { timestamps: true });

AuditLogSchema.index({ project: 1, timestamp: -1 });

export const AuditLog = model<IAuditLog>('AuditLog', AuditLogSchema);

// 13. PROJECT INVITE
export interface IProjectInvite extends MongooseDocument {
  project: Schema.Types.ObjectId;
  email: string;
  role: 'Viewer';
  canComment: boolean;
  invitedBy: Schema.Types.ObjectId;
  token: string;
  status: 'Pending' | 'Accepted' | 'Expired' | 'Revoked';
  expiresAt: Date;
  acceptedBy?: Schema.Types.ObjectId;
  acceptedAt?: Date;
}

const ProjectInviteSchema = new Schema<IProjectInvite>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  email: { type: String, required: true },
  role: { type: String, enum: ['Viewer'], default: 'Viewer', required: true },
  canComment: { type: Boolean, default: true, required: true },
  invitedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  token: { type: String, required: true, unique: true },
  status: { type: String, enum: ['Pending', 'Accepted', 'Expired', 'Revoked'], default: 'Pending', required: true },
  expiresAt: { type: Date, required: true },
  acceptedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  acceptedAt: { type: Date }
}, { timestamps: true });

export const ProjectInvite = model<IProjectInvite>('ProjectInvite', ProjectInviteSchema);

// 14. PRESENCE SESSION
export interface IPresenceSession extends MongooseDocument {
  project: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  status: 'Online' | 'Away' | 'Offline';
  currentView?: string;
  lastSeenAt: Date;
  lastHeartbeatAt: Date;
}

const PresenceSessionSchema = new Schema<IPresenceSession>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  status: { type: String, enum: ['Online', 'Away', 'Offline'], default: 'Online', required: true },
  currentView: { type: String, default: '' },
  lastSeenAt: { type: Date, default: Date.now, required: true },
  lastHeartbeatAt: { type: Date, default: Date.now, required: true }
}, { timestamps: true });

// Index for automatic cleanup or querying
PresenceSessionSchema.index({ project: 1, lastHeartbeatAt: -1 });

export const PresenceSession = model<IPresenceSession>('PresenceSession', PresenceSessionSchema);

// 15. RESOURCE COMMENT
export interface IComment extends MongooseDocument {
  project: Schema.Types.ObjectId;
  user: Schema.Types.ObjectId;
  userName: string;
  resourceType: 'requirement' | 'meeting' | 'adr' | 'diagram' | 'task' | 'report';
  resourceId: string;
  content: string;
  isResolved: boolean;
  resolvedBy?: Schema.Types.ObjectId;
  resolvedAt?: Date;
  replies: Array<{
    user: Schema.Types.ObjectId;
    userName: string;
    content: string;
    createdAt: Date;
  }>;
}

const CommentSchema = new Schema<IComment>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
  user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  userName: { type: String, required: true },
  resourceType: { type: String, enum: ['requirement', 'meeting', 'adr', 'diagram', 'task', 'report'], required: true },
  resourceId: { type: String, required: true },
  content: { type: String, required: true },
  isResolved: { type: Boolean, default: false, required: true },
  resolvedBy: { type: Schema.Types.ObjectId, ref: 'User' },
  resolvedAt: { type: Date },
  replies: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    content: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

CommentSchema.index({ project: 1, resourceType: 1, resourceId: 1 });

export const Comment = model<IComment>('Comment', CommentSchema);

// 16. DELIVERABLE
export interface IDeliverable extends MongooseDocument {
  project: Schema.Types.ObjectId;
  name: string;
  description: string;
  dueDate: Date;
  status: 'Pending' | 'InReview' | 'Approved' | 'ChangesRequested' | 'Finalized';
  versions: Array<{
    versionNumber: number;
    filename: string;
    fileSize: number;
    filePath: string;
    comment: string;
    uploadedBy: Schema.Types.ObjectId;
    uploadedByName: string;
    createdAt: Date;
  }>;
  createdAt: Date;
  updatedAt: Date;
}

const DeliverableSchema = new Schema<IDeliverable>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
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
    uploadedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    uploadedByName: { type: String, required: true },
    createdAt: { type: Date, default: Date.now }
  }]
}, { timestamps: true });

export const Deliverable = model<IDeliverable>('Deliverable', DeliverableSchema);

// 17. APPROVAL
export interface IApproval extends MongooseDocument {
  project: Schema.Types.ObjectId;
  itemType: 'Requirement' | 'Meeting' | 'Deliverable' | 'Report' | 'ADRDecision';
  itemId: string; // The ID of the requirement, meeting, deliverable, etc.
  title: string;
  status: 'Pending' | 'Approved' | 'Rejected' | 'ChangesRequested';
  requestedBy: Schema.Types.ObjectId;
  requestedByName: string;
  approvals: Array<{
    user: Schema.Types.ObjectId;
    userName: string;
    status: 'Approved' | 'Rejected' | 'ChangesRequested';
    note: string;
    updatedAt: Date;
  }>;
  requiredApprovalsCount: number;
  currentApprovalsCount: number;
  createdAt: Date;
  updatedAt: Date;
}

const ApprovalSchema = new Schema<IApproval>({
  project: { type: Schema.Types.ObjectId, ref: 'Project', required: true },
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
  requestedBy: { type: Schema.Types.ObjectId, ref: 'User', required: true },
  requestedByName: { type: String, required: true },
  approvals: [{
    user: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    userName: { type: String, required: true },
    status: { type: String, enum: ['Approved', 'Rejected', 'ChangesRequested'], required: true },
    note: { type: String, default: '' },
    updatedAt: { type: Date, default: Date.now }
  }],
  requiredApprovalsCount: { type: Number, default: 1 },
  currentApprovalsCount: { type: Number, default: 0 }
}, { timestamps: true });

ApprovalSchema.index({ project: 1, itemType: 1, itemId: 1 });

export const Approval = model<IApproval>('Approval', ApprovalSchema);

