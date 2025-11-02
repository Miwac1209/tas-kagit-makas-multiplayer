// Socket.IO ile sunucuya bağlanma
// Sunucu aynı bilgisayarda çalıştığı için bu adres kullanılır
const socket = io('http://localhost:3000'); 

// HTML elemanlarını seçme
const userScoreElement = document.getElementById('user-score');
const computerScoreElement = document.getElementById('computer-score');
const resultMessageElement = document.getElementById('result-message');
const countdownDisplay = document.getElementById('countdown-display'); 
const userSelectionDisplay = document.getElementById('user-selection'); 
const computerSelectionDisplay = document.getElementById('computer-selection'); 
const choiceButtons = document.querySelectorAll('.choice-button');

// Ses Elemanlarını Seçme
const bgMusic = document.getElementById('bg-music');
const countdownSound = document.getElementById('countdown-sound');
const victorySound = document.getElementById('victory-sound');
const lossSound = document.getElementById('loss-sound');

// Oyun Durum Değişkenleri
let myPlayerNumber = 0; // Bu oyuncunun P1 mi P2 mi olduğunu tutar
let gameReady = false;
let isMusicPlaying = false; 

// Ses ve Stil Ayarları
// Arka plan müziği sesini JavaScript ile ayarla (HTML'deki ayarı destekler)
bgMusic.volume = 0.1;

// Seçimlerin Emojileri
const EMOJIS = {
    'Taş': '✊',
    'Kağıt': '🖐️',
    'Makas': '✌️'
};

// Başlangıç durumunda seçim gösterimlerini temizle
userSelectionDisplay.textContent = "Bağlanıyor...";
computerSelectionDisplay.textContent = "Bağlanıyor...";
toggleButtons(true); // Başlangıçta düğmeleri devre dışı bırak


// --- FONKSİYONLAR ---

function toggleButtons(disabled) {
    choiceButtons.forEach(button => {
        button.disabled = disabled;
    });
}

/**
 * 3 saniyelik geri sayımı gösterir. Seçim kilitlenene kadar gösterilir.
 */
function startCountdown(userChoice) {
    let count = 3;
    toggleButtons(true); // Düğmeleri devre dışı bırak
    
    // Geri sayım sesi çalmaya başlar 
    countdownSound.currentTime = 0; 
    countdownSound.play().catch(e => console.error("Geri Sayım Sesi Hatası:", e)); 

    // Geri sayımı her saniye güncelleme
    const countdownInterval = setInterval(() => {
        
        countdownDisplay.textContent = `${count}...`;
        
        if (count === 0) {
            clearInterval(countdownInterval); // Sayımı durdur
            countdownSound.pause(); // Geri sayım sesini durdur
            
            // Seçim kilitlendi ve sunucuya gönderildi
            userSelectionDisplay.textContent = `Sen: ${EMOJIS[userChoice]} (Gönderildi)`;
            computerSelectionDisplay.textContent = `Rakip bekleniyor...`;
            countdownDisplay.textContent = "Rakip bekleniyor...";
            
        } else if (count === 1) {
            countdownDisplay.textContent = "GÖNDERİLİYOR...";
            count--;
        } else {
            userSelectionDisplay.textContent = "Seçim Kilitlendi...";
            computerSelectionDisplay.textContent = "Rakip Seçimi Kilitlendi...";
            count--;
        }
    }, 1000); 
}

// --- SOCKET.IO OLAY DİNLEYİCİLERİ (Sunucudan Gelen Veriler) ---

// 1. Sunucudan oyuncu numaramızı alma (P1 veya P2)
socket.on('playerNumber', (number) => {
    myPlayerNumber = number;
    resultMessageElement.textContent = `Sen Oyuncu ${myPlayerNumber}'sın. Rakip bekleniyor...`;
    userSelectionDisplay.textContent = `Oyuncu ${myPlayerNumber}`;
    computerSelectionDisplay.textContent = myPlayerNumber === 1 ? "Oyuncu 2" : "Oyuncu 1";
});

// 2. Sunucudan oyunun başladığı bilgisini alma (2 oyuncu hazır)
socket.on('gameStart', (message) => {
    gameReady = true;
    resultMessageElement.textContent = message;
    toggleButtons(false); // Düğmeleri aktif et
    countdownDisplay.textContent = "Seçimini yap!";
});

// 3. Seçimimizin sunucuya ulaştığı onayı
socket.on('seçimOnayı', (message) => {
    countdownDisplay.textContent = message;
});

