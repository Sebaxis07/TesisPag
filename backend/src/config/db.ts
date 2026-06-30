import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const connStr = process.env.MONGO_URI || 'mongodb://localhost:27017/thesis-flow';
    await mongoose.connect(connStr);
    console.log(`MongoDB Connected successfully to: ${connStr}`);
  } catch (error) {
    console.error('MongoDB connection error:', error);
    process.exit(1);
  }
};
