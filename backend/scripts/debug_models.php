<?php
$settingsFile = 'backend/config/settings.json';
if (!file_exists($settingsFile)) die("No settings file\n");
$settings = json_decode(file_get_contents($settingsFile), true);
$apiKey = $settings['GEMINI_API_KEY'] ?? null;
if (!$apiKey) die("No API Key in settings.json\n");

$url = 'https://generativelanguage.googleapis.com/v1beta/models?key=' . $apiKey;
$ch = curl_init($url);
curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
$response = curl_exec($ch);
$httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
if ($httpCode !== 200) {
    echo "HTTP Error $httpCode\n";
    echo $response . "\n";
    exit;
}

$data = json_decode($response, true);
if (isset($data['models'])) {
    foreach ($data['models'] as $m) {
        echo $m['name'] . "\n";
    }
} else {
    echo "No models field in response\n";
    print_r($data);
}
