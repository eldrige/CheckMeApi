const firebase = require('firebase-admin');

const serviceAccount = require('../check-me-6c75d-firebase-adminsdk-cagm2-99a11945d7.json');

module.exports = () => {
  firebase.initializeApp({
    credential: firebase.credential.cert(serviceAccount),
  });
};
