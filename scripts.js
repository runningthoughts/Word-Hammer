// Javascript

const startQuizButton = document.getElementById('startQuiz');
const setupDiv = document.getElementById('setup');
const quizDiv = document.getElementById('quiz');
const questionContainer = document.getElementById('question-container');

// Add the event listener
document.addEventListener('keydown', (event) => {
    if (event.key === 'Escape') {
        window.location.reload();
    }
});

const resetQuizButton = document.getElementById('resetQuiz');
resetQuizButton.addEventListener('click', () => {
    window.location.reload();
});

const nextQuestionButton = document.getElementById('nextQuestion');
nextQuestionButton.addEventListener('click', () => {
    if (document.querySelector('input:disabled')) {
        // Answer has already been submitted, just move to next question
        currentQuestionIndex++;
        showQuestion();
    } else {
        // Answer hasn't been submitted yet, check it first
        checkAnswerAndProceed();
    }
});

console.log('DOM elements initialized');

let quiz = [];
const QUESTIONS_PER_QUIZ = 20;
let currentQuestionIndex = 0;
let score = 0;
let cumulativeScore = 0;
let cumulativeQuestions = 0;
let lastTwentyAnswers = [];
let conversationHistory = [];

const totalCorrectMeterWrapper = document.getElementById('total-correct-meter-wrapper');
const trailingCorrectMeterWrapper = document.getElementById('trailing-correct-meter-wrapper');

totalCorrectMeterWrapper.style.display = 'none';
trailingCorrectMeterWrapper.style.display = 'none';

async function logUserStats() {
    try {
        // Get basic user agent info
        const userAgent = navigator.userAgent;
        
        // Get IP and location info using a free API
        const response = await fetch('https://ipapi.co/json/');
        const data = await response.json();
        
        // Send stats to our PHP endpoint
        await fetch('stats.php', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                userAgent,
                ip: data.ip,
                country: data.country_name,
                region: data.region,
                city: data.city
            })
        });
        
        console.log('Stats logged successfully');
    } catch (error) {
        console.error('Error logging stats:', error);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    logUserStats();
});

function handleEnterKey(event) {
    if (event.key === 'Enter') {
        checkAnswerAndProceed();
    }
}

function parseLLMResponse(rawResponse) {
    console.log('Parsing LLM response', rawResponse);
    try {
        // First check if rawResponse is a string containing PHP code
        if (typeof rawResponse === 'string' && rawResponse.includes('<?php')) {
            throw new Error('Received PHP code instead of JSON response');
        }

        // Try to clean the response if it contains any comments or extra text
        let cleanResponse = rawResponse;
        if (typeof rawResponse === 'string') {
            // Remove any PHP-style comments or extra text before JSON
            cleanResponse = rawResponse.replace(/^[\s\S]*?({[\s\S]*})[\s\S]*$/, '$1');
        }

        try {
            const result = JSON.parse(cleanResponse);
            if (Array.isArray(result.quiz)) return result.quiz;
            
            if (result.choices?.[0]?.message?.content) {
                const content = result.choices[0].message.content;
                
                const contentMatch = content.match(/```json\n([\s\S]*?)\n```/);
                if (contentMatch) {
                    const quizData = JSON.parse(contentMatch[1]);
                    if (Array.isArray(quizData.quiz)) return quizData.quiz;
                }
                
                const contentData = JSON.parse(content);
                if (Array.isArray(contentData.quiz)) return contentData.quiz;
            }
        } catch (e) {
            console.warn('Initial parsing attempts failed, trying alternative approaches:', e);
        }

        throw new Error('Could not find valid quiz data in response');
    } catch (error) {
        console.error('Error parsing LLM response:', error);
        throw new Error('Failed to parse quiz data: ' + error.message);
    }
}

function generateQuizPrompt(language, problemArea) {
    if (conversationHistory.length === 0) {
        conversationHistory = [{
            "role": "system",
            "content": "You are a helpful assistant specialized as a language teacher in creating language learning quizzes. Please format your response as a JSON object with a 'quiz' key containing an array of question objects. Each question object should have the following keys: 'type', 'text', 'translation', and 'correct_answer'."
        },
        {
            "role": "user",
            "content": `Create a ${QUESTIONS_PER_QUIZ}-question quiz, different than the last time, focused on the following problem area in ${language}: ${problemArea}, along with the English translation of each question. The question format should only be fill-in-the-blank.`
       }
    ];
    } else {

    conversationHistory.push({
        "role": "user",
        "content": `Create another, and different set of ${QUESTIONS_PER_QUIZ}-question quiz, different than the last time, focused on the following problem area in ${language}: ${problemArea}, along with the English translation of each question. The question format should only be fill-in-the-blank.`
    });
    }

    return conversationHistory;
}

