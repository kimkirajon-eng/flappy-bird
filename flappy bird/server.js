const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);

app.use(express.static('public'));

let players = {};
let pipes = [];
let frameCount = 0;
let gameSpeed = 3;
let highScore = { name: "Yok", score: 0 };

function createPipe() {
    const gap = 165;
    const height = Math.floor(Math.random() * 250) + 50;
    pipes.push({ x: 600, top: height, bottom: height + gap, scored: false });
}

io.on('connection', (socket) => {
    socket.on('join', (role) => {
        players[socket.id] = { 
            role, y: 300, velocity: 0, score: 0, alive: true, 
            color: role === 'Ceylanım' ? '#ff4d4d' : '#4d94ff' 
        };
        io.emit('highScoreUpdate', highScore);
    });

    socket.on('jump', () => {
        if (players[socket.id]) {
            if (!players[socket.id].alive) {
                players[socket.id].alive = true;
                players[socket.id].y = 300;
                players[socket.id].score = 0;
            }
            players[socket.id].velocity = -6;
        }
    });

    socket.on('sendEmoji', (emoji) => {
        io.emit('showEmoji', { emoji, from: players[socket.id]?.role });
    });

    // Ses Sinyalleşmesi
    socket.on('signal', (data) => {
        socket.broadcast.emit('signal', data);
    });

    socket.on('disconnect', () => { delete players[socket.id]; });
});

setInterval(() => {
    frameCount++;
    if (frameCount % 120 === 0) createPipe();
    pipes.forEach(p => p.x -= gameSpeed);
    pipes = pipes.filter(p => p.x > -60);

    for (let id in players) {
        let p = players[id];
        if (!p.alive) continue;
        p.velocity += 0.25;
        p.y += p.velocity;
        if (p.y > 600 || p.y < 0) p.alive = false;
        pipes.forEach(pipe => {
            if (100 + 25 > pipe.x && 100 < pipe.x + 50 && (p.y < pipe.top || p.y + 25 > pipe.bottom)) p.alive = false;
            if (pipe.x + 50 < 100 && !pipe.scored) {
                p.score++;
                pipe.scored = true;
                if (p.score > highScore.score) {
                    highScore = { name: p.role, score: p.score };
                    io.emit('highScoreUpdate', highScore);
                }
            }
        });
    }
    io.emit('gameState', { players, pipes, frameCount });
}, 1000 / 60);

http.listen(PORT, '0.0.0.0', () => console.log(`v17.5 Stok Yonetimi Aktif: http://localhost:${PORT}`));
