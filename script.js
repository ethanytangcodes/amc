// Global variables
let currentProblem = {};
let streak = parseInt(localStorage.getItem('streak') || '0');
let canvas, ctx, drawing = false;
let drawMode = false;
let answerSubmitted = false;
let timerInterval = null;
let timeLeft = 0;
let mode = 'practice';
let testState = null;

// REPLACE THIS WITH YOUR WORKER URL
const WORKER_URL = 'https://your-worker.workers.dev';

// Load settings
let settings = JSON.parse(localStorage.getItem('amcSettings') || JSON.stringify({
    levels: ['10', '12', 'AIME'],
    yearMin: 2000,
    yearMax: 2020,
    problemMin: 1,
    problemMax: 25,
    aimeProblemMin: 1,
    aimeProblemMax: 15,
    timerMinutes: 0
}));

// Initialize
document.getElementById('streak').textContent = streak;
window.addEventListener('load', () => {
    initCanvas();
    getNewProblem();
});

// Canvas drawing functions
function initCanvas() {
    canvas = document.getElementById('drawCanvas');
    const container = document.getElementById('problemContainer');
    
    function resizeCanvas() {
        canvas.width = container.offsetWidth;
        canvas.height = container.offsetHeight;
    }
    
    resizeCanvas();
    window.addEventListener('resize', resizeCanvas);
    
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    let lastX = 0;
    let lastY = 0;
    
    canvas.addEventListener('mousedown', (e) => {
        if (!drawMode) return;
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        lastX = e.clientX - rect.left;
        lastY = e.clientY - rect.top;
    });
    
    canvas.addEventListener('mousemove', (e) => {
        if (!drawing || !drawMode) return;
        const rect = canvas.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    });
    
    canvas.addEventListener('mouseup', () => {
        drawing = false;
    });
    
    canvas.addEventListener('mouseleave', () => {
        drawing = false;
    });
    
    // Touch support
    canvas.addEventListener('touchstart', (e) => {
        if (!drawMode) return;
        e.preventDefault();
        drawing = true;
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        lastX = touch.clientX - rect.left;
        lastY = touch.clientY - rect.top;
    });
    
    canvas.addEventListener('touchmove', (e) => {
        if (!drawing || !drawMode) return;
        e.preventDefault();
        const rect = canvas.getBoundingClientRect();
        const touch = e.touches[0];
        const x = touch.clientX - rect.left;
        const y = touch.clientY - rect.top;
        
        ctx.beginPath();
        ctx.moveTo(lastX, lastY);
        ctx.lineTo(x, y);
        ctx.stroke();
        
        lastX = x;
        lastY = y;
    });
    
    canvas.addEventListener('touchend', () => {
        drawing = false;
    });
}

function toggleDraw() {
    drawMode = !drawMode;
    const canvasEl = document.getElementById('drawCanvas');
    const tools = document.getElementById('drawTools');
    const btn = document.getElementById('drawToggle');
    
    if (drawMode) {
        canvasEl.classList.add('drawing-mode');
        tools.style.display = 'flex';
        btn.textContent = 'Draw: On';
        btn.style.borderColor = '#3498db';
        btn.style.color = '#3498db';
    } else {
        canvasEl.classList.remove('drawing-mode');
        tools.style.display = 'none';
        btn.textContent = 'Draw: Off';
        btn.style.borderColor = '#ddd';
        btn.style.color = '#2c3e50';
    }
}

function setColor(color, element) {
    if(ctx) {
        ctx.strokeStyle = color;
        document.querySelectorAll('.color-btn').forEach(btn => btn.classList.remove('active'));
        element.classList.add('active');
    }
}

function clearCanvas() {
    if(ctx) ctx.clearRect(0, 0, canvas.width, canvas.height);
}

// Timer functions
function startTimer(minutes) {
    stopTimer();
    if (minutes === 0) return;
    
    timeLeft = minutes * 60;
    document.getElementById('timerDisplay').style.display = 'flex';
    updateTimerDisplay();
    
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        
        if (timeLeft <= 0) {
            stopTimer();
            if (mode === 'test') {
                checkAnswer(true);
            } else {
                alert('Time is up!');
                getNewProblem();
            }
        }
    }, 1000);
}

function stopTimer() {
    if (timerInterval) {
        clearInterval(timerInterval);
        timerInterval = null;
    }
}