function fetchQuizQuestions(language, problemArea) {
    console.log('Fetching quiz from backend...');
    const messages = generateQuizPrompt(language, problemArea);
    
    return fetch('samba-nova.php', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            language,
            problem_area: problemArea,
            messages
        })
    })
    .then(response => response.text())
    .then(rawResponse => {
        console.log('Received raw response from server');
        
        if (rawResponse.startsWith('ERROR:')) {
            throw new Error(rawResponse.substring(6));
        }

        // Parse the response and extract quiz data
        quiz = parseLLMResponse(rawResponse);
        
        conversationHistory.push({
            "role": "assistant",
            "content": rawResponse
        });

        console.log('Quiz loaded successfully with', quiz.length, 'questions');
        return quiz;
    });
}

startQuizButton.addEventListener('click', () => {
    console.log("Start Quiz Button Clicked");
    const language = document.getElementById('language').value.trim();
    const problemArea = document.getElementById('problem_area').value.trim();

    if (!language || !problemArea) {
        console.log('Validation failed: Missing language or problem area');
        alert('Please enter both language and problem area.');
        return;
    }

    // Add loading message
    const loadingElement = document.createElement('p');
    loadingElement.classList.add('loading-message');
    loadingElement.textContent = 'Fetching the quiz from backend...';
    document.getElementById('setup').appendChild(loadingElement);

    fetchQuizQuestions(language, problemArea)
        .then(() => {
            loadingElement.remove();
            setupDiv.classList.add('hidden');
            quizDiv.classList.remove('hidden');
            showQuestion();
        })
        .catch(error => {
            loadingElement.remove();
            console.error('Error:', error);
            alert('An error occurred: ' + error.message);
        });
});

// Add this new event listener
document.getElementById('problem_area').addEventListener('keydown', (event) => {
    if (event.key === 'Enter') {
        startQuizButton.click();
    }
});

function showQuestion() {
    // Clear previous question
    questionContainer.innerHTML = '';

    if (currentQuestionIndex >= quiz.length) {
        // Update cumulative stats before fetching new questions
        cumulativeScore += score;
        cumulativeQuestions += quiz.length;
        
        // Reset score for the new quiz block
        score = 0;
        
        const language = document.getElementById('language').value.trim();
        const problemArea = document.getElementById('problem_area').value.trim();
        
        // Show loading indicator or disable controls while fetching
        nextQuestionButton.disabled = true;
        resetQuizButton.disabled = true;
        const loadingElement = document.createElement('p');
        loadingElement.classList.add('loading-message');
        loadingElement.textContent = 'Fetching the next set of questions...';
        questionContainer.appendChild(loadingElement);
        
        fetchQuizQuestions(language, problemArea)
            .then(() => {
                // Remove the loading indicator before showing new question
                loadingElement.remove();
                currentQuestionIndex = 0;
                nextQuestionButton.disabled = false;
                resetQuizButton.disabled = false;
                showQuestion();
            })
            .catch(error => {
                console.error('Error:', error);
                alert('An error occurred: ' + error.message);
                nextQuestionButton.disabled = false;
               resetQuizButton.disabled = false;
            });
        return;
    }

    console.log(`Showing question ${currentQuestionIndex + 1} of ${quiz.length}`);

    const question = quiz[currentQuestionIndex];
    console.log('Current question:', question);

    // Create the question container
    const questionDiv = document.createElement('div');
    questionDiv.classList.add('question-container');
    
    // Create and set up question text
    const questionText = document.createElement('p');
    const parts = question.text.split(/_+/);
    
    questionText.appendChild(document.createTextNode(`Q${currentQuestionIndex + cumulativeQuestions + 1}: ${parts[0]}`));
    
    // Create and insert input field
    const input = document.createElement('input');
    input.type = 'text';
    input.id = `answer-${currentQuestionIndex + cumulativeQuestions}`; // Unique ID for each input
    input.classList.add('inline-answer');
    input.style.width = (10 * question.correct_answer.length).toString() + 'px';
    input.setAttribute('autocomplete', 'off');
 
    // Add event listener for Enter key
    input.addEventListener('keydown', handleEnterKey);
    // Add event listener for Enter key
    // input.addEventListener('keydown', (event) => {
    //     if (event.key === 'Enter') {
    //         checkAnswerAndProceed();
    //     }
    // });
    
    questionText.appendChild(input);
    
    // Add the second part of the text
    if (parts[1]) {
        questionText.appendChild(document.createTextNode(parts[1]));
    }
    
    questionDiv.appendChild(questionText);

    // Add translation
    const translationText = document.createElement('p');
    translationText.classList.add('question-translation');
    translationText.textContent = question.translation;
    questionDiv.appendChild(translationText);
     
    // Replace content
    questionContainer.innerHTML = '';
    questionContainer.appendChild(questionDiv);
    nextQuestionButton.classList.remove('hidden');
   resetQuizButton.classList.remove('hidden');
    
    // Focus the input field
    input.focus();
}

