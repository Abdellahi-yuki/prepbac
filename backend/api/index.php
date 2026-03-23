<?php
// backend/api/index.php

// Override PHP limits for large PDF uploads (AI conversion tool)
@ini_set('upload_max_filesize', '200M');
@ini_set('post_max_size', '210M');
@ini_set('memory_limit', '512M');
@ini_set('max_execution_time', '600');

// ── Dynamic CORS (allow any localhost port for development) ──
$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$allowed = false;

// Allow any localhost / 127.0.0.1 port (dev) or the configured production origin
if (preg_match('/^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/', $origin)) {
    $allowed = true;
} elseif (defined('CORS_ALLOWED_ORIGIN') && $origin === CORS_ALLOWED_ORIGIN) {
    $allowed = true;
}

if ($allowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
} else {
    // Fallback for requests without an Origin header (e.g. curl / Postman)
    header('Access-Control-Allow-Origin: http://localhost:5173');
}

header('Access-Control-Allow-Credentials: true');
header('Access-Control-Allow-Methods: GET, POST, PUT, DELETE, OPTIONS');
header('Access-Control-Allow-Headers: Content-Type, Authorization, X-Requested-With');

// Auto-load pour les répertoires internes (pour faire simple sans Composer)
spl_autoload_register(function ($class) {
    // Transformer "App\Core\Database" en "src/Core/Database.php"
    $prefix = 'App\\';
    $base_dir = __DIR__ . '/../src/';
    $len = strlen($prefix);
    
    if (strncmp($prefix, $class, $len) !== 0) {
        return;
    }
    
    $relative_class = substr($class, $len);
    $file = $base_dir . str_replace('\\', '/', $relative_class) . '.php';
    if (file_exists($file)) {
        require $file;
    }
});

require_once __DIR__ . '/../config/config.php';

// Gestion du Preflight OPTIONS
if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') {
    http_response_code(200);
    exit();
}

header('Content-Type: application/json; charset=utf-8');

// Health check endpoint for Railway / Docker (returns 200 instantly, no DB needed)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
if ($uri === '/health' || $uri === '/') {
    http_response_code(200);
    echo json_encode(['status' => 'ok']);
    exit;
}

// Serve uploaded files
$uri = urldecode(parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH));
if (strpos($uri, '/uploads/') === 0) {
    $filePath = __DIR__ . '/../public' . $uri;
    if (file_exists($filePath)) {
        $ext = strtolower(pathinfo($filePath, PATHINFO_EXTENSION));
        $mime = match($ext) {
            'pdf'  => 'application/pdf',
            'png'  => 'image/png',
            'jpg', 'jpeg' => 'image/jpeg',
            default => 'application/octet-stream',
        };
        header('Content-Type: ' . $mime);
        header('Content-Disposition: inline; filename="' . basename($filePath) . '"');
        header('Access-Control-Allow-Origin: *');
        readfile($filePath);
        exit;
    } else {
        http_response_code(404);
        echo json_encode(['error' => 'Fichier introuvable']);
        exit;
    }
}

// Extraction de la route via l'URI ou un paramètre (ex: /api/index.php/auth/login)
$uri = parse_url($_SERVER['REQUEST_URI'], PHP_URL_PATH);
// Si on utilise le serveur interne PHP, on va juste utiliser la portion de l'URI.
// exemple: http://localhost:8000/auth/login -> URI is /auth/login

use App\Core\Router;

$router = new Router();
$router->handleRequest($uri);
