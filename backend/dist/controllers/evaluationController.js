"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.updateProjectEvaluation = exports.getEvaluationById = exports.getEvaluationsByProject = exports.createProjectEvaluation = exports.getEvaluationsByEvaluator = exports.getRubricById = exports.getRubrics = exports.createRubric = void 0;
const models_1 = require("../models");
// Create a new rubric (Coordinator only)
const createRubric = async (req, res) => {
    try {
        const { name, description, criteria, evaluationType } = req.body;
        if (!name || !criteria || criteria.length === 0) {
            return res.status(400).json({ message: 'Nombre de la rúbrica y criterios son requeridos' });
        }
        const rubric = await models_1.EvaluationRubric.create({
            name,
            description,
            evaluationType: evaluationType || 'grupal',
            criteria,
            isActive: true
        });
        return res.status(201).json(rubric);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al crear la rúbrica', error: error.message });
    }
};
exports.createRubric = createRubric;
// Get all active rubrics
const getRubrics = async (req, res) => {
    try {
        const rubrics = await models_1.EvaluationRubric.find({ isActive: true });
        return res.json(rubrics);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener rúbricas', error: error.message });
    }
};
exports.getRubrics = getRubrics;
// Get rubric by ID
const getRubricById = async (req, res) => {
    try {
        const rubric = await models_1.EvaluationRubric.findById(req.params.id);
        if (!rubric) {
            return res.status(404).json({ message: 'Rúbrica no encontrada' });
        }
        return res.json(rubric);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener la rúbrica', error: error.message });
    }
};
exports.getRubricById = getRubricById;
// Get evaluations by the current evaluator (for Docentes/Evaluadores)
const getEvaluationsByEvaluator = async (req, res) => {
    try {
        const evaluations = await models_1.ProjectEvaluation.find({ evaluator: req.user._id })
            .populate('evaluator', 'name')
            .populate('rubric', 'name criteria')
            .populate('project', 'name')
            .sort({ createdAt: -1 });
        return res.json(evaluations);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener evaluaciones del evaluador', error: error.message });
    }
};
exports.getEvaluationsByEvaluator = getEvaluationsByEvaluator;
// Create or update a project evaluation (Grades mapped 1 to 5)
const createProjectEvaluation = async (req, res) => {
    try {
        const projectVal = req.body.project || req.params.projectId || req.body.projectId;
        const rubricVal = req.body.rubric || req.body.rubricId;
        let gradesVal = req.body.grades;
        // Support frontend legacy 'scores' array format
        if (!gradesVal && req.body.scores) {
            gradesVal = req.body.scores.map((s) => ({
                criterionId: s.criterionId || s.criterionName,
                criterionName: s.criterionName,
                score: s.score,
                comment: s.feedback
            }));
        }
        const { generalFeedback, status, evaluationType, targetType, studentTarget, studentTargetName, evidenceLinks } = req.body;
        const generalFeedbackVal = generalFeedback || req.body.generalComments || '';
        if (!projectVal || !rubricVal || !gradesVal || gradesVal.length === 0) {
            return res.status(400).json({ message: 'Proyecto, rúbrica y calificaciones son requeridos' });
        }
        const rubricDoc = await models_1.EvaluationRubric.findById(rubricVal);
        if (!rubricDoc) {
            return res.status(404).json({ message: 'Rúbrica no encontrada' });
        }
        // Calculate total score based on weights
        let totalWeightedScore = 0;
        let totalWeight = 0;
        for (const g of gradesVal) {
            // Find matching criterion in rubric template
            const criterion = rubricDoc.criteria.find(c => c._id?.toString() === g.criterionId || c.name === g.criterionName);
            const weight = criterion ? criterion.weight : 1;
            totalWeightedScore += g.score * weight;
            totalWeight += weight;
        }
        const computedScore = totalWeight > 0 ? Number((totalWeightedScore / totalWeight).toFixed(2)) : 0;
        const evaluation = await models_1.ProjectEvaluation.create({
            project: projectVal,
            rubric: rubricVal,
            rubricName: rubricDoc.name,
            evaluator: req.user._id,
            evaluatorName: req.user.name,
            evaluationType: evaluationType || rubricDoc.evaluationType || 'grupal',
            targetType: targetType || 'Team',
            studentTarget: studentTarget || undefined,
            studentTargetName: studentTargetName || '',
            grades: gradesVal,
            generalFeedback: generalFeedbackVal,
            evidenceLinks: evidenceLinks || [],
            status: status || 'Draft',
            totalScore: computedScore
        });
        return res.status(201).json(evaluation);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al crear la evaluación', error: error.message });
    }
};
exports.createProjectEvaluation = createProjectEvaluation;
// Get evaluations for a project (accessible by students, advisors, and carrera)
const getEvaluationsByProject = async (req, res) => {
    try {
        const query = { project: req.params.projectId };
        // Students should only see "Published" evaluations
        if (req.user.role !== 'Admin' && req.user.role !== 'Docente' && req.user.role !== 'Coordinador') {
            query.status = 'Published';
        }
        const evaluations = await models_1.ProjectEvaluation.find(query)
            .populate('evaluator', 'name')
            .populate('rubric', 'name criteria')
            .sort({ createdAt: -1 });
        return res.json(evaluations);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener evaluaciones del proyecto', error: error.message });
    }
};
exports.getEvaluationsByProject = getEvaluationsByProject;
// Get evaluation by ID
const getEvaluationById = async (req, res) => {
    try {
        const evaluation = await models_1.ProjectEvaluation.findById(req.params.id)
            .populate('evaluator', 'name')
            .populate('rubric', 'name criteria')
            .populate('project', 'name');
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluación no encontrada' });
        }
        return res.json(evaluation);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al obtener la evaluación', error: error.message });
    }
};
exports.getEvaluationById = getEvaluationById;
// Update an evaluation (only if draft)
const updateProjectEvaluation = async (req, res) => {
    try {
        const { grades, generalFeedback, status, targetType, studentTarget, studentTargetName, evidenceLinks } = req.body;
        const evaluation = await models_1.ProjectEvaluation.findById(req.params.id);
        if (!evaluation) {
            return res.status(404).json({ message: 'Evaluación no encontrada' });
        }
        if (evaluation.evaluator.toString() !== req.user._id.toString() && req.user.role !== 'Admin') {
            return res.status(403).json({ message: 'No tienes permiso para editar esta evaluación' });
        }
        if (evaluation.status === 'Published' && req.user.role !== 'Admin' && req.user.role !== 'Coordinador') {
            return res.status(400).json({ message: 'No se puede editar una evaluación ya publicada' });
        }
        if (grades && grades.length > 0) {
            evaluation.grades = grades;
            const rubricDoc = await models_1.EvaluationRubric.findById(evaluation.rubric);
            if (rubricDoc) {
                let totalWeightedScore = 0;
                let totalWeight = 0;
                for (const g of grades) {
                    const criterion = rubricDoc.criteria.find(c => c._id?.toString() === g.criterionId || c.name === g.criterionName);
                    const weight = criterion ? criterion.weight : 1;
                    totalWeightedScore += g.score * weight;
                    totalWeight += weight;
                }
                evaluation.totalScore = totalWeight > 0 ? Number((totalWeightedScore / totalWeight).toFixed(2)) : 0;
            }
        }
        evaluation.generalFeedback = generalFeedback !== undefined ? generalFeedback : evaluation.generalFeedback;
        evaluation.status = status || evaluation.status;
        if (targetType !== undefined)
            evaluation.targetType = targetType;
        if (studentTarget !== undefined)
            evaluation.studentTarget = studentTarget;
        if (studentTargetName !== undefined)
            evaluation.studentTargetName = studentTargetName;
        if (evidenceLinks !== undefined)
            evaluation.evidenceLinks = evidenceLinks;
        await evaluation.save();
        return res.json(evaluation);
    }
    catch (error) {
        console.error(error);
        return res.status(500).json({ message: 'Error al actualizar la evaluación', error: error.message });
    }
};
exports.updateProjectEvaluation = updateProjectEvaluation;
