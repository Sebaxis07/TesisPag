"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReviewVerdict = exports.getReviewById = exports.getReviewsForReviewer = exports.getReviewsByProject = exports.createReviewRequest = void 0;
const models_1 = require("../models");
// Create a review request
const createReviewRequest = async (req, res) => {
    try {
        const { project, itemType, itemId, itemTitle, version, reviewerId } = req.body;
        if (!project || !itemType || !itemId || !itemTitle || !reviewerId) {
            return res.status(400).json({ message: 'Todos los campos son requeridos' });
        }
        const reviewer = await models_1.User.findById(reviewerId);
        if (!reviewer) {
            return res.status(404).json({ message: 'Revisor/Docente no encontrado' });
        }
        const review = await models_1.DocumentReview.create({
            project,
            itemType,
            itemId,
            itemTitle,
            version: version || 1,
            status: 'Submitted',
            requestedBy: req.user._id,
            requestedByName: req.user.name,
            reviewer: reviewerId,
            reviewerName: reviewer.name,
            observations: '',
            submittedAt: new Date()
        });
        // Update status of the underlying item to "InReview" or similar
        if (itemType === 'Chapter') {
            await models_1.Document.findByIdAndUpdate(itemId, { status: 'InReview' });
        }
        else if (itemType === 'Deliverable') {
            await models_1.Deliverable.findByIdAndUpdate(itemId, { status: 'InReview' });
        }
        return res.status(201).json(review);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al solicitar revisión', error: error.message });
    }
};
exports.createReviewRequest = createReviewRequest;
// Get reviews for a project
const getReviewsByProject = async (req, res) => {
    try {
        const reviews = await models_1.DocumentReview.find({ project: req.params.projectId })
            .populate('requestedBy', 'name')
            .populate('reviewer', 'name')
            .sort({ createdAt: -1 });
        return res.json(reviews);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener revisiones del proyecto', error: error.message });
    }
};
exports.getReviewsByProject = getReviewsByProject;
// Get reviews assigned to current user (Advisor / Committee)
const getReviewsForReviewer = async (req, res) => {
    try {
        const reviews = await models_1.DocumentReview.find({ reviewer: req.user._id })
            .populate('requestedBy', 'name')
            .populate('project', 'name')
            .sort({ createdAt: -1 });
        return res.json(reviews);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener revisiones asignadas', error: error.message });
    }
};
exports.getReviewsForReviewer = getReviewsForReviewer;
// Get single review by ID
const getReviewById = async (req, res) => {
    try {
        const review = await models_1.DocumentReview.findById(req.params.id)
            .populate('requestedBy', 'name email')
            .populate('reviewer', 'name email')
            .populate('project', 'name');
        if (!review) {
            return res.status(404).json({ message: 'Revisión no encontrada' });
        }
        return res.json(review);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener la revisión', error: error.message });
    }
};
exports.getReviewById = getReviewById;
// Submit review verdict (Approve, Request Changes, Reject)
const submitReviewVerdict = async (req, res) => {
    try {
        const { status, observations } = req.body; // Approved, ChangesRequested, Rejected
        if (!['Approved', 'ChangesRequested', 'Rejected', 'InReview'].includes(status)) {
            return res.status(400).json({ message: 'Estado de revisión inválido' });
        }
        const review = await models_1.DocumentReview.findById(req.params.id);
        if (!review) {
            return res.status(404).json({ message: 'Revisión no encontrada' });
        }
        // Verify current user is the assigned reviewer or Admin/Coordinator
        if (review.reviewer.toString() !== req.user._id.toString() && req.user.role !== 'Admin' && req.user.role !== 'Coordinador') {
            return res.status(403).json({ message: 'No tienes permiso para emitir veredicto en esta revisión' });
        }
        review.status = status;
        review.observations = observations || review.observations;
        review.reviewedAt = new Date();
        // If Approved, generate simulated signature hash
        if (status === 'Approved') {
            const timestamp = new Date().toISOString();
            review.reviewerSignature = `SIGN-SHA256-${Buffer.from(`${req.user.name}-${req.user.rut}-${timestamp}`).toString('base64').substring(0, 16).toUpperCase()}`;
        }
        await review.save();
        // Update status on the actual item
        let itemStatus = 'Draft';
        if (status === 'Approved') {
            itemStatus = 'Approved';
        }
        else if (status === 'ChangesRequested') {
            itemStatus = 'ChangesRequested';
        }
        else if (status === 'Rejected') {
            itemStatus = 'Rejected';
        }
        else if (status === 'InReview') {
            itemStatus = 'InReview';
        }
        if (review.itemType === 'Chapter') {
            // Maps Approved/ChangesRequested to Document statuses ('Draft' | 'InReview' | 'Approved' | 'Frozen')
            let docStatus = 'Draft';
            if (status === 'Approved')
                docStatus = 'Approved';
            else if (status === 'InReview')
                docStatus = 'InReview';
            await models_1.Document.findByIdAndUpdate(review.itemId, { status: docStatus });
        }
        else if (review.itemType === 'Deliverable') {
            // Deliverable statuses: 'Pending' | 'InReview' | 'Approved' | 'ChangesRequested' | 'Finalized'
            let delStatus = 'Pending';
            if (status === 'Approved')
                delStatus = 'Approved';
            else if (status === 'ChangesRequested')
                delStatus = 'ChangesRequested';
            else if (status === 'Rejected')
                delStatus = 'Pending';
            else if (status === 'InReview')
                delStatus = 'InReview';
            await models_1.Deliverable.findByIdAndUpdate(review.itemId, { status: delStatus });
        }
        return res.json(review);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al enviar veredicto de revisión', error: error.message });
    }
};
exports.submitReviewVerdict = submitReviewVerdict;
