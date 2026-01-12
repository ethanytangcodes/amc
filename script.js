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

// Load settings
let settings = JSON.parse(localStorage.getItem('amcSettings') || JSON.stringify({
    levels: ['8', '10', '12', 'AIME'],
    yearMin: 2000,
    yearMax: 2020,
    problemMin: 1,
    problemMax: 25,
    aimeProblemMin: 1,
    aimeProblemMax: 15,
    timerMinutes: 0
}));

// Load progress
let progress = JSON.parse(localStorage.getItem('amcProgress') || '{}');

// Initialize
document.getElementById('streak').textContent = streak;
window.addEventListener('load', () => {
    initCanvas();
    getNewProblem();
});

// Canvas drawing functions
function initCanvas() {
    canvas = document.getElementById('drawCanvas');
    const container = canvas.parentElement;
    canvas.width = container.offsetWidth;
    canvas.height = container.offsetHeight;
    ctx = canvas.getContext('2d');
    ctx.strokeStyle = '#000';
    ctx.lineWidth = 2;
    ctx.lineCap = 'round';
    
    canvas.addEventListener('mousedown', startDrawing);
    canvas.addEventListener('mousemove', draw);
    canvas.addEventListener('mouseup', stopDrawing);
    canvas.addEventListener('mouseleave', stopDrawing);
    canvas.addEventListener('touchstart', handleTouch);
    canvas.addEventListener('touchmove', handleTouch);
    canvas.addEventListener('touchend', stopDrawing);
}

function startDrawing(e) {
    if (!drawMode) return;
    drawing = true;
    const rect = canvas.getBoundingClientRect();
    ctx.beginPath();
    ctx.moveTo(e.clientX - rect.left, e.clientY - rect.top);
}

function draw(e) {
    if (!drawing || !drawMode) return;
    const rect = canvas.getBoundingClientRect();
    ctx.lineTo(e.clientX - rect.left, e.clientY - rect.top);
    ctx.stroke();
}

function stopDrawing() {
    drawing = false;
}

