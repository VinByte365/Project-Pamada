const cloudinary = require("cloudinary").v2;
const dotenv = require('dotenv');
dotenv.config({ path: './config/.env' });
try {
cloudinary.config({
    cloud_name: process.env.CLOUDINARY_NAME,
    api_key: process.env.CLOUDINARY_API_KEY,
    api_secret: process.env.CLOUDINARY_SECRET,
    secure: true
});
} catch (error) {
  console.log("Cloudinary configuration error:", error.message);
}

module.exports = cloudinary;