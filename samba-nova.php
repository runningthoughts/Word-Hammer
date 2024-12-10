// samba-nova.php
<?php
// Clear log file on each run
if (file_exists('quiz_generator.log')) {
    file_put_contents('quiz_generator.log', '');
}

// Set CORS headers
header("Access-Control-Allow-Origin: *");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Allow-Headers: Content-Type");
header('Content-Type: text/plain'); // Changed to text/plain since we're sending raw response

// Function to log to file
function log_message($message) {
    $timestamp = date('Y-m-d H:i:s');
    error_log("[$timestamp] $message\n", 3, 'quiz_generator.log');
}

// Simplified quiz generation function
function generateQuiz($requestData) {
    log_message("Generating quiz for language: {$requestData['language']}, problem area: {$requestData['problem_area']}");
    
    $apiUrl = 'https://api.sambanova.ai/v1/chat/completions';
    $apiKey = YOUR_API_KEY;

// Add parameters for high response variability
$data = [
    "stream" => false,
    "model" => "Meta-Llama-3.1-405B-Instruct",
    "messages" => $requestData['messages'],
    "top_p" => 0.95,  // High top_p allows more diverse token selection
    "top_k" => 50,     // Higher top_k increases variety of responses
    "temperature" => 0.7  // Controls randomness of the output
];

    // Initialize cURL
    $ch = curl_init($apiUrl);
    curl_setopt_array($ch, [
        CURLOPT_HTTPHEADER => [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey,
        ],
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => json_encode($data),
        CURLOPT_RETURNTRANSFER => true
    ]);

    // Execute the request
    log_message("Sending request to Samba Nova API");
    $response = curl_exec($ch);
    
    if (curl_errno($ch)) {
        log_message("cURL Error: " . curl_error($ch));
        curl_close($ch);
        return "ERROR: " . curl_error($ch);
    }

    curl_close($ch);
    log_message("Raw response received from API");
    
    // Return raw response for JavaScript to handle
    return $response;
}

if ($_SERVER['REQUEST_METHOD'] === 'POST') {
    log_message("Received POST request");
    
    // Parse JSON input
    $requestData = json_decode(file_get_contents('php://input'), true);
    
    if (!$requestData || !isset($requestData['language']) || !isset($requestData['problem_area']) || !isset($requestData['messages'])) {
        log_message("ERROR: Invalid request data received");
        echo "ERROR: Invalid request data";
        exit;
    }

    // Log request parameters with proper formatting
    log_message("Request Parameters:");
    log_message("Language: " . $requestData['language']);
    log_message("Problem Area: " . $requestData['problem_area']);
    log_message("Messages:");
    foreach ($requestData['messages'] as $index => $message) {
        log_message("  Message " . ($index + 1) . ":");
        log_message("    Role: " . ($message['role'] ?? 'undefined'));
        log_message("    Content: " . ($message['content'] ?? 'undefined'));
    }

    echo generateQuiz($requestData);
}
?>
