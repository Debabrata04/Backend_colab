require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp } = require('firebase/app');
const { getDatabase, ref, push, set, onValue } = require('firebase/database');

const app = express();
const PORT = process.env.PORT || 3001;

// CORS configuration
const allowedOrigins = [
  'http://localhost:3000',
  'https://your-netlify-site.netlify.app' // ADD YOUR NETLIFY URL HERE
];

app.use(cors({
  origin: function(origin, callback) {
    if (!origin || allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  }
}));
app.use(express.json());

// Initialize Firebase
const firebaseConfig = {
  apiKey: process.env.FIREBASE_API_KEY,
  authDomain: process.env.FIREBASE_AUTH_DOMAIN,
  databaseURL: process.env.FIREBASE_DATABASE_URL,
  projectId: process.env.FIREBASE_PROJECT_ID,
  storageBucket: process.env.FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.FIREBASE_APP_ID,
  measurementId: process.env.FIREBASE_MEASUREMENT_ID
};

const firebaseApp = initializeApp(firebaseConfig);
const db = getDatabase(firebaseApp);

// Generate random secret
function generateSecret() {
  const array = new Uint8Array(16);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
}

// API endpoint to create a room
app.post('/api/rooms', (req, res) => {
  const roomRef = ref(db, 'rooms');
  const newRoomRef = push(roomRef);
  
  const secret = generateSecret();
  const roomData = {
    secret,
    createdAt: Date.now(),
    users: {},
    drawings: {}
  };
  
  set(newRoomRef, roomData)
    .then(() => {
      res.json({
        roomId: newRoomRef.key,
        secret
      });
    })
    .catch(error => {
      console.error("Error creating room:", error);
      res.status(500).json({ error: "Room creation failed" });
    });
});

// API endpoint to validate a room
app.get('/api/rooms/:roomId', (req, res) => {
  const { roomId } = req.params;
  const { secret } = req.query;
  
  const roomRef = ref(db, `rooms/${roomId}`);
  
  onValue(roomRef, (snapshot) => {
    const roomData = snapshot.val();
    if (roomData && roomData.secret === secret) {
      res.json({ valid: true });
    } else {
      res.json({ valid: false });
    }
  }, { onlyOnce: true });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
