const admin = require('firebase-admin');
const serviceAccount = require('../firebaseServiceAccountKey.json'); // Your Firebase service account file

admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

module.exports = admin;
