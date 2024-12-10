<?php
// log.php
// Get the raw POST data
$rawData = file_get_contents("php://input");

// Decode the JSON data
$data = json_decode($rawData, true);

if ($data) {
    $userAgent = $data['userAgent'] ?? 'Unknown';
    $ip = $data['ip'] ?? 'Unknown';
    $country = $data['country'] ?? 'Unknown';
    $region = $data['region'] ?? 'Unknown';
    $city = $data['city'] ?? 'Unknown';

    // Create a timestamp
    $timestamp = date("Y-m-d H:i:s");

    // Prepare the log entry
    $logEntry = "*************\nTimestamp: $timestamp\nUser Agent: $userAgent\nIP Address: $ip\nCountry: $country\nRegion: $region\nCity: $city\n\n";

    // Append the data to log.txt
    file_put_contents('stats.txt', $logEntry, FILE_APPEND);

    echo "Data logged successfully";
} else {
    echo "Failed to log data";
}
?>
