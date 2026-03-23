<?php
namespace App\Config;

// Database Configuration
// Priority: Railway MYSQL* vars → MYSQL_* vars → DB_* vars → local dev defaults
define('DB_HOST', getenv('MYSQLHOST')     ?: getenv('MYSQL_HOST')     ?: getenv('DB_HOST') ?: 'localhost');
define('DB_PORT', getenv('MYSQLPORT')     ?: getenv('MYSQL_PORT')     ?: getenv('DB_PORT') ?: '3306');
define('DB_USER', getenv('MYSQLUSER')     ?: getenv('MYSQL_USER')     ?: getenv('DB_USER') ?: 'root');
define('DB_PASS', getenv('MYSQLPASSWORD') ?: getenv('MYSQL_PASSWORD') ?: getenv('DB_PASS') ?: 'root');
define('DB_NAME', getenv('MYSQLDATABASE') ?: getenv('MYSQL_DATABASE') ?: getenv('DB_NAME') ?: 'bac_prepa');

// Application Configuration
define('APP_URL',             getenv('APP_URL')             ?: 'http://localhost:8000');
define('JWT_SECRET',          getenv('JWT_SECRET')          ?: 'votre_jwt_secret_securise_ici_2026');
define('CORS_ALLOWED_ORIGIN', getenv('CORS_ALLOWED_ORIGIN') ?: 'http://localhost:5173');

// Dev mode: off on Railway (set DEV_MODE=false env var), on locally
define('DEV_MODE', filter_var(getenv('DEV_MODE') !== false ? getenv('DEV_MODE') : 'true', FILTER_VALIDATE_BOOLEAN));

if (DEV_MODE) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}
