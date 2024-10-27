const users = require('./data/users.js');
const articles = require('./data/articles.js');
const specialists = require('./data/specialists.js');
const hospitals = require('./data/hospitals.js');
const User = require('./models/User');
const Hospital = require('./models/Hospital');
const Specialist = require('./models/Specialist');
const Article = require('./models/Article');
const connectDB = require('./config/db.js');

connectDB();

const importData = async () => {
  try {
    // remove all the data from the database
    // await User.deleteMany();

    const createdUsers = await User.insertMany(users);
    // const createdArticles = await Article.insertMany(articles);
    // const createdSpecialists = await Specialist.insertMany(specialists);
    // const createdHospitals = await Hospital.insertMany(hospitals);

    // const adminUser = createdUsers[0]._id;
    // const sampleProducts = products.map((product) => {
    //   // for each product add the admin user
    //   return { ...product, user: adminUser };
    // });
    // await Product.insertMany(sampleProducts);
    console.log('Data Imported');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

const destroyData = async () => {
  try {
    // remove all the data from the database
    // await User.deleteMany();
    await Specialist.deleteMany();
    await Article.deleteMany();
    await Hospital.deleteMany();

    console.log('Data destroyed!');
    process.exit();
  } catch (error) {
    console.error(`${error}`);
    process.exit(1);
  }
};

if (process.argv[2] === '-d') {
  destroyData();
} else {
  importData();
}
