// 1. Import dependencies FIRST
require('dotenv').config();
const express = require('express');
const cors = require('cors');
const { initializeApp: initializeFirebase } = require('firebase/app');
const { getDatabase, ref, push, set, onValue } = require('firebase/database');
const crypto = require('crypto');

// 2. Initialize Express app
const app = express();
const PORT = process.env.PORT || 8000;

// CORS configuration
const allowedOrigins = [
  'https://realtime-colab-whiteboard.netlify.app',
  'https://backendcolab-production-f82d.up.railway.app',
  'http://localhost:3000'
];

app.use(cors({
  origin: allowedOrigins,
  methods: ['GET', 'POST', 'OPTIONS'],
  allowedHeaders: ['Content-Type'],
  credentials: true
}));

// Handle preflight requests
app.options('*', cors());

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

let db; // Database instance

try {
  const firebaseApp = initializeFirebase(firebaseConfig);
  db = getDatabase(firebaseApp);
  console.log("Firebase initialized successfully!");
} catch (err) {
  console.error("Firebase initialization error:", err);
  process.exit(1);
}

// Generate random secret using Node.js crypto
function generateSecret() {
  return crypto.randomBytes(16).toString('hex');
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
      console.log("Room created successfully:", newRoomRef.key);
      res.json({
        roomId: newRoomRef.key,
        secret
      });
    })
    .catch(error => {
      console.error("Firebase Error:", error);
      res.status(500).json({ 
        error: "Room creation failed",
        details: error.message 
      });
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

// Start the server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