function handleTouch(e) {
    e.preventDefault();
    const touch = e.touches[0];
    const mouseEvent = new MouseEvent(e.type === 'touchstart' ? 'mousedown' : 'mousemove', {
        clientX: touch.clientX,
        clientY: touch.clientY
    });
    canvas.dispatchEvent(mouseEvent);
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

// Progress functions
function openProgress() {
    renderProgressMatrix();
    document.getElementById('progressModal').style.display = 'flex';
}

function closeProgress() {
    document.getElementById('progressModal').style.display = 'none';
}

function renderProgressMatrix() {
    const container = document.getElementById('progressMatrix');
    container.innerHTML = '';

    const grouped = {};
    for(let key in progress) {
        const parts = key.split('_');
        const year = parts[0];
        const type = parts.slice(1, -1).join('_');
        const yearType = `${year} ${type}`;
        
        if(!grouped[yearType]) grouped[yearType] = {};
        grouped[yearType][key] = progress[key];
    }

    const sorted = Object.keys(grouped).sort((a, b) => {
        const yearA = parseInt(a.split(' ')[0]);
        const yearB = parseInt(b.split(' ')[0]);
        return yearB - yearA;
    });

    sorted.forEach(yearType => {
        const yearDiv = document.createElement('div');
        yearDiv.className = 'matrix-year';
        
        const title = document.createElement('h3');
        title.textContent = yearType;
        yearDiv.appendChild(title);

        const grid = document.createElement('div');
        grid.className = 'matrix-grid';

        const isAIME = yearType.includes('AIME');
        const maxProb = isAIME ? 15 : 25;

        for(let i = 1; i <= maxProb; i++) {
            const cell = document.createElement('div');
            cell.className = 'matrix-cell';
            cell.textContent = i;

            const probKey = `${yearType.replace(' ', '_')}_${i}`;
            if(progress[probKey] === true) {
                cell.classList.add('correct');
            } else if(progress[probKey] === false) {
                cell.classList.add('incorrect');
            }

            grid.appendChild(cell);
        }

        yearDiv.appendChild(grid);
        container.appendChild(yearDiv);
    });
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
    const testType = prompt('Enter test type: AMC8, AMC10, AMC12, or AIME');
    if (!testType) {
        document.getElementById('modeSelect').value = 'practice';
        mode = 'practice';
        return;
    }
    
    const type = testType.toUpperCase().replace(/\s/g, '');
    let numProblems, totalTime, pointsPerProblem;
    
    if (type === 'AMC8') {
        numProblems = 25;
        totalTime = 40 * 60;
        pointsPerProblem = 1;
    } else if (type === 'AMC10' || type === 'AMC12') {
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
    if (type === 'AMC8') {
        amcType = '8';
        year = 2000 + Math.floor(Math.random() * 21);
    } else if (type === 'AMC10') {
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
    
    let url = `https://wandering-sky-a896.cbracketdash.workers.dev/?!${year}_`;
    let problemId = '';
    
    if (amcType === 'AIME') {
        const aimeVersion = year >= 2000 && Math.random() > 0.5 ? 'I' : 'II';
        url += `AIME_${year >= 2000 ? aimeVersion + '_' : ''}Problems_Problem_${probNum}.html`;
        problemId = `${year}_AIME${year >= 2000 ? '_' + aimeVersion : ''}_${probNum}`;
    } else {
        url += `AMC_${amcType}${ab}_Problems_Problem_${probNum}.html`;
        problemId = `${year}_AMC_${amcType}${ab}_${probNum}`;
    }

    currentProblem = {
        url: url,
        answerUrl: url.replace('?!', '?|'),
        id: `Problem ${probNum}`,
        type: amcType,
        progressKey: problemId,
        testProblemNum: probNum
    };

    try {
        const problemResp = await fetch(url);
        const problemText = await problemResp.text();
        const cleanProblem = problemText.replace(/\\n/g, '\n').replace(/b'/g, '').replace(/'/g, '');
        document.getElementById('problemText').innerHTML = cleanProblem;
        
        const solutionResp = await fetch(url.replace('?!', '?$'));
        const solutionText = await solutionResp.text();
        let cleanSolution = solutionText.replace(/\\n/g, '\n').replace(/b'/g, '').replace(/'/g, '');
        cleanSolution = cleanSolution.replace(/<a[^>]*href="[^"]*artofproblemsolving\.com[^"]*"[^>]*>.*?<\/a>/gi, '');
        document.getElementById('solution').innerHTML = cleanSolution;
        
        const answerResp = await fetch(currentProblem.answerUrl);
        const answerText = await answerResp.text();
        const rawAnswer = answerText.split("b'")[1]?.split("'")[0] || '';
        currentProblem.answer = rawAnswer.replace(/'/g, '');
        
        document.getElementById('problemId').textContent = `${testState.type} - Problem ${probNum} of ${testState.totalProblems}`;
        document.getElementById('answerSection').style.display = 'flex';
        document.getElementById('solution').style.display = 'none';
        document.getElementById('answer').value = '';
        document.getElementById('resultMessage').innerHTML = '';
        answerSubmitted = false;
        clearCanvas();
    } catch(e) {
        document.getElementById('problemText').textContent = 'Error loading problem. Please try again.';
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
    document.getElementById('testScore').textContent = `Score: ${totalScore} / ${isAMC10or12 ? 37.5 : (testState.type === 'AMC8' ? 25 : 15)}`;
    document.getElementById('testTime').textContent = `${mins}:${secs.toString().padStart(2, '0')}`;
    
    const problemsDiv = document.getElementById('testProblems');
    problemsDiv.innerHTML = '<h4>Problem Results:</h4>';
    testState.answers.forEach((ans, idx) => {
        const item = document.createElement('div');
        item.className = 'test-problem-item';
        item.innerHTML = `
            <span>Problem ${idx + 1}</span>
            <span style="color: ${ans.correct ? '#27ae60' : '#c0392b'}; font-weight: 600;">
                ${ans.correct ? '✓ Correct' : '✗ Incorrect'} (${ans.userAnswer || 'No answer'})
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
    
    let url = `https://wandering-sky-a896.cbracketdash.workers.dev/?!${year}_`;
    let problemId = '';
    
    if(type === 'AIME') {
        const aimeVersion = year >= 2000 && Math.random() > 0.5 ? 'I' : 'II';
        url += `AIME_${year >= 2000 ? aimeVersion + '_' : ''}Problems_Problem_${prob}.html`;
        problemId = `${year}_AIME${year >= 2000 ? '_' + aimeVersion : ''}_${prob}`;
    } else {
        url += `AMC_${type}${ab}_Problems_Problem_${prob}.html`;
        problemId = `${year}_AMC_${type}${ab}_${prob}`;
    }
    
    currentProblem = {
        url: url,
        answerUrl: url.replace('?!', '?|'),
        id: `${year} ${type === 'AIME' ? 'AIME' : 'AMC ' + type}${ab} #${prob}`,
        type: type,
        progressKey: problemId
    };
    
    try {
        const problemResp = await fetch(url);
        const problemText = await problemResp.text();
        const cleanProblem = problemText.replace(/\\n/g, '\n').replace(/b'/g, '').replace(/'/g, '');
        document.getElementById('problemText').innerHTML = cleanProblem;
        
        const solutionResp = await fetch(url.replace('?!', '?$'));
        const solutionText = await solutionResp.text();
        let cleanSolution = solutionText.replace(/\\n/g, '\n').replace(/b'/g, '').replace(/'/g, '');
        cleanSolution = cleanSolution.replace(/<a[^>]*href="[^"]*artofproblemsolving\.com[^"]*"[^>]*>.*?<\/a>/gi, '');
        document.getElementById('solution').innerHTML = cleanSolution;
        
        const answerResp = await fetch(currentProblem.answerUrl);
        const answerText = await answerResp.text();
        const rawAnswer = answerText.split("b'")[1]?.split("'")[0] || '';
        currentProblem.answer = rawAnswer.replace(/'/g, '');
        
        document.getElementById('problemId').textContent = currentProblem.id;
        document.getElementById('answerSection').style.display = 'flex';
        document.getElementById('solution').style.display = 'none';
        document.getElementById('answer').value = '';

        if (settings.timerMinutes > 0) {
            startTimer(settings.timerMinutes);
        }
    } catch(e) {
        document.getElementById('problemText').textContent = 'Error loading problem. Please try again.';
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
    progress[currentProblem.progressKey] = correct;
    localStorage.setItem('amcProgress', JSON.stringify(progress));

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

    document.getElementById('answerSection').style.display = 'none';
}

function giveUp() {
    if(confirm('Are you sure you want to give up?')) {
        answerSubmitted = true;
        stopTimer();
        streak = 0;
        localStorage.setItem('streak', '0');
        document.getElementById('streak').textContent = '0';
        
        progress[currentProblem.progressKey] = false;
        localStorage.setItem('amcProgress', JSON.stringify(progress));

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
        closeProgress();
        if(drawMode) toggleDraw();
    }
});

// Close modals on outside click
document.getElementById('settingsModal').addEventListener('click', (e) => {
    if(e.target.id === 'settingsModal') closeSettings();
});
document.getElementById('progressModal').addEventListener('click', (e) => {
    if(e.target.id === 'progressModal') closeProgress();
});
document.getElementById('testResultModal').addEventListener('click', (e) => {
    if(e.target.id === 'testResultModal') closeTestResult();
});
