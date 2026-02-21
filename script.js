let activeQuestions = [];
let allQuestions = [];
let currentIndex = 0;
let timerInterval;
let customTimeLimit = 60; 
let playerName = "Quiz";
let currentScore = 0;
let currentStreak = 0;
let wrongAnswers = [];
let totalQuestions = 30;
let availableCategories = [];
let selectedCategories = [];
let availableFiles = [];

// ===== AUTO-SPEAK MODE =====
let isAutoSpeakMode = false;
let autoSubmitTimeout = null;   // 3-sec countdown after speech captured
let autoNextTimeout = null;     // 10-sec countdown after answer shown
let autoSubmitCountdownInterval = null; // For visual countdown

// ===== SPEECH RECOGNITION SETUP =====
let recognition = null;
let isListening = false;
const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;

function initSpeechRecognition() {
    if (!SpeechRecognition) {
        const micBtn = document.getElementById('micBtn');
        if (micBtn) {
            micBtn.disabled = true;
            micBtn.title = 'Speech recognition not supported in this browser';
            micBtn.insertAdjacentHTML('afterend', '<div class="mic-not-supported">⚠️ Use Chrome for voice input</div>');
        }
        return;
    }

    recognition = new SpeechRecognition();
    recognition.lang = 'en-US';
    recognition.continuous = false;
    recognition.interimResults = true;

    recognition.onstart = () => {
        isListening = true;
        const micBtn = document.getElementById('micBtn');
        const status = document.getElementById('speechStatus');
        micBtn.classList.add('listening');
        micBtn.title = 'Click to stop';
        const micIcon  = document.getElementById('micIcon');
        const stopIcon = document.getElementById('micStopIcon');
        if (micIcon)  micIcon.style.display  = 'none';
        if (stopIcon) stopIcon.style.display = 'block';
        status.textContent = '🎙️ Listening… speak your translation';
        status.className = 'speech-status visible';

        // Cancel any pending auto-submit when user starts speaking again
        if (autoSubmitTimeout) {
            clearTimeout(autoSubmitTimeout);
            autoSubmitTimeout = null;
        }
        if (autoSubmitCountdownInterval) {
            clearInterval(autoSubmitCountdownInterval);
            autoSubmitCountdownInterval = null;
        }
    };

    recognition.onresult = (event) => {
        const input = document.getElementById('userAnswer');
        const status = document.getElementById('speechStatus');
        let interimText = '';
        let finalText = '';

        for (let i = event.resultIndex; i < event.results.length; i++) {
            const transcript = event.results[i][0].transcript;
            if (event.results[i].isFinal) {
                finalText += transcript;
            } else {
                interimText += transcript;
            }
        }

        if (finalText) {
            input.value = finalText.trim();
            status.textContent = '✅ Got it! Press Check or speak again.';
        } else if (interimText) {
            input.value = interimText;
            status.textContent = '🎙️…' + interimText;
        }
    };

    recognition.onerror = (event) => {
        const status = document.getElementById('speechStatus');
        let msg = '⚠️ Error: ';
        if (event.error === 'no-speech') {
            msg += 'No speech detected. Try again.';
            // In auto-speak mode, retry mic after no-speech
            if (isAutoSpeakMode && !inputEl.disabled && checkBtn.style.display === "block") {
                setTimeout(() => {
                    if (isAutoSpeakMode && !inputEl.disabled) {
                        try { recognition.start(); } catch(e) {}
                    }
                }, 800);
            }
        }
        else if (event.error === 'not-allowed') msg += 'Microphone blocked. Allow mic access.';
        else if (event.error === 'network') msg += 'Network error. Check connection.';
        else msg += event.error;
        status.textContent = msg;
        status.className = 'speech-status visible error';
        resetMicButton();
    };

    recognition.onend = () => {
        resetMicButton();
        const input = document.getElementById('userAnswer');
        const status = document.getElementById('speechStatus');

        if (input.value.trim()) {
            // We have text — in auto-speak mode, start 3-second countdown to auto-submit
            if (isAutoSpeakMode && !inputEl.disabled && checkBtn.style.display === "block") {
                startAutoSubmitCountdown(input.value.trim(), status);
            } else {
                status.textContent = '✅ Got it! Now Check Answer';
                status.className = 'speech-status visible';
            }
        } else if (isAutoSpeakMode && !inputEl.disabled && checkBtn.style.display === "block") {
            // No text yet — restart mic in auto-speak mode
            setTimeout(() => {
                if (isAutoSpeakMode && !inputEl.disabled) {
                    try { recognition.start(); } catch(e) {}
                }
            }, 400);
        }
    };
}

