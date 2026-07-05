import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { 
  User, Project, TeamMember, Requirement, Meeting, ADRDecision, 
  Diagram, Task, Document, EvaluationRubric, ProjectEvaluation, 
  ProjectProposal, DocumentReview, TraceLink
} from './models';

dotenv.config();

function calculateRUTDV(rut: number): string {
  let sum = 0;
  let multiplier = 2;
  let tempRut = rut;
  while (tempRut > 0) {
    sum += (tempRut % 10) * multiplier;
    tempRut = Math.floor(tempRut / 10);
    multiplier = multiplier === 7 ? 2 : multiplier + 1;
  }
  const remainder = sum % 11;
  const dvVal = 11 - remainder;
  if (dvVal === 11) return '0';
  if (dvVal === 10) return 'K';
  return dvVal.toString();
}

function generateRUT(baseNum: number): string {
  const dv = calculateRUTDV(baseNum);
  const rawStr = baseNum.toString();
  const part1 = rawStr.slice(0, 2);
  const part2 = rawStr.slice(2, 5);
  const part3 = rawStr.slice(5, 8);
  return `${part1}.${part2}.${part3}-${dv}`;
}

const seed = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/thesis-flow';
    await mongoose.connect(connStr);
    console.log('Seed: Connected to MongoDB.');

    // Clear all existing data to start fresh
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Requirement.deleteMany({});
    await Meeting.deleteMany({});
    await ADRDecision.deleteMany({});
    await Diagram.deleteMany({});
    await Task.deleteMany({});
    await Document.deleteMany({});
    await User.deleteMany({});
    await EvaluationRubric.deleteMany({});
    await ProjectEvaluation.deleteMany({});
    await ProjectProposal.deleteMany({});
    await DocumentReview.deleteMany({});

    try {
      await User.collection.dropIndexes();
      console.log('User collection indexes dropped.');
    } catch (err) {
      console.log('No user indexes to drop or index drop failed.');
    }

    console.log('Cleared all previous collections.');

    const passwordHash = await bcrypt.hash('password123', 10);

    // 1. Create Default Administrative / Global Users
    const defaultUsers = [
      {
        name: 'Sebastian Vasquez',
        rut: '21.661.083-0',
        passwordHash,
        role: 'Creador' as const,
        isActivated: true,
        email: 'sebastian.vasquez@alumnos.cl'
      },
      {
        name: 'Paolo Grassi',
        rut: '20.994.544-4',
        passwordHash,
        role: 'Editor' as const,
        isActivated: true,
        email: 'paolo.grassi@alumnos.cl'
      },
      {
        name: 'Benjamin Flores',
        rut: '21.450.830-3',
        passwordHash,
        role: 'Editor' as const,
        isActivated: true,
        email: 'benjamin.flores@alumnos.cl'
      },
      {
        name: 'Dra. María González (Docente Guía)',
        rut: '22.222.222-2',
        passwordHash,
        role: 'Docente' as const,
        isActivated: true,
        email: 'maria.gonzalez@docentes.cl'
      },
      {
        name: 'Dr. John Doe (Evaluador Académico)',
        rut: '33.333.333-3',
        passwordHash,
        role: 'Evaluador' as const,
        isActivated: true,
        email: 'john.doe@docentes.cl'
      },
      {
        name: 'Coordinador de Tesis e Innovación',
        rut: '11.111.111-1',
        passwordHash,
        role: 'Coordinador' as const,
        isActivated: true,
        email: 'coordinacion@universidad.cl'
      }
    ];

    const createdDefaultUsers: any[] = [];
    for (const u of defaultUsers) {
      const created = await User.create(u);
      createdDefaultUsers.push(created);
      console.log(`User created: ${u.name} (${u.rut})`);
    }

    // 2. Create Rubric
    const defaultRubric = await EvaluationRubric.create({
      name: 'Rúbrica de Hito de Tesis',
      description: 'Rúbrica de evaluación estándar para hitos de proyecto de tesis y entregas de capítulos.',
      isActive: true,
      criteria: [
        { name: 'Claridad del problema', description: 'Justificación del problema de investigación.', weight: 1, dimension: 'Problema' },
        { name: 'Coherencia de objetivos', description: 'Alineación de objetivos.', weight: 1, dimension: 'Objetivos' },
        { name: 'Calidad metodológica', description: 'Adecuación del marco metodológico.', weight: 1, dimension: 'Metodología' },
        { name: 'Fundamentación técnica', description: 'Solidez de decisiones de arquitectura.', weight: 1.5, dimension: 'Trazabilidad y Arquitectura' },
        { name: 'Calidad de redacción', description: 'Ortografía y gramática.', weight: 1, dimension: 'Redacción' },
        { name: 'Trazabilidad del proyecto', description: 'Mapeo de requerimientos.', weight: 1.5, dimension: 'Trazabilidad y Arquitectura' }
      ]
    });
    console.log(`Rubric template created: ${defaultRubric.name}`);

    // Let's create more teacher/advisor accounts so we can distribute them
    const teachersList = [
      createdDefaultUsers[3], // Dra. María González
      await User.create({
        name: 'Dr. Alejandro Silva (Docente)',
        rut: '24.444.444-4',
        passwordHash,
        role: 'Docente',
        isActivated: true,
        email: 'alejandro.silva@docentes.cl'
      }),
      await User.create({
        name: 'Dra. Patricia Reyes (Docente)',
        rut: '25.555.555-5',
        passwordHash,
        role: 'Docente',
        isActivated: true,
        email: 'patricia.reyes@docentes.cl'
      })
    ];

    // Names for generating random team members
    const firstNames = ['Carlos', 'Sofía', 'Felipe', 'Camila', 'Andrés', 'Javiera', 'Diego', 'Valentina', 'Matías', 'Francisca', 'Nicolás', 'Constanza', 'Ignacio', 'Daniela', 'Sebastián', 'Antonia', 'Lucas', 'Martina', 'Joaquín', 'Gabriela', 'Gonzalo', 'Catalina', 'Manuel', 'Isabella', 'Cristóbal', 'Fernanda', 'Vicente', 'Emilia', 'Tomás', 'Victoria'];
    const lastNames = ['Pérez', 'Muñoz', 'González', 'Rojas', 'Díaz', 'Silva', 'Contreras', 'Jara', 'Soto', 'Tapia', 'Vergara', 'Carrasco', 'Herrera', 'Martínez', 'Cifuentes', 'Jerez', 'Gómez', 'Castro', 'Valenzuela', 'López', 'Henríquez', 'Araya', 'Sepúlveda', 'Medina', 'Acevedo', 'Salazar', 'Bustos', 'Guerrero', 'Donoso', 'Fuentes'];

    const projectTemplates = [
      { name: 'Plataforma IoT de Smart Agro', problem: 'Alta ineficiencia y pérdida de agua en riego agrícola rural.' },
      { name: 'Telemedicina para Zonas Extremas', problem: 'Falta de médicos especialistas en comunas remotas del sur de Chile.' },
      { name: 'Optimización de Ruteo de Envíos', problem: 'Altos costos operativos en la última milla logística urbana.' },
      { name: 'Visión Artificial para Detección de Plagas', problem: 'Monitoreo tardío de plagas en viñedos que arruina cosechas completas.' },
      { name: 'Blockchain para Votación Universitaria', problem: 'Vulnerabilidades y desconfianza en elecciones estudiantiles tradicionales.' },
      { name: 'Monitoreo de Calidad del Aire con Sensores', problem: 'Pocos puntos de medición oficial del aire en comunas de alta polución.' },
      { name: 'Match Inteligente de Perfiles IT', problem: 'Sesgo y lentitud extrema en procesos de reclutamiento tecnológico.' },
      { name: 'Tutor de E-learning Adaptativo', problem: 'Falta de personalización escolar que provoca deserción académica temprana.' },
      { name: 'Sistema ERP Nube para Pymes Chilenas', problem: 'Falta de digitalización en inventarios de pequeños locales comerciales.' },
      { name: 'Smart Grid de Consumo Eléctrico', problem: 'Dificultad de los hogares para entender y optimizar su consumo de energía.' },
      { name: 'Turismo en Realidad Aumentada', problem: 'Baja visibilidad y digitalización de guías patrimoniales locales.' },
      { name: 'Detección Automatizada de Plagio Académico', problem: 'Dificultad para rastrear similitud semántica compleja en tesis de grado.' },
      { name: 'Gestor Financiero Automatizado', problem: 'Falta de hábitos y planificación de ahorro en jóvenes profesionales.' },
      { name: 'Triaje Virtual para Hospitales Públicos', problem: 'Largas filas de espera en urgencias por pacientes de baja complejidad.' },
      { name: 'Plataforma DevOps de Orquestación', problem: 'Complejidad en el despliegue automático de arquitecturas multinube.' }
    ];

    let rutCounter = 20100000;

    // Loop to create 15 projects
    for (let i = 0; i < 15; i++) {
      const template = projectTemplates[i];
      const project = await Project.create({
        name: template.name,
        description: `Proyecto de investigación y desarrollo enfocado en resolver el problema: ${template.problem}`,
        problem: template.problem,
        objectives: 'Objetivo General:\nDiseñar e implementar una solución integral viable.\n\nObjetivos Específicos:\n1. Analizar el estado del arte.\n2. Diseñar la arquitectura.\n3. Validar con usuarios reales.',
        restrictions: 'Presupuesto acotado, plazo de entrega final de 1 semestre académico, compatibilidad móvil obligatoria.',
        companyName: `Organización Colaboradora Nro ${i + 1}`,
        companyContact: `contacto-${i + 1}@organizacion.cl`,
        methodology: ['Scrum', 'Kanban', 'Waterfall', 'Agile', 'Espiral', 'Prototipos'][i % 6] as any
      });

      console.log(`\n📂 Project Created: ${project.name}`);

      // Create 2 unique students for this project
      const student1Name = `${firstNames[(i * 2) % firstNames.length]} ${lastNames[(i * 2) % lastNames.length]}`;
      const student2Name = `${firstNames[(i * 2 + 1) % firstNames.length]} ${lastNames[(i * 2 + 1) % lastNames.length]}`;

      const s1Rut = generateRUT(rutCounter++);
      const s2Rut = generateRUT(rutCounter++);

      const student1 = await User.create({
        name: student1Name,
        rut: s1Rut,
        passwordHash,
        role: 'Creador',
        isActivated: true,
        email: `${student1Name.toLowerCase().replace(/ /g, '.')}@alumnos.cl`
      });

      const student2 = await User.create({
        name: student2Name,
        rut: s2Rut,
        passwordHash,
        role: 'Editor',
        isActivated: true,
        email: `${student2Name.toLowerCase().replace(/ /g, '.')}@alumnos.cl`
      });

      console.log(`   - Student 1 (Admin/Creador): ${student1.name} (${student1.rut})`);
      console.log(`   - Student 2 (Editor): ${student2.name} (${student2.rut})`);

      // Assign one teacher from the list
      const assignedTeacher = teachersList[i % teachersList.length];

      // Create TeamMembers for Project
      await TeamMember.create({
        user: student1._id,
        project: project._id,
        role: 'Admin',
        operationalRole: 'Líder del Proyecto / Frontend Developer',
        workload: 50,
        canComment: true
      });

      await TeamMember.create({
        user: student2._id,
        project: project._id,
        role: 'Editor',
        operationalRole: 'Backend Developer / DevOps',
        workload: 50,
        canComment: true
      });

      await TeamMember.create({
        user: assignedTeacher._id,
        project: project._id,
        role: 'Viewer',
        operationalRole: 'Docente Guía / Supervisor',
        workload: 0,
        canComment: true
      });

      // 3. Seed Mock Items for each Project to make them look populated and alive!
      
      // Seed Requirements
      const req1 = await Requirement.create({
        project: project._id,
        owner: student1._id,
        code: 'RF-01',
        title: 'Registro e Inicio de Sesión',
        description: 'El sistema debe permitir el registro de usuarios con validación de credenciales y doble factor.',
        type: 'Functional',
        priority: 'High',
        status: 'Approved Baseline',
        source: 'Manual',
        workflowStatus: 'Done',
        approvalStatus: 'Approved',
        approvedBy: assignedTeacher._id,
        approvedAt: new Date()
      });

      const req2 = await Requirement.create({
        project: project._id,
        owner: student2._id,
        code: 'RNF-01',
        title: 'Tiempo de Respuesta de la API',
        description: 'La latencia de las consultas principales del backend debe ser inferior a 300ms bajo carga normal.',
        type: 'Non-Functional',
        priority: 'Medium',
        status: 'Under Review',
        source: 'Minuta Reunión 1',
        workflowStatus: 'In-Progress',
        approvalStatus: 'Pending'
      });

      // Seed Meeting
      const meeting = await Meeting.create({
        project: project._id,
        owner: student1._id,
        title: 'Reunión de Definición de Arquitectura',
        date: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        transcription: 'Discutimos la estructura de la base de datos y la integración de microservicios.',
        summary: 'Se acuerda utilizar una base de datos documental (MongoDB) para mayor flexibilidad semántica y modularidad en la gestión de registros.',
        agreements: ['Utilizar NestJS en el backend', 'Usar Tailwind CSS para el diseño visual', 'Implementar Auth0 para el inicio de sesión'],
        tasks: ['Crear esquema de base de datos', 'Configurar repositorio en GitHub'],
        risks: ['Posible retraso en la integración del proveedor de autenticación externa'],
        participants: [
          { name: student1.name, role: 'Líder del Proyecto', email: student1.email },
          { name: student2.name, role: 'Desarrollador Backend', email: student2.email },
          { name: assignedTeacher.name, role: 'Docente Guía', email: assignedTeacher.email }
        ],
        status: 'Published',
        advisorApprovalStatus: 'Conforme',
        advisorApprovalFeedback: 'Buen diseño inicial, recuerden documentar todas las decisiones de diseño arquitectónico en la bitácora ADR.'
      });

      // Seed ADR Decision
      const adr = await ADRDecision.create({
        project: project._id,
        owner: student2._id,
        code: 'ADR-01',
        title: 'Elección de Base de Datos Documental',
        status: 'Accepted',
        context: 'Necesitamos almacenar documentos de tesis semiestructurados con esquemas cambiantes según el tipo de metodología.',
        decision: 'Usaremos MongoDB debido a su alta flexibilidad documental y capacidad de indexación por texto.',
        consequences: 'Facilita la evolución del modelo de datos pero requiere un diseño cuidadoso de referencias para evitar desnormalización excesiva.',
        version: 1,
        submittedAt: new Date(Date.now() - 4 * 24 * 60 * 60 * 1000),
        reviewedAt: new Date(),
        acceptedAt: new Date(),
        requiredApprovals: 1,
        currentApprovals: 1,
        isCriticalDecision: true,
        advisorFeedback: 'Aprobado. La justificación técnica es sólida para el flujo cambiante de metodologías de tesis.'
      });

      // Seed Task
      const task = await Task.create({
        project: project._id,
        owner: student1._id,
        title: 'Implementar Componente de Carga de Archivos',
        description: 'Construir el formulario frontend para subir entregables físicos de hitos a S3.',
        assignedTo: student2._id,
        status: 'In-Progress',
        dueDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), // in 7 days
        sprint: 'Sprint 1'
      });

      // Link them together with a TraceLink
      await TraceLink.create({
        project: project._id,
        sourceType: 'Requirement',
        sourceId: req1._id,
        targetType: 'Task',
        targetId: task._id,
        linkType: 'implements',
        createdBy: student1._id
      });
    }

    console.log('\n==================================================');
    console.log('✅ DATABASE SEED COMPLETED SUCCESSFULLY!');
    console.log(`   - Default users, administrators, and coordinators remain.`);
    console.log(`   - Created 15 distinct projects with different methodologies.`);
    console.log(`   - Generated 30 unique student accounts and 2 new teacher accounts.`);
    console.log(`   - Setup 3-person team memberships per project (Student Admin, Student Editor, Docente).`);
    console.log(`   - Seeded mock requirements, meetings, ADRs, and tasks for each project.`);
    console.log('==================================================\n');

    mongoose.connection.close();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
