import { Requirement, TraceLink } from '../models';

/**
 * Recalcula el estado operacional (workflowStatus) de un requerimiento.
 * - Si todas las tareas vinculadas están 'Done' y tiene pruebas aprobadas ('Passed') -> 'Completed'
 * - Si todas las tareas vinculadas están 'Done' pero no tiene pruebas o algunas no han pasado -> 'Implemented'
 * - Si hay al menos una tarea en progreso, en revisión o realizada -> 'In-Progress'
 * - Si todas las tareas están pendientes o no hay tareas -> 'Backlog' (o se preserva el actual si no hay tareas)
 */
export async function recalculateRequirementStatus(requirementId: string): Promise<void> {
  try {
    const requirement = await Requirement.findById(requirementId).populate('linkedTasks');
    if (!requirement) return;

    // Si no hay tareas vinculadas, no forzamos cambios automáticos
    if (!requirement.linkedTasks || requirement.linkedTasks.length === 0) {
      return;
    }

    const tasks = requirement.linkedTasks as any[];
    const allDone = tasks.every(t => t.status === 'Done');
    const someProgress = tasks.some(t => t.status === 'In-Progress' || t.status === 'Review' || t.status === 'Done');

    let newStatus = requirement.workflowStatus || 'Backlog';

    if (allDone) {
      const hasTests = requirement.linkedTests && requirement.linkedTests.length > 0;
      if (hasTests) {
        const allTestsPassed = requirement.linkedTests.every(t => t.status === 'Passed');
        newStatus = allTestsPassed ? 'Completed' : 'Implemented';
      } else {
        newStatus = 'Implemented';
      }
    } else if (someProgress) {
      newStatus = 'In-Progress';
    } else {
      newStatus = 'Backlog';
    }

    if (requirement.workflowStatus !== newStatus) {
      requirement.workflowStatus = newStatus;
      await requirement.save();
    }
  } catch (err) {
    console.error('Error recalculating requirement status:', err);
  }
}

/**
 * Busca todos los requerimientos vinculados a una tarea y recalcula sus estados.
 */
export async function recalculateRequirementsForTask(taskId: string): Promise<void> {
  try {
    const links = await TraceLink.find({
      $or: [
        { sourceType: 'Requirement', targetType: 'Task', targetId: taskId },
        { sourceType: 'Task', targetType: 'Requirement', sourceId: taskId }
      ]
    });

    const reqIds = Array.from(new Set(
      links.map(l => l.sourceType === 'Requirement' ? l.sourceId.toString() : l.targetId.toString())
    ));

    for (const reqId of reqIds) {
      await recalculateRequirementStatus(reqId);
    }
  } catch (err) {
    console.error('Error recalculating requirements for task:', err);
  }
}