// ===== AUTO-SUBMIT COUNTDOWN (3 seconds) =====
function startAutoSubmitCountdown(capturedText, statusEl) {
    // Cancel any existing countdown
    if (autoSubmitTimeout) clearTimeout(autoSubmitTimeout);
    if (autoSubmitCountdownInterval) clearInterval(autoSubmitCountdownInterval);

    let secondsLeft = 3;
    statusEl.textContent = `⏳ Auto-submitting in ${secondsLeft}s… speak again to cancel`;
    statusEl.className = 'speech-status visible auto-countdown';

    autoSubmitCountdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0) {
            statusEl.textContent = `⏳ Auto-submitting in ${secondsLeft}s… speak again to cancel`;
        } else {
            clearInterval(autoSubmitCountdownInterval);
            autoSubmitCountdownInterval = null;
        }
    }, 1000);

    autoSubmitTimeout = setTimeout(() => {
        autoSubmitTimeout = null;
        if (autoSubmitCountdownInterval) {
            clearInterval(autoSubmitCountdownInterval);
            autoSubmitCountdownInterval = null;
        }
        // Only auto-submit if still in question phase (not already submitted)
        if (!inputEl.disabled && checkBtn.style.display === "block") {
            checkAnswer();
        }
    }, 3000);
}

// ===== AUTO-NEXT COUNTDOWN (10 seconds after answer shown) =====
function startAutoNextCountdown() {
    if (!isAutoSpeakMode) return;
    if (autoNextTimeout) clearTimeout(autoNextTimeout);

    let secondsLeft = 10;
    // Update the next button to show countdown
    nextBtn.textContent = `Next (${secondsLeft}s) →`;

    const countdownInterval = setInterval(() => {
        secondsLeft--;
        if (secondsLeft > 0 && nextBtn.style.display === "block") {
            nextBtn.textContent = `Next (${secondsLeft}s) →`;
        } else {
            clearInterval(countdownInterval);
            if (secondsLeft <= 0) nextBtn.textContent = 'Next Question (Space)';
        }
    }, 1000);

    autoNextTimeout = setTimeout(() => {
        autoNextTimeout = null;
        clearInterval(countdownInterval);
        if (nextBtn.style.display === "block") {
            nextBtn.textContent = 'Next Question (Space)';
            nextQuestion();
        }
    }, 10000);
}

function cancelAutoNext() {
    if (autoNextTimeout) {
        clearTimeout(autoNextTimeout);
        autoNextTimeout = null;
        nextBtn.textContent = 'Next Question (Space)';
    }
}

function toggleSpeech() {
    if (!recognition) return;
    const input = document.getElementById('userAnswer');

    // Cancel auto-submit if user manually toggles mic
    if (autoSubmitTimeout) {
        clearTimeout(autoSubmitTimeout);
        autoSubmitTimeout = null;
    }
    if (autoSubmitCountdownInterval) {
        clearInterval(autoSubmitCountdownInterval);
        autoSubmitCountdownInterval = null;
    }

    if (isListening) {
        recognition.stop();
    } else {
        if (input.disabled) return;
        input.value = '';
        try {
            recognition.start();
        } catch(e) {
            console.warn('Recognition already started', e);
        }
    }
}

function resetMicButton() {
    isListening = false;
    const micBtn = document.getElementById('micBtn');
    if (micBtn) {
        micBtn.classList.remove('listening');
        micBtn.title = 'Press M to speak';
        const micIcon  = document.getElementById('micIcon');
        const stopIcon = document.getElementById('micStopIcon');
        if (micIcon)  micIcon.style.display  = 'block';
        if (stopIcon) stopIcon.style.display = 'none';
    }
}

function stopSpeechIfListening() {
    if (isListening && recognition) {
        recognition.stop();
    }
    // Also cancel any pending auto-submit
    if (autoSubmitTimeout) {
        clearTimeout(autoSubmitTimeout);
        autoSubmitTimeout = null;
    }
    if (autoSubmitCountdownInterval) {
        clearInterval(autoSubmitCountdownInterval);
        autoSubmitCountdownInterval = null;
    }
}

