const express = require('express');
const connectToDatabase = require('./config/database');
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });

const app = express();
const PORT = process.env.PORT || 8000;

connectToDatabase();
app.use(express.json());

app.listen(PORT, () => {
  console.log(`Server is running on port ${PORT}`);
});             