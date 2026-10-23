import mongoose from 'mongoose';
import { env } from './env.js';

// Reject query filters on fields that are not in the schema (defence against NoSQL injection).
mongoose.set('strictQuery', true);

export async function connectDatabase(uri = env.MONGO_URI) {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 5000 });
  return mongoose.connection;
}

export async function disconnectDatabase() {
  await mongoose.disconnect();
}

export function databaseState() {
  // 0 = disconnected, 1 = connected, 2 = connecting, 3 = disconnecting
  return ['disconnected', 'connected', 'connecting', 'disconnecting'][mongoose.connection.readyState] ?? 'unknown';
}