function speakHindi(text) {
    if (!window.speechSynthesis || !isSpeakerEnabled) return;
    window.speechSynthesis.cancel();

    function doSpeak() {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'hi-IN';
        utterance.rate = 0.85;
        utterance.pitch = 1;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const hindiVoice = voices.find(v => v.lang === 'hi-IN' || v.lang.startsWith('hi'));
        if (hindiVoice) utterance.voice = hindiVoice;
        window.speechSynthesis.speak(utterance);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) {
        doSpeak();
    } else {
        window.speechSynthesis.onvoiceschanged = () => {
            window.speechSynthesis.onvoiceschanged = null;
            doSpeak();
        };
    }
}

function speakEnglish(text) {
    if (!window.speechSynthesis) return;
    window.speechSynthesis.cancel();

    function doSpeak() {
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = 'en-IN';
        utterance.rate = 0.82;
        utterance.pitch = 1.05;
        utterance.volume = 1;
        const voices = window.speechSynthesis.getVoices();
        const preferred = [
            v => v.name === 'Google हिन्दी',
            v => v.name.includes('Ravi'),
            v => v.name.includes('Heera'),
            v => v.lang === 'en-IN',
            v => v.name === 'Google UK English Female',
            v => v.name === 'Google US English',
            v => v.name.includes('Microsoft') && v.lang.startsWith('en'),
            v => v.lang.startsWith('en'),
        ];
        let picked = null;
        for (const matcher of preferred) {
            picked = voices.find(matcher);
            if (picked) break;
        }
        if (picked) utterance.voice = picked;
        window.speechSynthesis.speak(utterance);
    }

    const voices = window.speechSynthesis.getVoices();
    if (voices.length > 0) doSpeak();
    else { window.speechSynthesis.onvoiceschanged = () => { window.speechSynthesis.onvoiceschanged = null; doSpeak(); }; }
}

// Common JSON files to auto-detect
const jsonFilesToCheck = [
    'tense.json',
    'tenses.json',
    'practice.json',
    'upsc.json',
    'vocabulary.json',
    'grammar.json',
    'verbs.json',
    'quiz.json',
    'questions.json',
    'test.json',
    'exam.json',
    'hindi.json',
    'english.json',
    'translation.json',
    'words.json',
    'phrases.json',
    'sentences.json'
];

const setupContainer = document.getElementById("setupContainer");
const quizContainer = document.getElementById("quizContainer");

const questionEl = document.getElementById("question");
const hintTextEl = document.getElementById("hintText");
const inputEl = document.getElementById("userAnswer");
const feedbackEl = document.getElementById("feedback");
const progressTextEl = document.getElementById("progress-text");
const progressBarEl = document.getElementById("progressBar");
const checkBtn = document.getElementById("checkBtn");
const nextBtn = document.getElementById("nextBtn");

const reviewBtn = document.getElementById("reviewBtn");
const retryBtn = document.getElementById("retryBtn");
const restartBtn = document.getElementById("restartBtn");

const timerDisplayEl = document.getElementById("timerDisplay");
const scoreDisplayEl = document.getElementById("scoreDisplay");
const streakDisplayEl = document.getElementById("streakDisplay");
const reviewSection = document.getElementById("reviewSection");
const reviewList = document.getElementById("reviewList");
const mainTitle = document.getElementById("mainTitle");
const hintBtn = document.getElementById("hintBtn");

function shuffleArray(array) {
    const shuffled = [...array];
    for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return shuffled;
}

// ===== PILL SELECTOR =====
function setPill(btn, inputId, groupId, val) {
    document.getElementById(inputId).value = val;
    document.querySelectorAll(`#${groupId} .pill`).forEach(p => p.classList.remove('active'));
    btn.classList.add('active');
}
function clearPills(groupId) {
    document.querySelectorAll(`#${groupId} .pill`).forEach(p => p.classList.remove('active'));
}

function toggleTheme() {
    document.body.classList.toggle('light-theme');
    const isLight = document.body.classList.contains('light-theme');
    document.getElementById('iconMoon').style.display = isLight ? 'none' : 'block';
    document.getElementById('iconSun').style.display  = isLight ? 'block' : 'none';
    localStorage.setItem('theme', isLight ? 'light' : 'dark');
}

// Speaker toggle for Hindi audio
let isSpeakerEnabled = true;

