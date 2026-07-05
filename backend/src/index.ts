import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import { connectDB } from './config/db';

// Import routers
import authRoutes from './routes/authRoutes';
import projectRoutes from './routes/projectRoutes';
import meetingRoutes from './routes/meetingRoutes';
import requirementRoutes from './routes/requirementRoutes';
import adrRoutes from './routes/adrRoutes';
import diagramRoutes from './routes/diagramRoutes';
import taskRoutes from './routes/taskRoutes';
import reportRoutes from './routes/reportRoutes';
import auditRoutes from './routes/auditRoutes';
import traceLinkRoutes from './routes/traceLinkRoutes';
import documentRoutes from './routes/documentRoutes';
import notificationRoutes from './routes/notificationRoutes';
import inviteRoutes from './routes/inviteRoutes';
import presenceRoutes from './routes/presenceRoutes';
import commentRoutes from './routes/commentRoutes';
import deliverableRoutes from './routes/deliverableRoutes';
import approvalRoutes from './routes/approvalRoutes';
import proposalRoutes from './routes/proposalRoutes';
import reviewRoutes from './routes/reviewRoutes';
import evaluationRoutes from './routes/evaluationRoutes';

dotenv.config();

// Enforce JWT_SECRET requirement
if (!process.env.JWT_SECRET) {
  console.error('FATAL ERROR: JWT_SECRET environment variable is not defined.');
  process.exit(1);
}

const app = express();
const PORT = process.env.PORT || 5000;

// Connect to DB
connectDB();

// Middleware
app.use(cors({
  origin: ['http://localhost:5173', 'http://127.0.0.1:5173'],
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'PATCH'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Basic status route
app.get('/status', (req, res) => {
  res.json({ status: 'online', service: 'ThesisFlow Backend', timestamp: new Date() });
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/projects', projectRoutes);
app.use('/api/meetings', meetingRoutes);
app.use('/api/requirements', requirementRoutes);
app.use('/api/adrs', adrRoutes);
app.use('/api/diagrams', diagramRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/tracelinks', traceLinkRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/invites', inviteRoutes);
app.use('/api/presence', presenceRoutes);
app.use('/api/comments', commentRoutes);
app.use('/api/deliverables', deliverableRoutes);
app.use('/api/approvals', approvalRoutes);
app.use('/api/proposals', proposalRoutes);
app.use('/api/reviews', reviewRoutes);
app.use('/api/evaluations', evaluationRoutes);

// Global Error Handler
app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Internal Server Error', error: err.message });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
