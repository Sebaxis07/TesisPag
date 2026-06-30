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
        // Clear all existing data to start fresh (except users, which we recreate/overwrite)
        await models_1.Project.deleteMany({});
        await models_1.TeamMember.deleteMany({});
        await models_1.Requirement.deleteMany({});
        await models_1.Meeting.deleteMany({});
        await models_1.ADRDecision.deleteMany({});
        await models_1.Diagram.deleteMany({});
        await models_1.Task.deleteMany({});
        await models_1.Document.deleteMany({});
        await models_1.User.deleteMany({});
        try {
            await models_1.User.collection.dropIndexes();
            console.log('User collection indexes dropped.');
        }
        catch (err) {
            console.log('No user indexes to drop or index drop failed.');
        }
        console.log('Cleared all previous data, projects, tasks, and users.');
        const passwordHash = await bcryptjs_1.default.hash('password123', 10);
        const defaultUsers = [
            {
                name: 'Sebastian Vasquez',
                rut: '21.661.083-0',
                passwordHash,
                role: 'Creador'
            },
            {
                name: 'Paolo Grassi',
                rut: '20.994.544-4',
                passwordHash,
                role: 'Editor'
            },
            {
                name: 'Benjamin Flores',
                rut: '21.450.830-3',
                passwordHash,
                role: 'Editor'
            }
        ];
        for (const u of defaultUsers) {
            await models_1.User.create(u);
            console.log(`User created: ${u.name} (${u.rut})`);
        }
        console.log('Seed completed successfully! Only user accounts remain.');
        mongoose_1.default.connection.close();
    }
    catch (err) {
        console.error('Seed failed:', err);
        process.exit(1);
    }
};
seed();
