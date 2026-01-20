const mongoose = require("mongoose");

const connectToDatabase = () => {
  mongoose
    .connect(process.env.MONGO_URI)
    .then((con) => console.log(`connected to database ${con.connection.host}`))
    .catch((error) => console.log(error.message));
};

module.exports = connectToDatabase;