function updateTimerDisplay() {
    const mins = Math.floor(timeLeft / 60);
    const secs = timeLeft % 60;
    document.getElementById('timer').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    const display = document.getElementById('timerDisplay');
    if (timeLeft <= 30) {
        display.className = 'timer-display danger';
    } else if (timeLeft <= 60) {
        display.className = 'timer-display warning';
    } else {
        display.className = 'timer-display';
    }
}

// Settings functions
function loadSettingsUI() {
    document.querySelectorAll('.checkbox-item input').forEach(cb => {
        cb.checked = settings.levels.includes(cb.value);
    });
    document.getElementById('yearMin').value = settings.yearMin;
    document.getElementById('yearMax').value = settings.yearMax;
    document.getElementById('problemMin').value = settings.problemMin;
    document.getElementById('problemMax').value = settings.problemMax;
    document.getElementById('aimeProblemMin').value = settings.aimeProblemMin;
    document.getElementById('aimeProblemMax').value = settings.aimeProblemMax;
    document.getElementById('timerMinutes').value = settings.timerMinutes;
}

function updateSettings() {
    settings.levels = Array.from(document.querySelectorAll('.checkbox-item input:checked')).map(cb => cb.value);
    settings.yearMin = parseInt(document.getElementById('yearMin').value);
    settings.yearMax = parseInt(document.getElementById('yearMax').value);
    settings.problemMin = parseInt(document.getElementById('problemMin').value);
    settings.problemMax = parseInt(document.getElementById('problemMax').value);
    settings.aimeProblemMin = parseInt(document.getElementById('aimeProblemMin').value);
    settings.aimeProblemMax = parseInt(document.getElementById('aimeProblemMax').value);
    settings.timerMinutes = parseInt(document.getElementById('timerMinutes').value);
    
    if(settings.yearMin > settings.yearMax) {
        settings.yearMin = settings.yearMax;
        document.getElementById('yearMin').value = settings.yearMin;
    }
    if(settings.problemMin > settings.problemMax) {
        settings.problemMin = settings.problemMax;
        document.getElementById('problemMin').value = settings.problemMin;
    }
    if(settings.aimeProblemMin > settings.aimeProblemMax) {
        settings.aimeProblemMin = settings.aimeProblemMax;
        document.getElementById('aimeProblemMin').value = settings.aimeProblemMin;
    }
    
    localStorage.setItem('amcSettings', JSON.stringify(settings));
}

function openSettings() {
    loadSettingsUI();
    document.getElementById('settingsModal').style.display = 'flex';
}

function closeSettings() {
    document.getElementById('settingsModal').style.display = 'none';
}

// Test mode functions
function changeMode() {
    mode = document.getElementById('modeSelect').value;
    if (mode === 'test') {
        startNewTest();
    } else {
        testState = null;
        stopTimer();
        document.getElementById('timerDisplay').style.display = 'none';
        getNewProblem();
    }
}

function startNewTest() {
    const testType = prompt('Enter test type: AMC10, AMC12, or AIME');
    if (!testType) {
        document.getElementById('modeSelect').value = 'practice';
        mode = 'practice';
        return;
    }
    
    const type = testType.toUpperCase().replace(/\s/g, '');
    let numProblems, totalTime, pointsPerProblem;
    
    if (type === 'AMC10' || type === 'AMC12') {
        numProblems = 25;
        totalTime = 75 * 60;
        pointsPerProblem = [1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 1.5, 2, 2, 2, 2, 2];
    } else if (type === 'AIME' || type.includes('AIME')) {
        numProblems = 15;
        totalTime = 180 * 60;
        pointsPerProblem = 1;
    } else {
        alert('Invalid test type!');
        document.getElementById('modeSelect').value = 'practice';
        mode = 'practice';
        return;
    }

    testState = {
        type: type,
        currentProblem: 1,
        totalProblems: numProblems,
        answers: [],
        startTime: Date.now(),
        totalTime: totalTime,
        pointsPerProblem: pointsPerProblem
    };

    timeLeft = totalTime;
    document.getElementById('timerDisplay').style.display = 'flex';
    updateTimerDisplay();
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerDisplay();
        if (timeLeft <= 0) {
            finishTest();
        }
    }, 1000);

    loadTestProblem();
}

