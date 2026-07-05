import { Response } from 'express';
import { Task, TraceLink, Requirement } from '../models';
import { ProjectAuthRequest, getProjectRole } from '../middleware/auth';
import { logAudit } from '../utils/auditLogger';
import { recalculateRequirementsForTask, recalculateRequirementStatus } from '../utils/requirementStatusHelper';

export const createTask = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { project, title, description, assignedTo, status, dueDate, sprint, linkedRequirements } = req.body;

    if (!project || !title) {
      return res.status(400).json({ message: 'Project and title are required' });
    }

    // Role check (Admin or Editor)
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, project));
    if (role !== 'Admin' && role !== 'Editor') {
      return res.status(403).json({ message: 'Only Admins or Editors can create tasks' });
    }

    const task = await Task.create({
      project,
      owner: req.user._id,
      title,
      description: description || '',
      assignedTo: assignedTo || null,
      status: status || 'Todo',
      dueDate: dueDate || null,
      sprint: sprint || 'General'
    });

    // Link requirements if provided
    if (Array.isArray(linkedRequirements) && linkedRequirements.length > 0) {
      for (const reqId of linkedRequirements) {
        await TraceLink.create({
          project,
          sourceType: 'Requirement',
          sourceId: reqId,
          targetType: 'Task',
          targetId: task._id,
          linkType: 'implements',
          createdBy: req.user._id
        });

        await Requirement.findByIdAndUpdate(reqId, {
          $addToSet: { linkedTasks: task._id }
        });

        await recalculateRequirementStatus(reqId);
      }
    }

    const populatedTask = await task.populate('assignedTo', 'name rut');

    await logAudit(req, project, 'CREATE_TASK', 'Task', task._id.toString(), `Title: ${title}`);

    return res.status(201).json(populatedTask);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTasksByProject = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const { projectId } = req.params;
    const role = req.projectRole || (req.user.role === 'Admin' ? 'Admin' : await getProjectRole(req.user._id, projectId));
    if (!role) {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    const tasks = await Task.find({ project: projectId })
      .populate('assignedTo', 'name rut')
      .sort({ createdAt: -1 });
    return res.json(tasks);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const getTaskById = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id).populate('assignedTo', 'name rut');
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const role = await getProjectRole(req.user._id, task.project.toString());
    if (!role && req.user.role !== 'Admin') {
      return res.status(403).json({ message: 'Access denied. You are not a member of this project.' });
    }

    return res.json(task);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const updateTask = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const role = await getProjectRole(req.user._id, task.project.toString());
    const isOwner = task.owner && task.owner.toString() === req.user._id.toString();
    const isAssigned = task.assignedTo && task.assignedTo.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';
    const isEditor = role === 'Editor';

    // Policy: Editor/Admin, Owner, or the Assigned User can update the task details/status.
    if (!isAdmin && !isEditor && !isOwner && !isAssigned) {
      return res.status(403).json({ message: 'No tienes permisos para actualizar esta tarea.' });
    }

    // Check if linkedRequirements is passed
    const { linkedRequirements, ...taskData } = req.body;

    Object.assign(task, taskData);
    await task.save();

    if (Array.isArray(linkedRequirements)) {
      // Find current TraceLinks for this task
      const currentLinks = await TraceLink.find({
        project: task.project,
        targetType: 'Task',
        targetId: task._id,
        sourceType: 'Requirement'
      });

      const currentReqIds = currentLinks.map(l => l.sourceId.toString());
      const targetReqIds = linkedRequirements.map(id => id.toString());

      // Find to delete
      const toDelete = currentLinks.filter(l => !targetReqIds.includes(l.sourceId.toString()));
      for (const link of toDelete) {
        const reqId = link.sourceId.toString();
        await TraceLink.findByIdAndDelete(link._id);
        await Requirement.findByIdAndUpdate(reqId, {
          $pull: { linkedTasks: task._id }
        });
        await recalculateRequirementStatus(reqId);
      }

      // Find to add
      const toAdd = targetReqIds.filter(id => !currentReqIds.includes(id));
      for (const reqId of toAdd) {
        await TraceLink.create({
          project: task.project,
          sourceType: 'Requirement',
          sourceId: reqId,
          targetType: 'Task',
          targetId: task._id,
          linkType: 'implements',
          createdBy: req.user._id
        });
        await Requirement.findByIdAndUpdate(reqId, {
          $addToSet: { linkedTasks: task._id }
        });
        await recalculateRequirementStatus(reqId);
      }
    } else {
      // Recalculate linked requirement states
      await recalculateRequirementsForTask(task._id.toString());
    }

    const populatedTask = await task.populate('assignedTo', 'name rut');

    await logAudit(
      req,
      task.project.toString(),
      'UPDATE_TASK',
      'Task',
      task._id.toString(),
      `Title: ${task.title}, Status: ${task.status}`
    );

    return res.json(populatedTask);
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};

export const deleteTask = async (req: ProjectAuthRequest, res: Response) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) {
      return res.status(404).json({ message: 'Task not found' });
    }

    const role = await getProjectRole(req.user._id, task.project.toString());
    const isOwner = task.owner && task.owner.toString() === req.user._id.toString();
    const isAdmin = role === 'Admin' || req.user.role === 'Admin';

    if (!isAdmin && !isOwner) {
      return res.status(403).json({ message: 'Solo el administrador del proyecto o el creador de la tarea pueden eliminarla.' });
    }

    // Find and delete trace links, updating requirements
    const links = await TraceLink.find({
      project: task.project,
      $or: [
        { sourceType: 'Task', sourceId: task._id },
        { targetType: 'Task', targetId: task._id }
      ]
    });

    for (const link of links) {
      const isSourceReq = link.sourceType === 'Requirement';
      const isTargetReq = link.targetType === 'Requirement';
      const reqId = isSourceReq ? link.sourceId : isTargetReq ? link.targetId : null;

      if (reqId) {
        await Requirement.findByIdAndUpdate(reqId, {
          $pull: { linkedTasks: task._id }
        });
      }
      await TraceLink.findByIdAndDelete(link._id);
    }

    await Task.findByIdAndDelete(req.params.id);

    // Recalculate status for all affected requirements
    for (const link of links) {
      const isSourceReq = link.sourceType === 'Requirement';
      const isTargetReq = link.targetType === 'Requirement';
      const reqId = isSourceReq ? link.sourceId : isTargetReq ? link.targetId : null;
      if (reqId) {
        await recalculateRequirementStatus(reqId.toString());
      }
    }

    await logAudit(
      req,
      task.project.toString(),
      'DELETE_TASK',
      'Task',
      task._id.toString(),
      `Title: ${task.title}`
    );

    return res.json({ message: 'Task deleted successfully' });
  } catch (error: any) {
    return res.status(500).json({ message: error.message });
  }
};
