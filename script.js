const generateBtn = document.getElementById('generate-btn');
const canvas = document.getElementById('angle-canvas');
const ctx = canvas.getContext('2d');

let attempts = 0;

const attemptsLeftDisplay = document.getElementById('attempts-left');
const currentStreakDisplay = document.getElementById('current-streak');
let currentStreak = 0;

const centerX = canvas.width / 2;
const centerY = canvas.height / 2;
const lineLength = 150;

let generatedAngle; // Store the generated angle separately
let isAngleGenerated = false; // Flag to keep track of angle generation

function generateRandomAngle() {
    const randomAngle = Math.floor(Math.random() * 360);
    return randomAngle;
}

function clearCanvas() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
}

function drawLine(x1, y1, x2, y2) {
    ctx.beginPath();
    ctx.moveTo(x1, y1);
    ctx.lineTo(x2, y2);
    ctx.stroke();
}

function drawAngle(angle) {
    const angleInRadians = angle * (Math.PI / 180);
    const halfAngle = angleInRadians / 2;

    clearCanvas();

    // Calcola le coordinate degli endpoint delle due linee per rappresentare l'ampiezza dell'angolo
    const endX1 = centerX + lineLength * Math.cos(halfAngle);
    const endY1 = centerY - lineLength * Math.sin(halfAngle);
    const endX2 = centerX + lineLength * Math.cos(-halfAngle);
    const endY2 = centerY - lineLength * Math.sin(-halfAngle);

    // Disegna le due linee
    ctx.strokeStyle = 'black';
    drawLine(centerX, centerY, endX1, endY1);
    drawLine(centerX, centerY, endX2, endY2);

    // Calcola il raggio più piccolo per l'arco rosso
    const redArcRadius = lineLength * 0.3; // Riduci il raggio dell'arco (puoi regolarlo a tuo piacimento)

    // Calcola le nuove coordinate degli endpoint dell'arco rosso
    const redEndX1 = centerX + redArcRadius * Math.cos(halfAngle);
    const redEndY1 = centerY - redArcRadius * Math.sin(halfAngle);

    // Disegna l'arco rosso per indicare l'angolo
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(centerX, centerY); // Sposta il punto di inizio all'origine
    ctx.lineTo(redEndX1, redEndY1); // Disegna la prima metà dell'arco
    ctx.arc(centerX, centerY, redArcRadius, -halfAngle, halfAngle); // Disegna l'arco parziale
    ctx.lineTo(centerX, centerY); // Chiudi il percorso per completare l'arco parziale
    ctx.stroke();

    // Ripristina lo stile di linea predefinito
    ctx.strokeStyle = 'black';
    ctx.lineWidth = 1;
}

const checkBtn = document.getElementById('check-btn');
const userGuessInput = document.getElementById('user-guess');
const resultMessage = document.getElementById('result-message');

function resetInputsAndMessages() {
    userGuessInput.value = "";
    resultMessage.innerText = "";
}


checkBtn.addEventListener('click', () => {
    if (attemptsLeft === 0) {
        return; // Blocca l'azione se i tentativi sono esauriti
    }

    const userGuess = parseInt(userGuessInput.value);

    if (userGuess === generatedAngle) {
        resultMessage.innerText = 'Complimenti! Hai indovinato l\'angolo!';
        if (!hasLost) {
            currentStreak++; // Incrementa la streak solo se non hai perso tutti i tentativi
        }
        resetGame(); // Rigenera un nuovo angolo
    } else {
        const difference = Math.abs(userGuess - generatedAngle); // Calcola la differenza assoluta
        console.log(difference);
        const hint = getHint(difference);
        resultMessage.innerHTML = `Spiacente, il tuo tentativo non è corretto. <br>💡${hint}.<br>Prova di nuovo!`;

        attemptsLeft--; // Decrementa i tentativi rimasti per l'angolo corrente
        if (attemptsLeft === 0) {
            resultMessage.innerText = `Hai esaurito i tentativi. L'angolo era ${generatedAngle}°`;
            hasLost = true; // Imposta il flag hasLost a true se hai perso tutti i tentativi
            resetStreak(); // Reimposta la streak quando hai perso tutti i tentativi
        }
    }

    updateAttemptsLeft();
    updateCurrentStreak();

    // Disabilita il tasto "Controlla" se i tentativi sono esauriti
    if (attemptsLeft === 0) {
        checkBtn.disabled = true;
    }
});

