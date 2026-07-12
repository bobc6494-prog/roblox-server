const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');

const app = express();
const http = require('http').createServer(app);

// Enable CORS
app.use(cors({ origin: "*" }));

// Ensure the 'uploads' directory exists
const uploadDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadDir)) {
    fs.mkdirSync(uploadDir);
}

// Configure Multer to save uploaded files
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        cb(null, uploadDir);
    },
    filename: function (req, file, cb) {
        cb(null, file.originalname || 'map.crbx');
    }
});
const upload = multer({ storage: storage });

// --- HTTP ROUTES ---

// Upload a map
app.post('/upload', upload.single('file'), (req, res) => {
    if (!req.file) return res.status(400).send('No file uploaded.');
    console.log(`Map uploaded: ${req.file.filename}`);
    res.status(200).json({ message: 'File uploaded successfully', filename: req.file.filename });
});

// Get a specific map file
app.get('/map/:filename', (req, res) => {
    const filePath = path.join(uploadDir, req.params.filename);
    if (fs.existsSync(filePath)) {
        res.sendFile(filePath);
    } else {
        res.status(404).send('Map not found.');
    }
});

// Get a list of all uploaded maps
app.get('/maps', (req, res) => {
    fs.readdir(uploadDir, (err, files) => {
        if (err) return res.status(500).json([]);
        // Return only .crbx files
        const crbxFiles = files.filter(f => f.endsWith('.crbx'));
        res.json(crbxFiles);
    });
});

// --- MULTIPLAYER SOCKET.IO ---

const io = require('socket.io')(http, {
    cors: { origin: "*" }
});

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Create a new player with default values
    players[socket.id] = { x: 0, y: 5, z: 0, rotY: 0, name: "Guest" };

    // Send the new player all existing players
    socket.emit('currentPlayers', players);

    // Tell all OTHER players that a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // When this player moves
    socket.on('playerMovement', (movementData) => {
        players[socket.id] = movementData;
        // Broadcast the movement to everyone else
        socket.broadcast.emit('playerMoved', { id: socket.id, player: movementData });
    });

    // When a player leaves
    socket.on('disconnect', () => {
        console.log('Player disconnected:', socket.id);
        delete players[socket.id];
        io.emit('playerDisconnected', socket.id);
    });
});

const PORT = process.env.PORT || 3000;
http.listen(PORT, () => {
    console.log(`Server running on port ${PORT}`);
});