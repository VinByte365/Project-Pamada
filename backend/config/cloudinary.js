const cloudinary = require("cloudinary").v2;

try {
cloudinary.config({
    cloudinary_url: process.env.CLOUDINARY_URL
});
} catch (error) {
  console.log("Cloudinary configuration error:", error.message);
}

module.exports = cloudinary;