// server.js kodunun tamamı
// Gerekli kütüphaneleri dahil etme
const express = require('express');
const http = require('http');
const socketio = require('socket.io');

// Express uygulamasını ve HTTP sunucusunu başlatma
const app = express();
const server = http.createServer(app);
const io = socketio(server);

// Sabitler
const PORT = process.env.PORT || 3000;
let players = {}; // Oyuncuları ve odaları tutmak için boş bir nesne
let scores = {}; // Puanları tutmak için
const MAX_SCORE = 10;

// Express'e, istemci dosyalarını ana klasörde aramasını söyleme
app.use(express.static(__dirname));

// Sunucuya bağlanan her yeni istemci (tarayıcı) için çalışacak kısım
io.on('connection', (socket) => {
    console.log(`Yeni bir kullanıcı bağlandı: ${socket.id}`);

    // Oyuncu 1 veya Oyuncu 2 olarak atanması
    let playerNumber;
    let availableSlot = true;

    // Oyuncu listesini temizleyerek 2'den fazla oyuncu bağlantısını önleme
    const activePlayers = Object.keys(players);
    if (activePlayers.length === 0) {
        playerNumber = 1;
        scores = { '1': 0, '2': 0 }; // Yeni oyun, puanları sıfırla
    } else if (activePlayers.length === 1) {
        playerNumber = 2;
    } else {
        availableSlot = false;
        socket.emit('error', 'Oda dolu, daha fazla oyuncu katılamaz.');
    }

    if (availableSlot) {
        players[socket.id] = { playerNumber: playerNumber, choice: null };
        socket.emit('playerNumber', playerNumber);
        io.emit('scoreUpdate', scores); // Yeni oyuncuya mevcut puanları gönder
        
        console.log(`Oyuncu ${playerNumber} olarak atandı.`);

        // Yeterli oyuncu (2 kişi) bağlandığında oyunu başlat
        if (Object.keys(players).length === 2) {
            io.emit('gameStart', 'İki oyuncu hazır! Seçiminizi yapın.');
            console.log("Oyun başladı.");
        }
    }

    // İstemciden gelen "seçimYapıldı" mesajını işleme
    socket.on('seçimYapıldı', (choice) => {
        const player = players[socket.id];
        if (!player) return;

        player.choice = choice; // Seçimi kaydet
        console.log(`Oyuncu ${player.playerNumber} seçimi: ${choice}`);
        
        socket.emit('seçimOnayı', `Seçimin kaydedildi: ${choice}. Rakip bekleniyor...`);

        // İki oyuncu da seçim yaptı mı kontrol etme
        const playerIds = Object.keys(players);
        if (playerIds.length === 2 && players[playerIds[0]].choice && players[playerIds[1]].choice) {
            
            const p1 = players[playerIds.find(id => players[id].playerNumber === 1)];
            const p2 = players[playerIds.find(id => players[id].playerNumber === 2)];

            const winnerResult = determineWinner(p1.choice, p2.choice); // Kazananı belirle
            
            let message;
            if (winnerResult === 'draw') {
                message = 'Berabere! İkiniz de aynı şeyi seçtiniz. 🤝';
            } else if (winnerResult === 'win_p1') {
                scores['1']++;
                message = `Oyuncu 1 kazandı! ${p1.choice} , ${p2.choice}'ı yener.`;
            } else { // win_p2
                scores['2']++;
                message = `Oyuncu 2 kazandı! ${p2.choice} , ${p1.choice}'ı yener.`;
            }
            
            // Sonucu her iki oyuncuya da gönder
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
                scores = { '1': 0, '2': 0 }; // Puanları sıfırla, yeni oyuna hazır ol
            }

            // Bir sonraki tur için seçimleri sıfırla
            p1.choice = null;
            p2.choice = null;
        }
    });

    // Oyuncu bağlantıyı kestiğinde
    socket.on('disconnect', () => {
        console.log(`Kullanıcı bağlantıyı kesti: ${socket.id}`);
        delete players[socket.id]; // Oyuncuyu listeden kaldır
        io.emit('rakipAyrıldı', 'Rakip oyundan ayrıldı. Yeni oyuncu bekleniyor...');
        scores = { '1': 0, '2': 0 }; // Oyuncu sayısı 1'e düştüğü için puanları sıfırla
        io.emit('scoreUpdate', scores);
    });
});

/**
 * Kazananı belirleyen fonksiyon (Bu fonksiyon, sunucu tarafında çalışır).
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