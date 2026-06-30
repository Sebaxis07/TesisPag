import { Response } from 'express';
import crypto from 'crypto';
import { SourceDocument, Project } from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

const AI_SERVICE_URL = process.env.AI_SERVICE_URL || 'http://localhost:8000';

// Chunking helper
const createTextChunks = (text: string, chunkSize = 800, overlap = 100) => {
  const chunks: Array<{ text: string; index: number; tokenCount: number }> = [];
  let start = 0;
  let index = 0;

  while (start < text.length) {
    const end = Math.min(start + chunkSize, text.length);
    const chunkText = text.substring(start, end).trim();

    if (chunkText.length > 0) {
      chunks.push({
        text: chunkText,
        index,
        tokenCount: Math.ceil(chunkText.length / 4) // Token approximation
      });
      index++;
    }

    start += (chunkSize - overlap);
  }
  return chunks;
};

// Async background ingestion worker
const runDocumentIngestion = async (docId: string, fileBuffer: Buffer, filename: string, mimetype: string, documentType: string) => {
  try {
    // 1. Prepare form data to send to FastAPI
    const formData = new FormData();
    const blob = new Blob([fileBuffer], { type: mimetype });
    formData.append('file', blob, filename);

    // 2. Call FastAPI parser
    const response = await fetch(`${AI_SERVICE_URL}/ai/parse-pdf`, {
      method: 'POST',
      body: formData
    });

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`AI service parsing error: ${errText || response.statusText}`);
    }

    const data = await response.json() as any;
    const extractedText = data.extracted_text;

    if (!extractedText || extractedText.trim().length === 0) {
      throw new Error('No text could be extracted from this PDF document.');
    }

    if (documentType === 'guideline') {
      // Retrieve project context
      const docRecord = await SourceDocument.findById(docId);
      if (!docRecord) throw new Error('Document record not found');

      const project = await Project.findById(docRecord.project);
      const projectContext = project ? {
        name: project.name,
        description: project.description,
        problem: project.problem,
        objectives: project.objectives,
        restrictions: project.restrictions,
        companyName: project.companyName
      } : {};

      // Call FastAPI Guideline Analyzer
      const aiRes = await fetch(`${AI_SERVICE_URL}/ai/analyze-guideline`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          text: extractedText,
          project_context: projectContext
        })
      });

      if (!aiRes.ok) {
        const errText = await aiRes.text();
        throw new Error(`AI service guideline analysis error: ${errText || aiRes.statusText}`);
      }

      const resData = await aiRes.json() as any;
      const sections = resData.sections || [];

      // Update MongoDB document with status and structured sections
      await SourceDocument.findByIdAndUpdate(docId, {
        status: 'chunked', // 'chunked' triggers completion polling in current setup
        extractedText,
        guidelineStructure: sections
      });
    } else {
      // Perform overlapping chunking for context documents
      const chunks = createTextChunks(extractedText);

      // Update MongoDB document with status and chunks
      await SourceDocument.findByIdAndUpdate(docId, {
        status: 'chunked',
        extractedText,
        chunkCount: chunks.length,
        chunks
      });
    }
  } catch (err: any) {
    console.error(`Ingestion Pipeline failed for document ${docId}:`, err);
    await SourceDocument.findByIdAndUpdate(docId, {
      status: 'failed',
      errorMessage: err.message || 'Error parsing document'
    });
  }
};

export const uploadDocument = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId, documentType = 'context' } = req.body;
    const file = req.file;

    if (!projectId || !file) {
      return res.status(400).json({ message: 'Project ID and a PDF/text file are required.' });
    }

    // Role check (Admin or Editor)
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (role !== 'Admin' && role !== 'Editor') {
      return res.status(403).json({ message: 'Only Admins or Editors can upload documents to the Knowledge Base.' });
    }

    // Compute checksum to prevent duplicate uploads
    const checksum = crypto.createHash('sha256').update(file.buffer).digest('hex');

    const existing = await SourceDocument.findOne({ project: projectId, checksum });
    if (existing) {
      return res.status(400).json({ message: 'Este documento ya ha sido subido en este proyecto.' });
    }

    // Create record in database with "uploaded" status
    const doc = await SourceDocument.create({
      project: projectId,
      filename: file.originalname,
      fileType: file.mimetype,
      fileSize: file.size,
      checksum,
      status: 'uploaded',
      documentType,
      chunkCount: 0,
      chunks: [],
      guidelineStructure: [],
      uploadedBy: req.user._id
    });

    // Start background processing pipeline (non-blocking)
    runDocumentIngestion(doc._id.toString(), file.buffer, file.originalname, file.mimetype, documentType);

    await logAudit(
      req,
      projectId,
      'UPLOAD_SOURCE_DOCUMENT',
      'SourceDocument',
      doc._id.toString(),
      `Filename: ${file.originalname}, Tipo: ${documentType}, Size: ${(file.size / 1024).toFixed(1)} KB`
    );

    // Return 202 Accepted immediately
    return res.status(202).json(doc);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getDocumentsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (!role) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    // Select metadata only (exclude heavy chunk text and raw extracted text)
    const docs = await SourceDocument.find({ project: projectId })
      .select('-chunks -extractedText')
      .sort({ createdAt: -1 });

    return res.json(docs);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteDocument = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const doc = await SourceDocument.findById(id);

    if (!doc) {
      return res.status(404).json({ message: 'Document not found.' });
    }

    const role = await getProjectRole(req.user._id, doc.project.toString());
    const isOwner = doc.uploadedBy && doc.uploadedBy.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador del documento pueden eliminarlo.' });
    }

    await SourceDocument.findByIdAndDelete(id);

    await logAudit(
      req,
      doc.project.toString(),
      'DELETE_SOURCE_DOCUMENT',
      'SourceDocument',
      doc._id.toString(),
      `Filename: ${doc.filename}`
    );

    return res.json({ message: 'Document deleted successfully.' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
