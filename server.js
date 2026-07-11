const express = require('express');
const app = express();
const http = require('http').createServer(app);
const io = require('socket.io')(http, {
    cors: { origin: "*" } // Allows your Netlify site to connect to this server
});

const players = {};

io.on('connection', (socket) => {
    console.log('A player connected:', socket.id);

    // Create a new player
    players[socket.id] = { x: 0, y: 0, z: 0, rotation: 0 };

    // Send the new player all existing players
    socket.emit('currentPlayers', players);

    // Tell all OTHER players that a new player joined
    socket.broadcast.emit('newPlayer', { id: socket.id, player: players[socket.id] });

    // When this player moves, update their position and tell everyone else
    socket.on('playerMovement', (movementData) => {
        players[socket.id] = movementData;
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