async function loadTestProblem() {
    if (!testState) return;

    const probNum = testState.currentProblem;
    const type = testState.type;
    
    let amcType, year;
    if (type === 'AMC10') {
        amcType = '10';
        year = 2000 + Math.floor(Math.random() * 21);
    } else if (type === 'AMC12') {
        amcType = '12';
        year = 2000 + Math.floor(Math.random() * 21);
    } else {
        amcType = 'AIME';
        year = 1983 + Math.floor(Math.random() * 38);
    }

    const hasAB = amcType !== 'AIME' && year >= 2002;
    const ab = hasAB ? (Math.random() > 0.5 ? 'A' : 'B') : '';
    
    let path = '';
    
    if (amcType === 'AIME') {
        const aimeVersion = year >= 2000 && Math.random() > 0.5 ? 'I' : 'II';
        path = `${year}_AIME_${year >= 2000 ? aimeVersion + '_' : ''}Problems/Problem_${probNum}`;
    } else {
        path = `${year}_AMC_${amcType}${ab}_Problems/Problem_${probNum}`;
    }

    currentProblem = {
        path: path,
        id: `Problem ${probNum}`,
        type: amcType,
        testProblemNum: probNum
    };

    try {
        const problemResp = await fetch(`${WORKER_URL}/?!${path}`);
        if (!problemResp.ok) {
            console.log('Problem not found, trying again...');
            await loadTestProblem();
            return;
        }
        
        const problemText = await problemResp.text();
        
        // Check if we got a full page
        if (problemText.includes('<!DOCTYPE') || problemText.includes('<html') || problemText === 'Problem content not found') {
            console.log('Problem content issue, retrying...');
            await loadTestProblem();
            return;
        }
        
        document.getElementById('problemText').innerHTML = problemText;
        
        const solutionResp = await fetch(`${WORKER_URL}/?${path}`);
        const solutionText = await solutionResp.text();
        
        if (solutionText !== 'Solution not found') {
            document.getElementById('solution').innerHTML = solutionText;
        } else {
            document.getElementById('solution').innerHTML = '<p>Solution not available.</p>';
        }
        
        const answerResp = await fetch(`${WORKER_URL}/?|${path}`);
        const answerText = await answerResp.text();
        
        const cleanAnswer = answerText.trim().toUpperCase();
        
        if (cleanAnswer === 'NOT_FOUND' || cleanAnswer === 'INVALID') {
            console.log('Answer not found, retrying...');
            await loadTestProblem();
            return;
        }
        
        currentProblem.answer = cleanAnswer;
        
        console.log('Test Problem:', currentProblem.id, 'Answer:', currentProblem.answer);
        
        document.getElementById('problemId').textContent = `${testState.type} - Problem ${probNum} of ${testState.totalProblems}`;
        document.getElementById('answerSection').style.display = 'flex';
        document.getElementById('solution').style.display = 'none';
        document.getElementById('answer').value = '';
        document.getElementById('resultMessage').innerHTML = '';
        answerSubmitted = false;
        clearCanvas();
    } catch(e) {
        console.log('Error loading problem, trying again...', e);
        await loadTestProblem();
    }
}

