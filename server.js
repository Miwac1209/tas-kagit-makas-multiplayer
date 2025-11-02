
// Gerekli kütüphaneleri dahil etme
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

// Express uygulamasını ve HTTP sunucusunu başlatma
const app = express();
const server = http.createServer(app);

// Socket.IO'yu HTTPS/Render sunucusu için gerekli İZİN ayarlarıyla başlatma (KESİN ÇÖZÜM)
const io = socketio(server, {
    cors: {
        origin: "*", // Tüm adreslerden bağlantıya izin ver
        methods: ["GET", "POST"]
    }
});

// Sabitler
const PORT = process.env.PORT || 3000;
let players = {}; // Oyuncuları ve odaları tutmak için
let scores = { '1': 0, '2': 0 }; // Puanları tutmak için
const MAX_SCORE = 10;

// Express'e, istemci dosyalarını ana klasörde aramasını söyleme
app.use(express.static(__dirname));

// Sunucuya bağlanan her yeni istemci (tarayıcı) için çalışacak kısım
io.on('connection', (socket) => {
    console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

    // Oyuncu 1 veya Oyuncu 2 olarak atanması mantığı
    let playerNumber;
    let availableSlot = true;

    const activePlayers = Object.keys(players);
    if (activePlayers.length === 0) {
        playerNumber = 1;
        scores = { '1': 0, '2': 0 }; 
    } else if (activePlayers.length === 1) {
        playerNumber = 2;
    } else {
        availableSlot = false;
        socket.emit('error', 'Oda dolu, daha fazla oyuncu katılamaz.');
    }

    if (availableSlot) {
        players[socket.id] = { playerNumber: playerNumber, choice: null };
        socket.emit('playerNumber', playerNumber);
        io.emit('scoreUpdate', scores); 
        
        console.log(`Oyuncu ${playerNumber} olarak atandı.`);

        // Yeterli oyuncu (2 kişi) bağlandığında oyunu başlat
        if (Object.keys(players).length === 2) {
            io.emit('gameStart', 'İki oyuncu hazır! Seçiminizi yapın.');
            console.log("Oyun başladı.");
        }
    }

    // İstemciden gelen "seçimYapıldı" mesajını işleme
    socket.on('seçimYapıldı', (choice) => {
        // 1. Oyuncunun varlığını ve numarasını doğru bul
        const playerIds = Object.keys(players);
        const currentPlayerId = playerIds.find(id => id === socket.id);
        const player = players[currentPlayerId];
        
        if (!player) return;
        
        player.choice = choice; 
        
        console.log(`Oyuncu ${player.playerNumber} seçimi kaydedildi: ${choice}`);
        
        socket.emit('seçimOnayı', `Seçimin kaydedildi: ${choice}. Rakip bekleniyor...`);

        // 2. İki oyuncu da seçim yaptı mı kontrol etme
        if (playerIds.length === 2 && players[playerIds[0]].choice && players[playerIds[1]].choice) {
            
            // P1 ve P2'yi numara ile doğru bul
            const p1 = playerIds.map(id => players[id]).find(p => p.playerNumber === 1);
            const p2 = playerIds.map(id => players[id]).find(p => p.playerNumber === 2);
            
            if (p1 && p2) {
                const winnerResult = determineWinner(p1.choice, p2.choice); 
                
                let message;
                if (winnerResult === 'draw') {
                    message = 'Berabere! İkiniz de aynı şeyi seçtiniz. 🤝';
                } else if (winnerResult === 'win_p1') {
                    scores['1']++;
                    message = `Oyuncu 1 (Melek) kazandı! ${p1.choice} , ${p2.choice}'ı yener.`;
                } else { // win_p2
                    scores['2']++;
                    message = `Oyuncu 2 (Şeytan) kazandı! ${p2.choice} , ${p1.choice}'ı yener.`;
                }
                
                // Sonucu yayınla
                io.emit('sonuçAçıklandı', { 
                    results: winnerResult,
                    p1Choice: p1.choice,
                    p2Choice: p2.choice,
                    message: message,
                    scores: scores
                });

                // Final kontrolü
                if (scores['1'] >= MAX_SCORE || scores['2'] >= MAX_SCORE) {
                    const finalWinner = scores['1'] >= MAX_SCORE ? 1 : 2;
                    io.emit('gameOver', { winner: finalWinner });
                    scores = { '1': 0, '2': 0 }; 
                }

                // Bir sonraki tur için seçimleri sıfırla
                p1.choice = null;
                p2.choice = null;
                
            } else {
                io.emit('rakipAyrıldı', 'Rakip beklenmedik şekilde ayrıldı.');
            }
        }
    });

    // Oyuncu bağlantıyı kestiğinde
    socket.on('disconnect', () => {
        console.log(`Kullanıcı bağlantıyı kesti: ${socket.id}`);
        delete players[socket.id]; 
        io.emit('rakipAyrıldı', 'Rakip oyundan ayrıldı. Yeni oyuncu bekleniyor...');
        scores = { '1': 0, '2': 0 }; 
        io.emit('scoreUpdate', scores);
    });
});

/**
 * Kazananı belirleyen fonksiyon
 */
function determineWinner(choiceA, choiceB) {
    if (choiceA === choiceB) {
        return 'draw';
    }
    // A'nın B'yi yendiği durumlar
    if (
        (choiceA === 'Taş' && choiceB === 'Makas') ||
        (choiceA === 'Kağıt' && choiceB === 'Taş') ||
        (choiceA === 'Makas' && choiceB === 'Kağıt')
    ) {
        return 'win_p1'; // Oyuncu 1 (A) kazanır
    } else {
        return 'win_p2'; // Oyuncu 2 (B) kazanır
    }
}


// Sunucuyu belirtilen portta başlatma
server.listen(PORT, () => {
    console.log(`Taş-Kağıt-Makas sunucusu http://localhost:${PORT} adresinde çalışıyor...`);
    console.log("-----------------------------------------------------------------");
});