function checkAnswerAndProceed() {
    const question = quiz[currentQuestionIndex];
    const userAnswer = document.getElementById(`answer-${currentQuestionIndex + cumulativeQuestions}`).value.trim();
    
    if (!userAnswer) {
        alert('Please enter an answer.');
        return;
    }

    const isCorrect = userAnswer.toLowerCase() === question.correct_answer.toLowerCase();
    
    // Update stats
    lastTwentyAnswers.push(isCorrect);
    if (lastTwentyAnswers.length > 20) {
        lastTwentyAnswers.shift();
    }
    
    // Show feedback
    const feedbackElement = document.createElement('p');
    feedbackElement.classList.add(isCorrect ? 'correct' : 'incorrect');
    feedbackElement.textContent = isCorrect 
        ? '✓ Correct!'
        : `✗ Incorrect. The correct answer was: ${question.correct_answer}`;
    questionContainer.appendChild(feedbackElement);

    // Disable the input field to prevent additional Enter presses
    document.getElementById(`answer-${currentQuestionIndex + cumulativeQuestions}`).disabled = true;

    if (isCorrect) {
        score++;
        setTimeout(() => {
            currentQuestionIndex++;
            showQuestion();
        }, 500);
    }
    if (!isCorrect) {
        const continuePrompt = document.createElement('p');
        continuePrompt.textContent = 'Press Enter or click Continue to proceed...';
        continuePrompt.style.fontStyle = 'italic';
        questionContainer.appendChild(continuePrompt);
        
        const handleContinue = (event) => {
            if (event.key === 'Enter') {
                event.preventDefault();
                document.removeEventListener('keydown', handleContinue);
                currentQuestionIndex++;
                showQuestion();
            }
        };
        
        // Remove the input's Enter key handler
        const input = document.getElementById(`answer-${currentQuestionIndex + cumulativeQuestions}`);
        input.removeEventListener('keydown', handleEnterKey);
        
        setTimeout(() => {
            document.addEventListener('keydown', handleContinue);
        }, 100);
    }
    // } else {
    //     const continuePrompt = document.createElement('p');
    //     continuePrompt.textContent = 'Press Enter or click Continue to proceed...';
    //     continuePrompt.style.fontStyle = 'italic';
    //     questionContainer.appendChild(continuePrompt);
        
    //     // Enable the Next Question button for incorrect answers
    //     // nextQuestionButton.onclick = () => {
    //     //     currentQuestionIndex++;
    //     //     showQuestion();
    //     // };
        
    //     const handleContinue = (event) => {
    //         if (event.key === 'Enter') {
    //             event.preventDefault();
    //             document.removeEventListener('keydown', handleContinue);
    //             currentQuestionIndex++;
    //             showQuestion();
    //         }
    //     };
        
    //     setTimeout(() => {
    //         document.addEventListener('keydown', handleContinue);
    //     }, 100);
    // }

    // Update meters...
    const totalQuestionsAnswered = cumulativeQuestions + currentQuestionIndex + 1;
    const totalCorrectAnswers = cumulativeScore + score;
    const runningPercentage = (totalCorrectAnswers / totalQuestionsAnswered) * 100;
    updateQuizMeter(runningPercentage, 'total');

    // Update trailing meter if we have answers
    if (lastTwentyAnswers.length === 20) {
        console.log('lastTwentyAnswers: ', lastTwentyAnswers);
        const trailingCorrect = lastTwentyAnswers.filter(x => x).length;
        const trailingPercentage = (trailingCorrect / lastTwentyAnswers.length) * 100;
        updateQuizMeter(trailingPercentage, 'trailing');
    }

    // Show total meter after first question
    if (totalQuestionsAnswered === 1) {
        const totalCorrectMeterWrapper = document.getElementById('total-correct-meter-wrapper');
        totalCorrectMeterWrapper.style.display = 'block';     // or whatever display value you're using
        // document.querySelector('object#total-correct-meter').style.display = 'block';
    }
    
    // Show trailing meter after 20th question
    if (cumulativeQuestions + totalQuestionsAnswered === 20) {
        const trailingCorrectMeterWrapper = document.getElementById('trailing-correct-meter-wrapper');
        trailingCorrectMeterWrapper.style.display = 'block';
        // document.querySelector('object#trailing-correct-meter').style.display = 'block';
    }
}

function updateQuizMeter(percentage, suffix) {
    console.log('Updating quiz meter to', percentage + '%');
    
    // Ensure percentage is between 0 and 100
    const clampedPercentage = Math.max(0, Math.min(100, percentage));
    
    // Convert percentage to degrees
    const degrees = (clampedPercentage / 100) * 180;
    
    // Get the SVG element directly using the new IDs
    const svg = document.querySelector(`#meter-${suffix}`);
    
    if (svg) {
        // Look for the pointer element with the suffixed ID
        const pointer = svg.querySelector(`#quiz-meter-pointer-${suffix}`);
        const label = document.getElementById(`${suffix}-correct-meter-label`);
        
        if (pointer) {
            // Apply rotation transform to pointer
            pointer.setAttribute('transform', `rotate(${degrees}, 144.96, 144.82)`);
            label.textContent = `${suffix === 'total' ? 'Total Correct: ' : 'Last 20 Correct: '}${Math.round(clampedPercentage)}%`;
        } else {
            console.error(`Pointer element not found. Looking for ID: quiz-meter-pointer-${suffix}`);
            console.log('Available elements:', svg.querySelectorAll('[id]'));
        }
    } else {
        console.error(`SVG element not found. Looking for ID: meter-${suffix}`);
    }
}