function finishTest() {
    stopTimer();
    
    let totalScore = 0;
    const isAMC10or12 = testState.type === 'AMC10' || testState.type === 'AMC12';
    
    testState.answers.forEach((ans, idx) => {
        if (ans.correct) {
            if (isAMC10or12) {
                totalScore += testState.pointsPerProblem[idx];
            } else {
                totalScore += testState.pointsPerProblem;
            }
        }
    });

    const timeTaken = Math.floor((Date.now() - testState.startTime) / 1000);
    const mins = Math.floor(timeTaken / 60);
    const secs = timeTaken % 60;

    document.getElementById('testTitle').textContent = `${testState.type} Practice Test`;
    document.getElementById('testScore').textContent = `Score: ${totalScore} / ${isAMC10or12 ? 37.5 : 15}`;
    document.getElementById('testTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    const problemsDiv = document.getElementById('testProblems');
    problemsDiv.innerHTML = '<h4>Problem Results:</h4>';
    testState.answers.forEach((ans, idx) => {
        const item = document.createElement('div');
        item.className = 'test-problem-item';
        item.innerHTML = `
            <span>Problem ${idx + 1}</span>
            <span style="color: ${ans.correct ? '#27ae60' : '#c0392b'}; font-weight: 600;">
                ${ans.correct ? '✓ Correct' : '✗ Incorrect'} (Your: ${ans.userAnswer || 'No answer'}, Correct: ${ans.correctAnswer})
            </span>
        `;
        problemsDiv.appendChild(item);
    });

    document.getElementById('testResultModal').style.display = 'flex';
}

function closeTestResult() {
    document.getElementById('testResultModal').style.display = 'none';
    document.getElementById('modeSelect').value = 'practice';
    mode = 'practice';
    testState = null;
    getNewProblem();
}

// Problem generation
function shuffle(arr) {
    return arr.sort(() => Math.random() - 0.5);
}

function randomInRange(min, max) {
    return Math.floor(Math.random() * (max - min + 1)) + min;
}

async function getNewProblem() {
    if (mode === 'test') {
        loadTestProblem();
        return;
    }

    if(settings.levels.length === 0) {
        alert('Please select at least one competition level in settings!');
        openSettings();
        return;
    }

    answerSubmitted = false;
    document.getElementById('resultMessage').innerHTML = '';
    document.getElementById('solution').style.display = 'none';
    clearCanvas();

    const type = shuffle([...settings.levels])[0];
    let minYear = settings.yearMin;
    let maxYear = settings.yearMax;
    
    if(type === 'AIME') {
        minYear = Math.max(minYear, 1983);
    } else {
        minYear = Math.max(minYear, 2000);
    }
    
    const year = randomInRange(minYear, maxYear);
    
    let probMin, probMax;
    if(type === 'AIME') {
        probMin = settings.aimeProblemMin;
        probMax = settings.aimeProblemMax;
    } else {
        probMin = settings.problemMin;
        probMax = settings.problemMax;
    }
    
    const prob = randomInRange(probMin, probMax);
    const hasAB = type !== 'AIME' && year >= 2002;
    const ab = hasAB ? shuffle(['A', 'B'])[0] : '';
    
    let path = '';
    
    if(type === 'AIME') {
        const aimeVersion = year >= 2000 && Math.random() > 0.5 ? 'I' : 'II';
        path = `${year}_AIME_${year >= 2000 ? aimeVersion + '_' : ''}Problems/Problem_${prob}`;
    } else {
        path = `${year}_AMC_${type}${ab}_Problems/Problem_${prob}`;
    }
    
    currentProblem = {
        path: path,
        id: `${year} ${type === 'AIME' ? 'AIME' : 'AMC ' + type}${ab} #${prob}`,
        type: type
    };
    
    try {
        const problemResp = await fetch(`${WORKER_URL}/?!${path}`);
        if (!problemResp.ok) {
            console.log('Problem not found (404), getting a new one...');
            await getNewProblem();
            return;
        }
        
        const problemText = await problemResp.text();
        
        // Check if we got a full page (contains DOCTYPE or <html>)
        if (problemText.includes('<!DOCTYPE') || problemText.includes('<html')) {
            console.log('Got full page instead of problem content, retrying...');
            await getNewProblem();
            return;
        }
        
        if (problemText === 'Problem content not found') {
            console.log('Problem content not found, retrying...');
            await getNewProblem();
            return;
        }
        
        document.getElementById('problemText').innerHTML = problemText;
        
        const solutionResp = await fetch(`${WORKER_URL}/?${path}`);
        const solutionText = await solutionResp.text();
        
        if (solutionText !== 'Solution not found') {
            document.getElementById('solution').innerHTML = solutionText;
        } else {
            document.getElementById('solution').innerHTML = '<p>Solution not available for this problem.</p>';
        }
        
        const answerResp = await fetch(`${WORKER_URL}/?|${path}`);
        const answerText = await answerResp.text();
        
        const cleanAnswer = answerText.trim().toUpperCase();
        
        if (cleanAnswer === 'NOT_FOUND' || cleanAnswer === 'INVALID') {
            console.log('Answer not found, retrying...');
            await getNewProblem();
            return;
        }
        
        currentProblem.answer = cleanAnswer;
        
        console.log('Problem:', currentProblem.id);
        console.log('Correct answer:', currentProblem.answer);
        
        document.getElementById('problemId').textContent = currentProblem.id;
        document.getElementById('answerSection').style.display = 'flex';
        document.getElementById('solution').style.display = 'none';
        document.getElementById('answer').value = '';

        if (settings.timerMinutes > 0) {
            startTimer(settings.timerMinutes);
        }
    } catch(e) {
        console.log('Error loading problem, getting a new one...', e);
        await getNewProblem();
    }
}

function checkAnswer(timeUp = false) {
    if (answerSubmitted && mode !== 'test') return;

    const userAnswer = document.getElementById('answer').value.toUpperCase().trim();
    const isAIME = currentProblem.type === 'AIME';
    const validAIME = /^[0-9]{3}$/.test(userAnswer);
    const validAMC = /^[ABCDE]$/.test(userAnswer);
    
    if (!timeUp && !((isAIME && validAIME) || (!isAIME && validAMC))) {
        alert('Enter a valid response!');
        return;
    }

    answerSubmitted = true;
    const correct = userAnswer === currentProblem.answer;
    
    console.log('User answer:', userAnswer, 'Correct answer:', currentProblem.answer, 'Match:', correct);

    if (mode === 'test') {
        testState.answers.push({
            problemNum: testState.currentProblem,
            userAnswer: userAnswer,
            correctAnswer: currentProblem.answer,
            correct: correct
        });

        if (testState.currentProblem < testState.totalProblems) {
            testState.currentProblem++;
            setTimeout(() => loadTestProblem(), 500);
        } else {
            finishTest();
        }
        return;
    }

    stopTimer();

    const resultDiv = document.getElementById('resultMessage');
    if (correct) {
        streak++;
        localStorage.setItem('streak', streak);
        document.getElementById('streak').textContent = streak;
        resultDiv.className = 'result-message result-correct';
        resultDiv.innerHTML = `
            <div>✓ Correct!</div>
            <div style="margin-top: 12px;">
                <button class="btn btn-success" onclick="getNewProblem()">Next Problem</button>
                <button class="btn btn-primary" onclick="document.getElementById('solution').style.display='block'">Show Solution</button>
            </div>
        `;
        createConfetti();
        document.getElementById('answerSection').style.display = 'none';
    } else {
        streak = 0;
        localStorage.setItem('streak', '0');
        document.getElementById('streak').textContent = '0';
        resultDiv.className = 'result-message result-incorrect';
        resultDiv.innerHTML = `
            <div>✗ Incorrect</div>
            <div>The correct answer is: <strong>${currentProblem.answer}</strong></div>
            <div style="margin-top: 12px;">
                <button class="btn btn-success" onclick="getNewProblem()">Next Problem</button>
                <button class="btn btn-primary" onclick="document.getElementById('solution').style.display='block'">Show Solution</button>
            </div>
        `;
    }
}

function giveUp() {
    if(confirm('Are you sure you want to give up?')) {
        answerSubmitted = true;
        stopTimer();
        streak = 0;
        localStorage.setItem('streak', '0');
        document.getElementById('streak').textContent = '0';

        const resultDiv = document.getElementById('resultMessage');
        resultDiv.className = 'result-message result-incorrect';
        resultDiv.innerHTML = `
            <div>The correct answer is: <strong>${currentProblem.answer}</strong></div>
            <div style="margin-top: 12px;">
                <button class="btn btn-success" onclick="getNewProblem()">Next Problem</button>
                <button class="btn btn-primary" onclick="document.getElementById('solution').style.display='block'">Show Solution</button>
            </div>
        `;
        document.getElementById('answerSection').style.display = 'none';
    }
}

function createConfetti() {
    const colors = ['#e74c3c', '#3498db', '#2ecc71', '#f39c12', '#9b59b6', '#1abc9c'];
    for(let i = 0; i < 50; i++) {
        setTimeout(() => {
            const confetti = document.createElement('div');
            confetti.className = 'confetti';
            confetti.style.left = Math.random() * 100 + '%';
            confetti.style.top = '-10px';
            confetti.style.background = colors[Math.floor(Math.random() * colors.length)];
            confetti.style.animationDelay = Math.random() * 0.3 + 's';
            document.body.appendChild(confetti);
            setTimeout(() => confetti.remove(), 2500);
        }, i * 20);
    }
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
    if(e.key === 'Enter' && !e.ctrlKey && document.activeElement.id === 'answer') checkAnswer();
    if(e.ctrlKey && e.key === 'Enter') getNewProblem();
    if(e.key === 'Escape') {
        closeSettings();
        if(drawMode) toggleDraw();
    }
});

// Close modals on outside click
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if(e.target.id === 'settingsModal') closeSettings();
});
document.getElementById('testResultModal').addEventListener('click', (e) => {
    if(e.target.id === 'testResultModal') closeTestResult();
});
