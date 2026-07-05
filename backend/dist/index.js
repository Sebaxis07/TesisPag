"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const cookie_parser_1 = __importDefault(require("cookie-parser"));
const dotenv_1 = __importDefault(require("dotenv"));
const db_1 = require("./config/db");
// Import routers
const authRoutes_1 = __importDefault(require("./routes/authRoutes"));
const projectRoutes_1 = __importDefault(require("./routes/projectRoutes"));
const meetingRoutes_1 = __importDefault(require("./routes/meetingRoutes"));
const requirementRoutes_1 = __importDefault(require("./routes/requirementRoutes"));
const adrRoutes_1 = __importDefault(require("./routes/adrRoutes"));
const diagramRoutes_1 = __importDefault(require("./routes/diagramRoutes"));
const taskRoutes_1 = __importDefault(require("./routes/taskRoutes"));
const reportRoutes_1 = __importDefault(require("./routes/reportRoutes"));
const auditRoutes_1 = __importDefault(require("./routes/auditRoutes"));
const traceLinkRoutes_1 = __importDefault(require("./routes/traceLinkRoutes"));
const documentRoutes_1 = __importDefault(require("./routes/documentRoutes"));
const notificationRoutes_1 = __importDefault(require("./routes/notificationRoutes"));
const inviteRoutes_1 = __importDefault(require("./routes/inviteRoutes"));
const presenceRoutes_1 = __importDefault(require("./routes/presenceRoutes"));
const commentRoutes_1 = __importDefault(require("./routes/commentRoutes"));
const deliverableRoutes_1 = __importDefault(require("./routes/deliverableRoutes"));
const approvalRoutes_1 = __importDefault(require("./routes/approvalRoutes"));
const proposalRoutes_1 = __importDefault(require("./routes/proposalRoutes"));
const reviewRoutes_1 = __importDefault(require("./routes/reviewRoutes"));
const evaluationRoutes_1 = __importDefault(require("./routes/evaluationRoutes"));
dotenv_1.default.config();
// Enforce JWT_SECRET requirement
if (!process.env.JWT_SECRET) {
    console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
    process.exit(1);
}
const app = (0, express_1.default)();
const PORT = process.env.PORT || 5000;
// Connect to DB
(0, db_1.connectDB)();
// Middleware
app.use((0, cors_1.default)({
    origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
    allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use((0, cookie_parser_1.default)());
app.use(express_1.default.json());
app.use(express_1.default.urlencoded({ extended: true }));
// Basic status route
app.get('/status', (req, res) => {
    res.json({ status: 'online', service: 'ThesisFlow Backend', timestamp: new Date() });
});
// Routes
app.use('/api/auth', authRoutes_1.default);
app.use('/api/projects', projectRoutes_1.default);
app.use('/api/meetings', meetingRoutes_1.default);
app.use('/api/requirements', requirementRoutes_1.default);
app.use('/api/adrs', adrRoutes_1.default);
app.use('/api/diagrams', diagramRoutes_1.default);
app.use('/api/tasks', taskRoutes_1.default);
app.use('/api/reports', reportRoutes_1.default);
app.use('/api/audit', auditRoutes_1.default);
app.use('/api/tracelinks', traceLinkRoutes_1.default);
app.use('/api/documents', documentRoutes_1.default);
app.use('/api/notifications', notificationRoutes_1.default);
app.use('/api/invites', inviteRoutes_1.default);
app.use('/api/presence', presenceRoutes_1.default);
app.use('/api/comments', commentRoutes_1.default);
app.use('/api/deliverables', deliverableRoutes_1.default);
app.use('/api/approvals', approvalRoutes_1.default);
app.use('/api/proposals', proposalRoutes_1.default);
app.use('/api/reviews', reviewRoutes_1.default);
app.use('/api/evaluations', evaluationRoutes_1.default);
// Global Error Handler
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({ message: 'Internal Server Error', error: err.message });
});
app.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});
