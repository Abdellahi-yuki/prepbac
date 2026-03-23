<?php
$url = 'http://localhost:8000';
$loginData = ['email' => 'admin@prepbac.mr', 'password' => 'admin123'];

function post($url, $data, $token = null) {
    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n" . ($token ? "Authorization: Bearer $token\r\n" : ""),
            'method'  => 'POST',
            'content' => json_encode($data),
            'ignore_errors' => true
        ]
    ];
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    return $result;
}

function get($url, $token = null) {
    $options = [
        'http' => [
            'header'  => "Content-Type: application/json\r\n" . ($token ? "Authorization: Bearer $token\r\n" : ""),
            'method'  => 'GET',
            'ignore_errors' => true
        ]
    ];
    $context  = stream_context_create($options);
    $result = file_get_contents($url, false, $context);
    return $result;
}

echo "Testing login...\n";
$response = post("$url/auth/login", $loginData);
echo "Login Response: $response\n";

$data = json_decode($response, true);
if (isset($data['token'])) {
    $token = $data['token'];
    echo "Testing stats...\n";
    $response = get("$url/admin/stats", $token);
    echo "Stats Response: $response\n";
} else {
    echo "Failed to get token\n";
}
