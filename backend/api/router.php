<?php
// Ce fichier sert de point d'entrée unique pour le serveur PHP intégré.
// Lancer le serveur avec : php -S localhost:8000 -t api/ api/router.php

// Servir les fichiers statiques s'ils existent et sont demandés directement
if (php_sapi_name() === 'cli-server') {
    $file = __DIR__ . $_SERVER['REQUEST_URI'];
    if (is_file($file)) {
        return false; // Laisser le serveur intégré gérer les fichiers statiques
    }
}

// Tout le reste passe par index.php (le front controller / router MVC)
require_once __DIR__ . '/index.php';