function toggleSpeaker() {
    isSpeakerEnabled = !isSpeakerEnabled;
    const speakerBtn = document.getElementById('speakerToggleBtn');
    const iconSpeaker = document.getElementById('iconSpeaker');
    const iconMuted = document.getElementById('iconMuted');
    
    if (isSpeakerEnabled) {
        speakerBtn.classList.remove('muted');
        iconSpeaker.style.display = 'block';
        iconMuted.style.display = 'none';
        if (quizContainer.style.display === 'block' && activeQuestions[currentIndex]) {
            speakHindi(activeQuestions[currentIndex].hindi);
        }
    } else {
        speakerBtn.classList.add('muted');
        iconSpeaker.style.display = 'none';
        iconMuted.style.display = 'block';
        if (window.speechSynthesis) {
            window.speechSynthesis.cancel();
        }
    }
    
    localStorage.setItem('speakerEnabled', isSpeakerEnabled);
}

// ===== AUTO-SPEAK MODE TOGGLE =====
function toggleAutoSpeak() {
    isAutoSpeakMode = !isAutoSpeakMode;
    const autoSpeakBtn = document.getElementById('autoSpeakToggleBtn');
    const iconAutoSpeak = document.getElementById('iconAutoSpeak');
    const iconAutoSpeakOff = document.getElementById('iconAutoSpeakOff');
    const autoSpeakLabel = document.getElementById('autoSpeakLabel');
    
    if (isAutoSpeakMode) {
        autoSpeakBtn.classList.add('active');
        autoSpeakBtn.title = 'ON';
        iconAutoSpeakOff.style.display = 'none';
        iconAutoSpeak.style.display = 'block';
        

        if (quizContainer.style.display === 'block' && !inputEl.disabled && checkBtn.style.display === "block") {
            if (!isListening && recognition) {
                setTimeout(() => {
                    try { recognition.start(); } catch(e) {}
                }, 500);
            }
        }
    } else {
        autoSpeakBtn.classList.remove('active');
        autoSpeakBtn.title = 'OFF';
        iconAutoSpeakOff.style.display = 'block';
        iconAutoSpeak.style.display = 'none';
        if (autoSpeakLabel) autoSpeakLabel.textContent = '';


        // Cancel all pending auto-actions
        if (autoSubmitTimeout) { clearTimeout(autoSubmitTimeout); autoSubmitTimeout = null; }
        if (autoSubmitCountdownInterval) { clearInterval(autoSubmitCountdownInterval); autoSubmitCountdownInterval = null; }
        cancelAutoNext();

        // Update status
        const status = document.getElementById('speechStatus');
        if (status) { status.textContent = ''; status.className = 'speech-status'; }
    }
    
    localStorage.setItem('autoSpeakMode', isAutoSpeakMode);
}



window.addEventListener('DOMContentLoaded', () => {
    const savedTheme = localStorage.getItem('theme');
    if (savedTheme === 'light') {
        document.body.classList.add('light-theme');
        document.getElementById('iconMoon').style.display = 'none';
        document.getElementById('iconSun').style.display  = 'block';
    }
    
    // Load speaker preference
    const savedSpeaker = localStorage.getItem('speakerEnabled');
    if (savedSpeaker === 'false') {
        isSpeakerEnabled = false;
        document.getElementById('speakerToggleBtn').classList.add('muted');
        document.getElementById('iconSpeaker').style.display = 'none';
        document.getElementById('iconMuted').style.display = 'block';
    }
    
    // Load auto-speak preference
    const savedAutoSpeak = localStorage.getItem('autoSpeakMode');
    if (savedAutoSpeak === 'true') {
        isAutoSpeakMode = true;
        const autoSpeakBtn = document.getElementById('autoSpeakToggleBtn');
        autoSpeakBtn.classList.add('active');
        document.getElementById('iconAutoSpeakOff').style.display = 'none';
        document.getElementById('iconAutoSpeak').style.display = 'block';
    } else {
        document.getElementById('iconAutoSpeakOff').style.display = 'block';
        document.getElementById('iconAutoSpeak').style.display = 'none';
    }
    
    detectJsonFiles();
    initSpeechRecognition();
});

async function detectJsonFiles() {
    const fileSelect = document.getElementById("fileSelect");
    fileSelect.innerHTML = '<option value="">Loading files...</option>';
    availableFiles = [];
    
    for (const filename of jsonFilesToCheck) {
        try {
            const response = await fetch(filename, { method: 'HEAD' });
            if (response.ok) availableFiles.push(filename);
        } catch (error) {}
    }
    
    if (availableFiles.length > 0) {
        fileSelect.innerHTML = availableFiles.map(file => {
            const displayName = file.replace('.json', '').replace(/[-_]/g, ' ');
            const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
            return `<option value="${file}">${capitalizedName}</option>`;
        }).join('');
        fileSelect.innerHTML += '<option value="__custom__">📁 Load Custom File...</option>';
        loadCategories();
    } else {
        fileSelect.innerHTML = '<option value="">No JSON files found</option>';
        fileSelect.innerHTML += '<option value="__custom__">📁 Load Custom File...</option>';
    }
}

