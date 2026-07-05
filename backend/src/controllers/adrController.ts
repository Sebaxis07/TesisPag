import { Response } from 'express';
import { ADRDecision, ADRReview, Notification, TeamMember, User } from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';

// 1. Create ADR (Draft state initially)
export const createADR = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, code, title, context, decision, consequences, affectedRequirements, affectedStack, supersededBy } = req.body;

    if (!project || !code || !title) {
      return res.status(400).json({ message: 'Project, code, and title are required' });
    }

    // Role check (Admin, Editor, or Docente/Coordinador)
    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, project));
    if (role !== 'Admin' && role !== 'Editor' && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Only Admins, Editors, or Docentes can create ADRs' });
    }

    const adr = await ADRDecision.create({
      project,
      owner: req.user._id,
      code,
      title,
      status: 'Draft',
      context: context || '',
      decision: decision || '',
      consequences: consequences || '',
      version: 1,
      requiredApprovals: 2, // Quorum of 2 out of 3 team members
      currentApprovals: 0,
      affectedRequirements: affectedRequirements || [],
      affectedStack: affectedStack || [],
      supersededBy: supersededBy || null,
      isCriticalDecision: req.body.isCriticalDecision || false
    });

    if (req.body.supersededAdrId) {
      await ADRDecision.findByIdAndUpdate(req.body.supersededAdrId, {
        status: 'Superseded',
        supersededBy: adr._id
      });
    }

    await logAudit(req, project, 'CREATE_ADR', 'ADRDecision', adr._id.toString(), `Code: ${code}, Title: ${title} (Draft)`);

    return res.status(201).json(adr);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 2. Get ADRs by Project
export const getADRsByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (!role) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const adrs = await ADRDecision.find({ project: projectId }).sort({ code: 1 });
    return res.json(adrs);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 3. Get ADR by ID
export const getADRById = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const adr = await ADRDecision.findById(req.params.id);
    if (!adr) {
      return res.status(404).json({ message: 'ADR not found' });
    }

    const role = await getProjectRole(req.user._id, adr.project.toString());
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    return res.json(adr);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 4. Update ADR (Blocked if Accepted)
export const updateADR = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const adr = await ADRDecision.findById(req.params.id);
    if (!adr) {
      return res.status(404).json({ message: 'ADR not found' });
    }

    const role = await getProjectRole(req.user._id, adr.project.toString());
    const isOwner = adr.owner && adr.owner.toString() === req.user._id.toString();
    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role) || role === 'Admin';
    const isEditor = role === 'Editor';

    if (!isTeacherOrAdmin && !isEditor && !isOwner) {
      return res.status(403).json({ message: 'No tienes permisos para editar este ADR.' });
    }

    // Critical block: Structural edit forbidden for Accepted ADRs unless teacher/admin
    if (adr.status === 'Accepted' && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Este ADR ya ha sido aprobado y aceptado formalmente. Edición bloqueada.' });
    }

    const oldStatus = adr.status;
    Object.assign(adr, req.body);

    if (req.body.supersededAdrId) {
      await ADRDecision.findByIdAndUpdate(req.body.supersededAdrId, {
        status: 'Superseded',
        supersededBy: adr._id
      });
    }

    // If edited after changes requested, increment version and reset reviews
    if (oldStatus === 'ChangesRequested') {
      adr.status = 'Draft';
      adr.version = (adr.version || 1) + 1;
      await ADRReview.deleteMany({ adr: adr._id });
      adr.currentApprovals = 0;
    }

    await adr.save();

    await logAudit(
      req,
      adr.project.toString(),
      'UPDATE_ADR',
      'ADRDecision',
      adr._id.toString(),
      `Code: ${adr.code}, Title: ${adr.title} (v${adr.version})`
    );

    return res.json(adr);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 5. Delete ADR
