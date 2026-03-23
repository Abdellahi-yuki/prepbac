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

echo "Fetching subjects...\n";
$subs = get("$url/courses/subjects", $token);
echo $subs . "\n";

$chapterId = 1; // Assuming we seeded Math -> Chapter 1

echo "Testing course creation...\n";
$courseData = [
    'title' => 'Test Course Admin',
    'content' => '<h1>Bonjour!</h1><p>Ceci est un test</p>',
    'video_url' => 'https://youtube.com',
    'chapter_id' => $chapterId,
    'order_index' => 1
];
$addResp = post("$url/admin/courses", $courseData, $token);
echo "Add Course Response: $addResp\n";

echo "Testing courses fetch...\n";
$fetchResp = get("$url/admin/courses", $token);
echo "Fetch Courses Response: $fetchResp\n";