async function loadCustomFile() {
    const customFileName = prompt('Enter the JSON filename (e.g., myfile.json):');
    if (!customFileName) return;
    
    const fileName = customFileName.endsWith('.json') ? customFileName : customFileName + '.json';
    
    try {
        const response = await fetch(fileName, { method: 'HEAD' });
        if (response.ok) {
            if (!availableFiles.includes(fileName)) {
                availableFiles.push(fileName);
                const fileSelect = document.getElementById("fileSelect");
                fileSelect.innerHTML = availableFiles.map(file => {
                    const displayName = file.replace('.json', '').replace(/[-_]/g, ' ');
                    const capitalizedName = displayName.charAt(0).toUpperCase() + displayName.slice(1);
                    return `<option value="${file}">${capitalizedName}</option>`;
                }).join('');
                fileSelect.innerHTML += '<option value="__custom__">📁 Load Custom File...</option>';
                fileSelect.value = fileName;
                loadCategories();
            } else {
                fileSelect.value = fileName;
                loadCategories();
            }
        } else {
            alert(`File "${fileName}" not found. Make sure it's in the same folder as index.html`);
        }
    } catch (error) {
        alert(`Error loading "${fileName}". Make sure:\n1. File exists in the root folder\n2. You're using Live Server (not opening HTML directly)`);
    }
}

async function loadCategories() {
    const selectedFile = document.getElementById("fileSelect").value;
    const categorySection = document.getElementById("categorySection");
    const categoryCheckboxes = document.getElementById("categoryCheckboxes");
    
    if (selectedFile === '__custom__') {
        loadCustomFile();
        return;
    }
    
    if (!selectedFile) { categorySection.style.display = "none"; return; }
    
    try {
        const response = await fetch(selectedFile);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        
        const categoriesSet = new Set();
        data.forEach(item => { if (item.categories) categoriesSet.add(item.categories); });
        availableCategories = Array.from(categoriesSet).sort();
        
        if (availableCategories.length > 0) {
            categorySection.style.display = "block";
            categoryCheckboxes.innerHTML = availableCategories.map((cat, index) => `
                <div class="cat-chip selected" id="chip-${index}" onclick="toggleChip(${index})">
                    <span class="chip-dot"></span>
                    <span>${cat}</span>
                </div>
            `).join('');
            selectedCategories = [...availableCategories];
        } else {
            categorySection.style.display = "none";
        }
    } catch (error) {
        categorySection.style.display = "none";
    }
}

function updateSelectedCategories() {
    selectedCategories = [];
    availableCategories.forEach((cat, index) => {
        const chip = document.getElementById(`chip-${index}`);
        if (chip && chip.classList.contains('selected')) selectedCategories.push(cat);
    });
}

function toggleChip(index) {
    const chip = document.getElementById(`chip-${index}`);
    if (!chip) return;
    chip.classList.toggle('selected');
    updateSelectedCategories();
    syncAllBtn();
}

function syncAllBtn() {
    const allSelected = selectedCategories.length === availableCategories.length;
    const btn = document.getElementById('selectAllBtn');
    if (btn) btn.innerHTML = `<span id="selectAllIcon">${allSelected ? '☑' : '☐'}</span> All`;
}

function toggleAllCategories() {
    const allChecked = selectedCategories.length === availableCategories.length;
    availableCategories.forEach((cat, index) => {
        const chip = document.getElementById(`chip-${index}`);
        if (chip) chip.classList.toggle('selected', !allChecked);
    });
    updateSelectedCategories();
    syncAllBtn();
}

function showCategoryHint() {
    const currentData = activeQuestions[currentIndex];
    if (currentData.categories) {
        hintBtn.innerHTML = `📚 ${currentData.categories}`;
        hintBtn.disabled = true;
        hintBtn.style.opacity = '1';
        hintBtn.style.cursor = 'default';
    }
}

