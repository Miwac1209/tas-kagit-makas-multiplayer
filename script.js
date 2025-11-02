// Socket.IO ile sunucuya bağlanma
// NOT: io() yazmak, Render'da doğru adrese (canlı siteye) bağlanmayı sağlar.
const socket = io(); 

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

// 5. Sunucudan sonuç geldiğinde (TUR SON