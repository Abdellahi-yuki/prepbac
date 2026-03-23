<?php
namespace App\Config;

// Database Configuration
define('DB_HOST', 'localhost');
define('DB_USER', 'root');
define('DB_PASS', 'root');
define('DB_NAME', 'bac_prepa');

// Application Configuration
define('APP_URL', 'http://localhost:8000');
define('JWT_SECRET', 'votre_jwt_secret_securise_ici_2026'); // À changer en prod
define('CORS_ALLOWED_ORIGIN', 'http://localhost:5173');

// Mode de développement (true = affiche erreurs détaillées)
define('DEV_MODE', true);

if (DEV_MODE) {
    ini_set('display_errors', 1);
    ini_set('display_startup_errors', 1);
    error_reporting(E_ALL);
}