function normalizeText(text) {
    return text.toLowerCase().replace(/[.,?!'"]/g, '').replace(/\b(a|an|the)\b/g, '').replace(/\s+/g, ' ').trim();
}

async function initializeQuiz() {
    const timeVal = parseInt(document.getElementById("timerInput").value);
    if (timeVal && timeVal >= 5) customTimeLimit = timeVal;
    
    const questionCount = parseInt(document.getElementById("questionCountInput").value);
    if (questionCount && questionCount >= 5) totalQuestions = questionCount;
    
    const selectedFile = document.getElementById("fileSelect").value;
    updateSelectedCategories();
    
    try {
        const response = await fetch(selectedFile);
        if (!response.ok) throw new Error("File not found");
        const data = await response.json();
        
        if (data && data.length > 0) {
            allQuestions = data;
            let filteredQuestions = allQuestions;
            
            if (selectedCategories.length > 0 && selectedCategories.length < availableCategories.length) {
                filteredQuestions = allQuestions.filter(q => q.categories && selectedCategories.includes(q.categories));
            }
            
            if (filteredQuestions.length === 0) {
                alert("No questions found for selected categories.");
                return;
            }
            
            const shuffled = shuffleArray(filteredQuestions);
            activeQuestions = shuffled.slice(0, Math.min(totalQuestions, shuffled.length));
            
            setupContainer.style.display = "none";
            quizContainer.style.display = "block";
            mainTitle.innerText = `${playerName}'s Quiz`;
            resetGameState();
            loadQuestion();
        } else {
            alert(`No questions found in ${selectedFile}.`);
        }
    } catch (error) {
        alert(`Error loading ${selectedFile}. \n\nIMPORTANT: Open this folder using VS Code with Live Server extension.`);
    }
}

function updateTimerUI(seconds, isReview = false) {
    timerDisplayEl.querySelector('span:last-child').innerText = `${seconds}s`;
    if (!isReview && seconds <= 20) timerDisplayEl.classList.add('warning');
    else timerDisplayEl.classList.remove('warning');
}

function startInputTimer() {
    clearInterval(timerInterval);
    let timeLeft = customTimeLimit;
    updateTimerUI(timeLeft, false);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI(timeLeft, false);
        if (timeLeft <= 0) { clearInterval(timerInterval); checkAnswer(); }
    }, 1000);
}

function startReviewTimer() {
    clearInterval(timerInterval);
    // In auto-speak mode, the auto-next countdown handles timing (10s)
    // Regular timer still runs for visual display but auto-next drives navigation
    let timeLeft = isAutoSpeakMode ? 10 : 30;
    updateTimerUI(timeLeft, true);
    timerInterval = setInterval(() => {
        timeLeft--;
        updateTimerUI(timeLeft, true);
        if (timeLeft <= 0) {
            clearInterval(timerInterval);
            // Only auto-advance here if NOT in auto-speak mode (auto-speak has its own timeout)
            if (!isAutoSpeakMode) nextQuestion();
        }
    }, 1000);
}

function speakCurrentHindi() {
    if (activeQuestions[currentIndex]) {
        speakHindi(activeQuestions[currentIndex].hindi);
    }
}

