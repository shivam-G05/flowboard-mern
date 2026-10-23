// Loaded with `node --import` before any test file, so config/env.js sees these values.
process.env.NODE_ENV = 'test';
process.env.MONGO_URI = process.env.MONGO_URI_TEST || 'mongodb://127.0.0.1:27017/flowboard_test';
process.env.JWT_SECRET = 'test-secret-that-is-definitely-longer-than-32-chars';
process.env.BCRYPT_ROUNDS = '4';
process.env.CLIENT_URL = 'http://localhost:5173';
