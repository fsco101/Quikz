import mongoose from 'mongoose';
import net from 'node:net';
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
  // Ask the OS for an available port to avoid Windows excluded port ranges.
  const port = await new Promise<number>((resolve, reject) => {
    const probe = net.createServer();
    probe.once('error', reject);
    probe.listen(0, '127.0.0.1', () => {
      const port = (probe.address() as net.AddressInfo).port;
      probe.close(err => err ? reject(err) : resolve(port));
    });
  });
  mongod = await MongoMemoryServer.create({ instance: { port, ip: '127.0.0.1' } });
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