function loadQuestion() {
    // Cancel any pending auto-actions from previous question
    cancelAutoNext();
    if (autoSubmitTimeout) { clearTimeout(autoSubmitTimeout); autoSubmitTimeout = null; }
    if (autoSubmitCountdownInterval) { clearInterval(autoSubmitCountdownInterval); autoSubmitCountdownInterval = null; }

    stopSpeechIfListening();
    window.speechSynthesis && window.speechSynthesis.cancel();

    questionEl.style.animation = 'none';
    questionEl.offsetHeight;
    questionEl.style.animation = null;

    let currentData = activeQuestions[currentIndex];
    questionEl.innerText = currentData.hindi;
    hintTextEl.innerText = currentData.hints ? `💡 Hint: ${currentData.hints}` : "";

    speakHindi(currentData.hindi);
    
    hintBtn.innerHTML = '💡 Show Category';
    hintBtn.disabled = false;
    hintBtn.style.opacity = '1';
    hintBtn.style.cursor = 'pointer';
    
    inputEl.value = "";
    inputEl.disabled = false;
    
    feedbackEl.style.display = "none";
    feedbackEl.className = "";

    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speechStatus');
    document.querySelector('.input-wrapper').style.display = 'flex';
    if (micBtn) { micBtn.style.display = 'flex'; micBtn.disabled = false; }
    if (speechStatus) { speechStatus.textContent = ''; speechStatus.className = 'speech-status'; }
    
    checkBtn.style.display = "block";
    nextBtn.style.display = "none";
    nextBtn.textContent = 'Next Question (Space)';
    hintBtn.style.display = "inline-block";
    
    progressTextEl.innerText = `Question ${currentIndex + 1} / ${activeQuestions.length}`;
    progressBarEl.style.width = `${((currentIndex) / activeQuestions.length) * 100}%`;
    scoreDisplayEl.querySelector('span:last-child').innerText = `Score: ${currentScore}`;
    
    // *** CRITICAL: Do NOT auto-focus input on mobile (prevents keyboard popup) ***
    // Only focus on desktop (non-touch devices)
   const isTouchDevice = ('ontouchstart' in window) || (navigator.maxTouchPoints > 0);

// ❌ Do NOT focus if hands-free mode is ON
if (!isTouchDevice && !isAutoSpeakMode) {
    inputEl.focus();
}
    startInputTimer();

    // In auto-speak mode, auto-open mic after a short delay
    // (delay allows Hindi TTS to start first)
    if (isAutoSpeakMode && recognition) {
        const hindiDuration = currentData.hindi ? Math.max(1200, currentData.hindi.length * 80) : 1500;
        setTimeout(() => {
            // Only open mic if still on input phase
            if (!inputEl.disabled && checkBtn.style.display === "block" && !isListening) {
                try {
                    recognition.start();
                } catch(e) {
                    console.warn('Could not start recognition', e);
                }
            }
        }, Math.min(hindiDuration, 2500));
    }
}

function checkAnswer() {
    stopSpeechIfListening();
    clearInterval(timerInterval);

    // Cancel any pending auto-submit
    if (autoSubmitTimeout) { clearTimeout(autoSubmitTimeout); autoSubmitTimeout = null; }
    if (autoSubmitCountdownInterval) { clearInterval(autoSubmitCountdownInterval); autoSubmitCountdownInterval = null; }

    inputEl.disabled = true;

    const micBtn = document.getElementById('micBtn');
    if (micBtn) micBtn.disabled = true;

    const rawUserAnswer = inputEl.value;
    const rawCorrectAnswer = activeQuestions[currentIndex].english;
    const category = activeQuestions[currentIndex].categories || "N/A";
    
    const cleanUserAnswer = normalizeText(rawUserAnswer);
    const cleanCorrectAnswer = normalizeText(rawCorrectAnswer);
    let isCorrect = (cleanUserAnswer === cleanCorrectAnswer);

    feedbackEl.style.display = "block";
    
    if (isCorrect) {
        currentScore++;
        currentStreak++;
        scoreDisplayEl.querySelector('span:last-child').innerText = `Score: ${currentScore}`;
        feedbackEl.className = "correct-box";
        feedbackEl.innerHTML = `
            <em>${rawUserAnswer}</em><br>
            <div class="feedback-category">
                📚 Category: <strong>${category}</strong>
            </div>
        `;
        if (currentStreak > 1) {
            streakDisplayEl.style.display = "flex";
            streakDisplayEl.querySelector('span:last-child').innerText = `Streak: ${currentStreak}`;
        }
    } else {
        currentStreak = 0;
        streakDisplayEl.style.display = "none";
        wrongAnswers.push({ 
            hindi: activeQuestions[currentIndex].hindi, 
            english: rawCorrectAnswer,
            hints: activeQuestions[currentIndex].hints,
            categories: category
        });
        feedbackEl.className = "wrong-box";
        feedbackEl.innerHTML = `
            <em class="user-wrong-answer">${rawUserAnswer || "(Blank)"}</em>
            <div class="actual-answer">${rawCorrectAnswer}</div>
            <div class="feedback-category">
                ${category}
            </div>
        `;
    }
    
    checkBtn.style.display = "none";
    nextBtn.style.display = "block";
    hintBtn.style.display = "none";

    // Hide input row + mic + speech status when answer is revealed
    document.querySelector('.input-wrapper').style.display = 'none';
    const speechStatus = document.getElementById('speechStatus');
    if (speechStatus) speechStatus.className = 'speech-status';

    startReviewTimer();

    // In auto-speak mode, start 10-second auto-next countdown
    if (isAutoSpeakMode) {
        startAutoNextCountdown();
    }
}

function nextQuestion() {
    cancelAutoNext();
    clearInterval(timerInterval);
    currentIndex++;
    if (currentIndex < activeQuestions.length) loadQuestion();
    else showEndScreen();
}

