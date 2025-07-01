
// Firebase SDK import
import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getDatabase, ref, set, onValue, get } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-database.js";

// Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyATrFY5Ui56HErMXFBT9qa_XSW2_mSyJiw",
    authDomain: "online-rsp-game.firebaseapp.com",
    databaseURL: "https://online-rsp-game-default-rtdb.firebaseio.com", // 중요: databaseURL을 직접 추가해야 합니다.
    projectId: "online-rsp-game",
    storageBucket: "online-rsp-game.appspot.com",
    messagingSenderId: "483029715456",
    appId: "1:483029715456:web:2a5b7b7002e6317a27e6e5"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const database = getDatabase(app);

// DOM Elements
const loginScreen = document.getElementById('login-screen');
const gameScreen = document.getElementById('game-screen');
const loginButtons = document.querySelectorAll('.login-btn');
const playerDisplay = document.getElementById('player-display');
const waitingMessage = document.getElementById('waiting-message');
const myScoreDisplay = document.getElementById('my-score');
const enemyScoreDisplay = document.getElementById('enemy-score');
const selectionArea = document.getElementById('selection-area');
const choiceButtons = document.querySelectorAll('.choice-btn');
const resultDisplay = document.getElementById('result-display');
const resetButton = document.getElementById('reset-button');


// Game State
let playerId = null;
let enemyId = null;
let gameRef = null;

// --- Login ---
loginButtons.forEach(button => {
    button.addEventListener('click', async () => {
        const inputId = button.dataset.player;
        handleLogin(inputId);
    });
});

async function handleLogin(inputId) {
    playerId = `player${inputId}`;
    enemyId = (playerId === 'player1') ? 'player2' : 'player1';

    gameRef = ref(database, 'game');

    // Check if player already exists
    const snapshot = await get(ref(database, `game/${playerId}`));
    if (snapshot.exists() && snapshot.val().online) {
        alert('이미 접속중인 플레이어입니다.');
        return;
    }

    playerDisplay.textContent = inputId;
    loginScreen.classList.add('hidden');
    gameScreen.classList.remove('hidden');

    // Set player data in Firebase
    set(ref(database, `game/${playerId}`), {
        online: true,
        choice: null,
        score: 0
    });
    set(ref(database, `game/state`), {
        round: 1,
        winner: null,
        message: "게임 시작"
    });

    // Listen for game state changes
    onValue(gameRef, (snapshot) => {
        const gameData = snapshot.val();
        // If game data is null (e.g., reset by other player), reload the page
        if (!gameData) {
            alert("게임이 초기화되었습니다. 로그인 화면으로 돌아갑니다.");
            window.location.reload();
            return;
        }

        updateUI(gameData);
        checkForWinner(gameData);
    });
}


// --- UI Update ---
function updateUI(gameData) {
    const myData = gameData[playerId];
    const enemyData = gameData[enemyId];

    // Update scores
    myScoreDisplay.textContent = myData?.score || 0;
    enemyScoreDisplay.textContent = enemyData?.score || 0;

    // Update waiting message
    if (enemyData?.online) {
        waitingMessage.textContent = '상대방이 접속했습니다. 선택을 시작하세요!';
        selectionArea.classList.remove('hidden');
    } else {
        waitingMessage.textContent = '상대방을 기다리는 중...';
        selectionArea.classList.add('hidden');
    }

     // Show my choice
    if(myData?.choice) {
        resultDisplay.textContent = `당신은 ${translateChoice(myData.choice)}를 냈습니다. 상대방의 선택을 기다립니다...`;
    }


    // If both made a choice, show result
    if (myData?.choice && enemyData?.choice) {
        const result = determineWinner(myData.choice, enemyData.choice);
        let message = `당신: ${translateChoice(myData.choice)}, 상대: ${translateChoice(translateChoice(enemyData.choice))}. `;

        if (result === 'win') {
            message += "당신이 이겼습니다!";
        } else if (result === 'lose') {
            message += "당신이 졌습니다.";
        } else {
            message += "비겼습니다.";
        }
        resultDisplay.textContent = message;

        // Reset choices for next round after a delay
        setTimeout(resetChoices, 2000);
    }
}


// --- Game Logic ---
choiceButtons.forEach(button => {
    button.addEventListener('click', () => {
        const choice = button.dataset.choice;
        set(ref(database, `game/${playerId}/choice`), choice);
    });
});

function determineWinner(myChoice, enemyChoice) {
    if (myChoice === enemyChoice) return 'draw';
    if (
        (myChoice === 'rock' && enemyChoice === 'scissors') ||
        (myChoice === 'scissors' && enemyChoice === 'paper') ||
        (myChoice === 'paper' && enemyChoice === 'rock')
    ) {
        // Win -> update my score
        const myCurrentScore = parseInt(myScoreDisplay.textContent);
        set(ref(database, `game/${playerId}/score`), myCurrentScore + 1);
        return 'win';
    } else {
        // Lose -> enemy score is updated by their client
        return 'lose';
    }
}

function resetChoices() {
    set(ref(database, `game/${playerId}/choice`), null);
}

function translateChoice(choice) {
    if (choice === 'rock') return '바위 ✊';
    if (choice === 'scissors') return '가위 ✌️';
    if (choice === 'paper') return '보 🖐️';
    return '';
}


// --- Win Condition & Reset ---
function checkForWinner(gameData) {
    const myData = gameData[playerId];
    const enemyData = gameData[enemyId];

    if (myData?.score >= 3) {
        resultDisplay.textContent = "🎉 최종 승리! 🎉";
        selectionArea.classList.add('hidden');
        resetButton.classList.remove('hidden');
    } else if (enemyData?.score >= 3) {
        resultDisplay.textContent = "😭 최종 패배... 😭";
        selectionArea.classList.add('hidden');
        resetButton.classList.remove('hidden');
    }
}

resetButton.addEventListener('click', () => {
    // Reset the entire game state in Firebase
    set(gameRef, null);
    // Reload the page to go back to the login screen
    window.location.reload();
});

// Handle user leaving the page
window.addEventListener('beforeunload', () => {
    if (playerId) {
        set(ref(database, `game/${playerId}/online`), false);
    }
});
