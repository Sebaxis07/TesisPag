"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const mongoose_1 = __importDefault(require("mongoose"));
const bcryptjs_1 = __importDefault(require("bcryptjs"));
const dotenv_1 = __importDefault(require("dotenv"));
const models_1 = require("./models");
dotenv_1.default.config();
const seed = async () => {
    try {
        const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/thesis-flow';
        await mongoose_1.default.connect(connStr);
        console.log('Seed: Connected to MongoDB.');
        // Clear all existing data to start fresh
        await models_1.Project.deleteMany({});
        await models_1.TeamMember.deleteMany({});
        await models_1.Requirement.deleteMany({});
        await models_1.Meeting.deleteMany({});
        await models_1.ADRDecision.deleteMany({});
        await models_1.Diagram.deleteMany({});
        await models_1.Task.deleteMany({});
        await models_1.Document.deleteMany({});
        await models_1.User.deleteMany({});
        await models_1.EvaluationRubric.deleteMany({});
        await models_1.ProjectEvaluation.deleteMany({});
        await models_1.ProjectProposal.deleteMany({});
        await models_1.DocumentReview.deleteMany({});
        try {
            await models_1.User.collection.dropIndexes();
            console.log('User collection indexes dropped.');
        }
        catch (err) {
            console.log('No user indexes to drop or index drop failed.');
        }
        console.log('Cleared all previous data, projects, tasks, rubrics, and users.');
        const passwordHash = await bcryptjs_1.default.hash('password123', 10);
        const defaultUsers = [
            {
                name: 'Sebastian Vasquez',
                rut: '21.661.083-0',
                passwordHash,
                role: 'Creador',
                isActivated: false
            },
            {
                name: 'Paolo Grassi',
                rut: '20.994.544-4',
                passwordHash,
                role: 'Editor',
                isActivated: false
            },
            {
                name: 'Benjamin Flores',
                rut: '21.450.830-3',
                passwordHash,
                role: 'Editor',
                isActivated: false
            },
            {
                name: 'Dra. María González (Docente Guía)',
                rut: '22.222.222-2',
                passwordHash,
                role: 'Docente',
                isActivated: false
            },
            {
                name: 'Dr. John Doe (Evaluador Académico)',
                rut: '33.333.333-3',
                passwordHash,
                role: 'Evaluador',
                isActivated: false
            },
            {
                name: 'Coordinador de Tesis e Innovación',
                rut: '11.111.111-1',
                passwordHash,
                role: 'Coordinador',
                isActivated: false
            }
        ];
        for (const u of defaultUsers) {
            await models_1.User.create(u);
            console.log(`User created: ${u.name} (${u.rut})`);
        }
        // Seed default rubric template
        const defaultRubric = await models_1.EvaluationRubric.create({
            name: 'Rúbrica de Hito de Tesis',
            description: 'Rúbrica de evaluación estándar para hitos de proyecto de tesis y entregas de capítulos.',
            isActive: true,
            criteria: [
                { name: 'Claridad del problema', description: 'Justificación del problema de investigación u oportunidad tecnológica.', weight: 1, dimension: 'Problema' },
                { name: 'Coherencia de objetivos', description: 'Alineación de objetivos específicos con el objetivo general.', weight: 1, dimension: 'Objetivos' },
                { name: 'Calidad metodológica', description: 'Adecuación del marco de trabajo metodológico adoptado.', weight: 1, dimension: 'Metodología' },
                { name: 'Fundamentación técnica', description: 'Solidez de las decisiones de diseño y tecnologías seleccionadas.', weight: 1.5, dimension: 'Trazabilidad y Arquitectura' },
                { name: 'Calidad de redacción', description: 'Ortografía, gramática, estructura del documento y estilo formal.', weight: 1, dimension: 'Redacción' },
                { name: 'Trazabilidad del proyecto', description: 'Nivel de mapeo entre requerimientos, tareas, ADRs y entregables.', weight: 1.5, dimension: 'Trazabilidad y Arquitectura' },
                { name: 'Viabilidad de la solución', description: 'Factibilidad técnica y operacional del desarrollo propuesto.', weight: 1, dimension: 'Solución' }
            ]
        });
        console.log(`Rubric template created: ${defaultRubric.name}`);
        console.log('Seed completed successfully! Only user accounts and rubric templates remain.');
        mongoose_1.default.connection.close();
    }
    catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};
seed();