function showEndScreen() {
    stopSpeechIfListening();
    cancelAutoNext();
    if (autoSubmitTimeout) { clearTimeout(autoSubmitTimeout); autoSubmitTimeout = null; }
    if (autoSubmitCountdownInterval) { clearInterval(autoSubmitCountdownInterval); autoSubmitCountdownInterval = null; }

    progressBarEl.style.width = "100%";
    mainTitle.innerText = "Quiz Complete! 🎉";
    questionEl.innerText = `You scored ${currentScore} out of ${activeQuestions.length}!`;
    
    hintTextEl.style.display = "none";
    timerDisplayEl.style.display = "none";
    inputEl.style.display = "none";
    checkBtn.style.display = "none";
    nextBtn.style.display = "none";
    hintBtn.style.display = "none";
    feedbackEl.style.display = "none";
    streakDisplayEl.style.display = "none";
    progressTextEl.innerText = "All Done!";
    scoreDisplayEl.querySelector('span:last-child').innerText = `Final: ${currentScore}/${activeQuestions.length}`;

    const micBtn = document.getElementById('micBtn');
    const speechStatus = document.getElementById('speechStatus');
    if (micBtn) micBtn.style.display = 'none';
    if (speechStatus) speechStatus.className = 'speech-status';

    if (wrongAnswers.length > 0) {
        reviewBtn.style.display = "inline-block";
        retryBtn.style.display = "none";
        restartBtn.style.display = "none";
    } else {
        questionEl.innerText += "\nFlawless victory! You got everything right! 🏆";
        restartBtn.style.display = "inline-block";
    }
}

function showReviewScreen() {
    questionEl.style.display = "none";
    reviewBtn.style.display = "none";
    reviewList.innerHTML = wrongAnswers.map(item => `
        <div class="review-item">
            ${item.hindi} - <strong>${item.english}</strong>
            ${item.categories ? `<br><small class="review-category">📚 ${item.categories}</small>` : ''}
        </div>
    `).join('');
    reviewSection.style.display = "block";
    retryBtn.style.display = "inline-block";
    restartBtn.style.display = "inline-block";
}

function resetGameState() {
    currentIndex = 0;
    currentScore = 0;
    currentStreak = 0;
    wrongAnswers = [];
    
    mainTitle.innerText = `Translation`;
    questionEl.style.display = "block";
    hintTextEl.style.display = "block";
    timerDisplayEl.style.display = "inline-block";
    inputEl.style.display = "block";
    reviewSection.style.display = "none";
    reviewBtn.style.display = "none";
    retryBtn.style.display = "none";
    restartBtn.style.display = "none";
    streakDisplayEl.style.display = "none";

    const micBtn = document.getElementById('micBtn');
    if (micBtn) { micBtn.style.display = 'flex'; micBtn.disabled = false; }
    resetMicButton();
}

function retryMistakes() {
    activeQuestions = wrongAnswers.map(item => ({ 
        hindi: item.hindi, 
        english: item.english, 
        hints: item.hints,
        categories: item.categories
    }));
    resetGameState();
    mainTitle.innerText = "Retry Mistakes";
    loadQuestion();
}

function returnToSetup() { window.location.reload(); }

document.addEventListener("keydown", function(event) {
    if (event.key === "Enter") {
        if (setupContainer.style.display !== "none") {
            event.preventDefault();
            initializeQuiz();
        } else if (!inputEl.disabled && checkBtn.style.display === "block") {
            event.preventDefault();
            // Cancel auto-submit if manually pressing Enter
            if (autoSubmitTimeout) { clearTimeout(autoSubmitTimeout); autoSubmitTimeout = null; }
            if (autoSubmitCountdownInterval) { clearInterval(autoSubmitCountdownInterval); autoSubmitCountdownInterval = null; }
            checkAnswer();
        }
    }
    if (event.code === "Space" && nextBtn.style.display === "block") {
        event.preventDefault();
        cancelAutoNext();
        nextQuestion();
    }
    if (event.key === 'ArrowDown') {
        if (!inputEl.disabled && checkBtn.style.display === "block") {
            toggleSpeech();
        }
    }
    if (event.key === 'ArrowUp') {
        event.preventDefault();
        toggleSpeaker();
    }
});

// Clicking "Next" manually should cancel auto-next countdown
nextBtn && nextBtn.addEventListener('click', () => {
    cancelAutoNext();
});