// 4. Sunucudan güncel skorları alma
socket.on('scoreUpdate', (scores) => {
    userScoreElement.textContent = `Oyuncu 1: ${scores['1']}`;
    computerScoreElement.textContent = `Oyuncu 2: ${scores['2']}`;
});

// 5. Sunucudan sonuç geldiğinde (TUR SONUÇLARI)
socket.on('sonuçAçıklandı', (data) => {
    
    // Seçimlerin gösterimi (P1 ve P2'nin seçimi)
    userSelectionDisplay.textContent = `P1: ${EMOJIS[data.p1Choice]}`;
    computerSelectionDisplay.textContent = `P2: ${EMOJIS[data.p2Choice]}`;
    
    resultMessageElement.textContent = data.message;
    userScoreElement.textContent = `Oyuncu 1: ${data.scores['1']}`;
    computerScoreElement.textContent = `Oyuncu 2: ${data.scores['2']}`;
    
    let winnerID = '';

    if (data.results === 'win_p1') {
        winnerID = '1';
    } else if (data.results === 'win_p2') {
        winnerID = '2';
    }
    
    // Tur sonucu stilini belirle ve geri sayım sesini sıfırla
    countdownSound.pause(); // Geri sayım sesini kapat
    resultMessageElement.className = '';
    
    // Hangi oyuncu kazandıysa (bizsek yeşil, rakipse kırmızı)
    if (winnerID !== '' && winnerID === myPlayerNumber.toString()) {
        resultMessageElement.classList.add('win');
    } else if (winnerID !== '' && winnerID !== myPlayerNumber.toString()) {
        resultMessageElement.classList.add('lose');
    } else {
        resultMessageElement.classList.add('draw');
    }

    // Bir sonraki tur için düğmeleri aç
    toggleButtons(false); // Oyun bitti mesajı gelene kadar kapalı kalır
    countdownDisplay.textContent = "Tekrar Seçimini Yapın.";
});

// 6. Rakip oyundan ayrıldığında
socket.on('rakipAyrıldı', (message) => {
    gameReady = false;
    resultMessageElement.textContent = message;
    toggleButtons(true);
    userScoreElement.textContent = `Oyuncu 1: 0`;
    computerScoreElement.textContent = `Oyuncu 2: 0`;
});

// 7. Oyun bittiğinde (FINAL SONUCU)
socket.on('gameOver', (data) => {
    bgMusic.pause();
    toggleButtons(true);
    
    // Final seslerini sıfırla ve çal
    victorySound.pause(); victorySound.currentTime = 0;
    lossSound.pause(); lossSound.currentTime = 0;

    let finalMessage = "";
    if (data.winner === myPlayerNumber) {
        finalMessage = "Tebrikler! Oyunu KAZANDIN! 🏆";
        victorySound.play().catch(e => console.error("Final Kazanma Sesi Hatası:", e));
    } else {
        finalMessage = "Rakip Kazandı. Bir daha dene! 💔";
        lossSound.play().catch(e => console.error("Final Kaybetme Sesi Hatası:", e));
    }

    resultMessageElement.textContent = finalMessage;
    resultMessageElement.classList.add('final-winner');
    countdownDisplay.textContent = "Oyun Bitti. Yeni Oyun için sayfayı yenile.";
});


// --- OLAY DİNLEYİCİLERİ (Düğmelere Tıklama) ---

choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
        // Müzik çalmaya başlamadıysa, ilk tıklamada başlat
        if (!isMusicPlaying) {
            bgMusic.play().catch(e => console.error("Müzik çalma hatası:", e)); 
            isMusicPlaying = true;
            countdownDisplay.textContent = "Seçiminizi yapın!";
        }
        
        // Sadece oyun hazırsa ve oyuncu atanmışsa seçim yap
        if (gameReady && myPlayerNumber !== 0) {
            const userChoice = button.getAttribute('data-choice'); 
            
            // Seçimi sunucuya gönder
            socket.emit('seçimYapıldı', userChoice); 
            
            countdownDisplay.textContent = `Seçim kilitleniyor...`;
            startCountdown(userChoice);
        } else if (myPlayerNumber === 0) {
            alert("Lütfen bir oyuncu olarak atanmayı bekleyin.");
        } else {
            alert("Rakip bekleniyor. Lütfen sabırlı olun.");
        }
    });
});
 
        