const mongoose = require('mongoose');
const config = require('./config');

const connectDB = () => {
  mongoose
    .connect('mongodb+srv://eldrige:baguvix75009@cluster0.juzpn.mongodb.net/check-me?retryWrites=true&w=majority', {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    })
    .then((con) => console.log(`Database connection succesful`))
    .catch((err) =>
      console.log('Something went wrong while connecting to the database', err)
    );
};

module.exports = connectDB;
