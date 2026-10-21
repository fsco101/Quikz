import mongoose from 'mongoose';
import { MongoMemoryServer } from 'mongodb-memory-server';

let mongod: MongoMemoryServer | null = null;

export const connectDB = async (): Promise<typeof mongoose> => {
  const uri = process.env.MONGODB_URI;

  if (uri && uri.trim() !== '') {
    try {
      console.log('Connecting to MongoDB Atlas at provided URI...');
      await mongoose.connect(uri);
      console.log('MongoDB Atlas Connected Successfully!');
      return mongoose;
    } catch (err: any) {
      console.warn(`MongoDB Atlas connection failed: ${err.message}. Falling back to In-Memory MongoDB...`);
    }
  }

  console.log('Starting resilient In-Memory MongoDB Server...');
  mongod = await MongoMemoryServer.create();
  const memoryUri = mongod.getUri();
  await mongoose.connect(memoryUri);
  console.log(`Connected to In-Memory MongoDB at: ${memoryUri}`);
  return mongoose;
};

export const disconnectDB = async (): Promise<void> => {
  await mongoose.disconnect();
  if (mongod) {
    await mongod.stop();
  }
};
