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

$response = post("$url/auth/login", $loginData);
$data = json_decode($response, true);
$token = $data['token'];

echo "Login response: $response\n";

$courseData = [
    'title' => 'Test Lesson',
    'content' => 'This is a test lesson',
    'chapter_id' => 'new',
    'new_chapter_title' => 'Test Chapter',
    'subject_id' => 1,
    'series' => 'C',
    'order_index' => 1
];

$addResp = post("$url/admin/courses", $courseData, $token);
echo "Add Course Response: $addResp\n";