generateBtn.addEventListener('click', () => {
    resetGame(); // Rigenera un nuovo angolo
    resetStreak(); // Reimposta la streak solo se hai perso tutti i tentativi
    updateCurrentStreak();
});


// Array di suggerimenti in base alla vicinanza dell'angolo
const hints = [
    { maxDifference: 5, hint: '<span class="hot">Bollente</span>! Sei molto vicino!' },
    { maxDifference: 10, hint: '<span class="hot">Caldo</span>! Stai avvicinandoti!' },
    { maxDifference: 20, hint: '<span class="warm">Ti scaldi</span>! Continua così!' },
    { maxDifference: 30, hint: '<span class="cold">Freddo</span>... Prova un altro tentativo!' },
    { maxDifference: 45, hint: '<span class="cold">Molto freddo</span>... Cerca altrove!' },
    { maxDifference: Infinity, hint: '<span class="cold">Gelido</span>! Riprova con un nuovo angolo.' }, // Caso generale
];

function getHint(difference) {
    for (const hint of hints) {
        if (difference <= hint.maxDifference) {
            return hint.hint;
        }
    }
    return 'Nessun suggerimento disponibile';
}

let attemptsLeft = 4;
let hasLost = false;

function updateAttemptsLeft() {
    attemptsLeftDisplay.innerText = attemptsLeft;
    localStorage.setItem('attemptsLeft', attemptsLeft);
    console.log(localStorage.getItem('attemptsLeft'));
}

function updateCurrentStreak() {
    currentStreakDisplay.innerText = currentStreak;
}

function resetGame() {
    generatedAngle = generateRandomAngle();
    isAngleVisible = false;
    drawAngle(generatedAngle);
    resetInputsAndMessages();

    attemptsLeft = 4; // Set default value
    updateAttemptsLeft();

    // Memorize the value of the generated angle in localStorage
    localStorage.setItem('generatedAngle', generatedAngle);

    // Reactivate the "Check" button after angle regeneration
    checkBtn.disabled = false;
}



function resetStreak() {
    currentStreak = 0;
    hasLost = false;

    // Memorizza il valore della streak nel localStorage
    localStorage.setItem('currentStreak', currentStreak);
}




document.addEventListener('DOMContentLoaded', () => {
    // Recupera il valore dell'angolo generato dal localStorage (se presente)
    const savedGeneratedAngle = localStorage.getItem('generatedAngle');
    if (savedGeneratedAngle) {
        generatedAngle = parseInt(savedGeneratedAngle);
        drawAngle(generatedAngle);
    } else {
        resetGame(); // Genera un angolo casuale all'avvio della pagina
    }
    
    // Recupera il valore della streak dal localStorage (se presente)
    const savedCurrentStreak = localStorage.getItem('currentStreak');
    if (savedCurrentStreak) {
        currentStreak = parseInt(savedCurrentStreak);
    } else {
        updateCurrentStreak(); // Aggiorna la streak all'avvio della pagina
    }

    // Restore the number of attempts from localStorage
    const savedAttemptsLeft = localStorage.getItem('attemptsLeft');
    if (savedAttemptsLeft) {
        attemptsLeft = parseInt(savedAttemptsLeft);
        // Check if attempts are exhausted and show the appropriate message
        if (attemptsLeft === 0) {
            resultMessage.innerText = `Hai esaurito i tentativi. L'angolo era ${generatedAngle}°`;
            hasLost = true; // Set the hasLost flag to true if all attempts are exhausted
        }
    } else {
        attemptsLeft = 4; // Set default value if 'attemptsLeft' not found in localStorage
    }
    updateAttemptsLeft();
});
