const dotenv = require('dotenv');
const mongoose = require('mongoose');
const connectToDatabase = require('../config/database');
const { seedPresetRecommendations } = require('../seeders/presetRecommendationSeeder');

dotenv.config({ path: './config/.env' });

async function run() {
  try {
    connectToDatabase();
    await mongoose.connection.asPromise();
    await seedPresetRecommendations();
    console.log('Preset recommendation seed completed.');
    process.exit(0);
  } catch (error) {
    console.error('Preset recommendation seed failed:', error);
    process.exit(1);
  }
}

run();
