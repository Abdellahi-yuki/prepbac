<?php
namespace App\Controllers;

class SettingsController {
    
    private $settingsFile;

    public function __construct() {
        $this->settingsFile = __DIR__ . '/../../config/settings.json';
    }

    private function requireAdmin() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') return;
        $token = \App\Utils\JWT::getBearerToken();
        $payload = \App\Utils\JWT::decode($token, JWT_SECRET);
        if (!$payload || $payload['role'] !== 'admin') {
            $this->jsonResponse(['error' => 'Accès refusé. Administrateurs uniquement.'], 403);
        }
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    // GET, POST /admin/settings
    public function settings() {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];

        if (!file_exists($this->settingsFile)) {
            file_put_contents($this->settingsFile, json_encode(['GEMINI_API_KEY' => '']));
        }

        if ($method === 'GET') {
            $settings = json_decode(file_get_contents($this->settingsFile), true);
            $this->jsonResponse(['success' => true, 'settings' => $settings]);
        } 
        else if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $this->jsonResponse(['error' => 'Format invalide.'], 400);
            }

            // Merge with existing
            $current = json_decode(file_get_contents($this->settingsFile), true) ?? [];
            $newSettings = array_merge($current, $input);
            
            if (file_put_contents($this->settingsFile, json_encode($newSettings, JSON_PRETTY_PRINT))) {
                $this->jsonResponse(['success' => true, 'message' => 'Paramètres sauvegardés avec succès.']);
            } else {
                $this->jsonResponse(['error' => 'Impossible d\'écrire dans le fichier de paramètres. Vérifiez les permissions.'], 500);
            }
        }
    }
}
