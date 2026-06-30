import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';
import dotenv from 'dotenv';
import { User, Project, TeamMember, Requirement, Meeting, ADRDecision, Diagram, Task, Document } from './models';

dotenv.config();

const seed = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/thesis-flow';
    await mongoose.connect(connStr);
    console.log('Seed: Connected to MongoDB.');

    // Clear all existing data to start fresh (except users, which we recreate/overwrite)
    await Project.deleteMany({});
    await TeamMember.deleteMany({});
    await Requirement.deleteMany({});
    await Meeting.deleteMany({});
    await ADRDecision.deleteMany({});
    await Diagram.deleteMany({});
    await Task.deleteMany({});
    await Document.deleteMany({});
    await User.deleteMany({});

    try {
      await User.collection.dropIndexes();
      console.log('User collection indexes dropped.');
    } catch (err) {
      console.log('No user indexes to drop or index drop failed.');
    }

    console.log('Cleared all previous data, projects, tasks, and users.');

    const passwordHash = await bcrypt.hash('password123', 10);

    const defaultUsers = [
      {
        name: 'Sebastian Vasquez',
        rut: '21.661.083-0',
        passwordHash,
        role: 'Creador' as const
      },
      {
        name: 'Paolo Grassi',
        rut: '20.994.544-4',
        passwordHash,
        role: 'Editor' as const
      },
      {
        name: 'Benjamin Flores',
        rut: '21.450.830-3',
        passwordHash,
        role: 'Editor' as const
      }
    ];

    for (const u of defaultUsers) {
      await User.create(u);
      console.log(`User created: ${u.name} (${u.rut})`);
    }

    console.log('Seed completed successfully! Only user accounts remain.');
    mongoose.connection.close();
  } catch (err) {
    console.error('Seed failed:', err);
    process.exit(1);
  }
};

seed();
