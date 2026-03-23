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
    return file_get_contents($url, false, $context);
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
    return file_get_contents($url, false, $context);
}

$response = post("$url/auth/login", $loginData);
$data = json_decode($response, true);
$token = $data['token'];

echo "Testing library fetch...\n";
$fetchResp = get("$url/courses/library?series=C", $token);
echo "Fetch Library Response: $fetchResp\n";