export const deleteADR = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const adr = await ADRDecision.findById(req.params.id);
    if (!adr) {
      return res.status(404).json({ message: 'ADR not found' });
    }

    const role = await getProjectRole(req.user._id, adr.project.toString());
    const isOwner = adr.owner && adr.owner.toString() === req.user._id.toString();
    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role) || role === 'Admin';

    if (!isTeacherOrAdmin && !isOwner) {
      return res.status(403).json({ message: 'Solo el administrador, el docente o el creador del ADR pueden eliminarlo.' });
    }

    await ADRDecision.findByIdAndDelete(req.params.id);
    await ADRReview.deleteMany({ adr: adr._id }); // Cascade delete reviews

    await logAudit(
      req,
      adr.project.toString(),
      'DELETE_ADR',
      'ADRDecision',
      adr._id.toString(),
      `Code: ${adr.code}, Title: ${adr.title}`
    );

    return res.json({ message: 'ADR deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 6. Submit ADR for review
export const submitADRForReview = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const adr = await ADRDecision.findById(req.params.id);
    if (!adr) {
      return res.status(404).json({ message: 'ADR not found' });
    }

    const isOwner = adr.owner && adr.owner.toString() === req.user._id.toString();
    const isTeacherOrAdmin = ['Docente', 'Coordinador', 'Admin'].includes(req.user.role);
    if (!isOwner && !isTeacherOrAdmin) {
      return res.status(403).json({ message: 'Solo el propietario o el docente pueden enviar este ADR a revisión.' });
    }

    if (adr.status !== 'Draft' && adr.status !== 'ChangesRequested') {
      return res.status(400).json({ message: 'Solo se pueden enviar a revisión borradores o solicitudes de cambio.' });
    }

    adr.status = 'InReview';
    adr.submittedAt = new Date();
    await adr.save();

    // Reset any previous read status but keep comments if wanted, or delete reviews to start clean
    await ADRReview.deleteMany({ adr: adr._id });
    adr.currentApprovals = 0;
    await adr.save();

    // Notify other team members in the project
    const members = await TeamMember.find({ project: adr.project }).populate('user');
    const otherMembers = members.filter(m => m.user && (m.user as any)._id.toString() !== req.user._id.toString());

    const notifications = otherMembers.map(m => ({
      user: (m.user as any)._id,
      project: adr.project,
      message: `${req.user.name} ha enviado el ${adr.code}: "${adr.title}" a revisión formal de arquitectura.`,
      link: '/arquitectura',
      isRead: false
    }));

    if (notifications.length > 0) {
      await Notification.insertMany(notifications);
    }

    await logAudit(
      req,
      adr.project.toString(),
      'SUBMIT_ADR_REVIEW',
      'ADRDecision',
      adr._id.toString(),
      `Code: ${adr.code} submitted for team review.`
    );

    return res.json(adr);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 7. Get reviews for an ADR
export const getADRReviews = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const reviews = await ADRReview.find({ adr: req.params.id }).sort({ createdAt: 1 });
    return res.json(reviews);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

// 8. Submit Review (Approve, Reject, Request Changes)
export const submitADRReview = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { decision, comment } = req.body;
    if (!decision) {
      return res.status(400).json({ message: 'Decision is required (Approved, Rejected, SuggestedChanges)' });
    }

    const adr = await ADRDecision.findById(req.params.id);
    if (!adr) {
      return res.status(404).json({ message: 'ADR not found' });
    }

    // Must be project member
    const role = await getProjectRole(req.user._id, adr.project.toString());
    if (!role) {
      return res.status(403).json({ message: 'No eres miembro de este proyecto.' });
    }

    // Owner cannot review their own ADR
    if (adr.owner.toString() === req.user._id.toString()) {
      return res.status(403).json({ message: 'No puedes evaluar tus propias propuestas de arquitectura.' });
    }

    // ADR must be InReview or ChangesRequested
    if (adr.status !== 'InReview' && adr.status !== 'ChangesRequested') {
      return res.status(400).json({ message: 'Este ADR no se encuentra en periodo de evaluación activo.' });
    }

    // Save or update reviewer's feedback
    let review = await ADRReview.findOne({ adr: adr._id, reviewer: req.user._id });
    if (review) {
      review.decision = decision;
      review.comment = comment || '';
      review.hasRead = true;
      review.readAt = new Date();
      await review.save();
    } else {
      review = await ADRReview.create({
        adr: adr._id,
        reviewer: req.user._id,
        reviewerName: req.user.name,
        hasRead: true,
        readAt: new Date(),
        decision,
        comment: comment || ''
      });
    }

    // Recalculate status of ADR based on consensus rules
    const allReviews = await ADRReview.find({ adr: adr._id });
    const approvals = allReviews.filter(r => r.decision === 'Approved').length;
    const hasRejected = allReviews.some(r => r.decision === 'Rejected');
    const hasChangesRequested = allReviews.some(r => r.decision === 'SuggestedChanges');

    adr.currentApprovals = approvals;
    const oldStatus = adr.status;

    if (hasRejected) {
      adr.status = 'Rejected';
      adr.rejectedAt = new Date();
    } else if (hasChangesRequested) {
      adr.status = 'ChangesRequested';
      adr.reviewedAt = new Date();
    } else if (approvals >= adr.requiredApprovals) {
      adr.status = 'Accepted';
      adr.acceptedAt = new Date();
    } else {
      adr.status = 'InReview';
    }

    await adr.save();

    // Trigger state change notifications if status changed
    if (oldStatus !== adr.status) {
      const ownerUser = await User.findById(adr.owner);
      if (ownerUser) {
        let alertMessage = `El estado de tu ${adr.code} cambió a "${adr.status}".`;
        if (adr.status === 'Accepted') {
          alertMessage = `¡Tu propuesta ${adr.code}: "${adr.title}" ha sido aceptada y aprobada por el equipo!`;
        } else if (adr.status === 'ChangesRequested') {
          alertMessage = `${req.user.name} ha solicitado cambios en tu propuesta ${adr.code}.`;
        } else if (adr.status === 'Rejected') {
          alertMessage = `Tu propuesta ${adr.code} ha sido rechazada por el equipo.`;
        }

        await Notification.create({
          user: adr.owner,
          project: adr.project,
          message: alertMessage,
          link: '/arquitectura',
          isRead: false
        });
      }
    }

    await logAudit(
      req,
      adr.project.toString(),
      'SUBMIT_REVIEW',
      'ADRDecision',
      adr._id.toString(),
      `Review: ${decision} by ${req.user.name} for ${adr.code}. Result state: ${adr.status}.`
    );

    return res.json({ adr, review });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
