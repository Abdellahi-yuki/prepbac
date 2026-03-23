<?php
namespace App\Controllers;

use App\Models\User;
use App\Utils\JWT;

class AuthController {
    private $userModel;

    public function __construct() {
        $this->userModel = new User();
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    // POST /auth/register
    public function register() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['email']) || !isset($input['password']) || !isset($input['first_name']) || !isset($input['last_name']) || !isset($input['series'])) {
            $this->jsonResponse(['error' => 'Tous les champs (first_name, last_name, email, password, series) sont requis'], 400);
        }

        if ($this->userModel->findByEmail($input['email'])) {
            $this->jsonResponse(['error' => 'Cet email est déjà utilisé'], 400);
        }

        $user = $this->userModel->create($input);

        if ($user) {
            $token = $this->generateToken($user);
            $this->jsonResponse([
                'message' => 'Inscription réussie',
                'user' => $user,
                'token' => $token
            ], 201);
        } else {
            $this->jsonResponse(['error' => 'Erreur lors de la création du compte'], 500);
        }
    }

    // POST /auth/login
    public function login() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $input = json_decode(file_get_contents('php://input'), true);

        if (!isset($input['email']) || !isset($input['password'])) {
            $this->jsonResponse(['error' => 'Email et mot de passe requis'], 400);
        }

        $user = $this->userModel->findByEmail($input['email']);

        if (!$user || !password_verify($input['password'], $user['password_hash'])) {
            $this->jsonResponse(['error' => 'Identifiants invalides'], 401);
        }

        // Return user without password
        unset($user['password_hash']);
        $token = $this->generateToken($user);

        $this->jsonResponse([
            'message' => 'Connexion réussie',
            'user' => $user,
            'token' => $token
        ]);
    }

    // GET /auth/me
    public function me() {
        $token = JWT::getBearerToken();
        if (!$token) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }

        $payload = JWT::decode($token, JWT_SECRET);
        if (!$payload || !isset($payload['user_id'])) {
            $this->jsonResponse(['error' => 'Token invalide ou expiré'], 401);
        }

        $user = $this->userModel->findById($payload['user_id']);
        if (!$user) {
            $this->jsonResponse(['error' => 'Utilisateur introuvable'], 404);
        }

        $this->jsonResponse(['user' => $user]);
    }

    // POST /auth/update
    public function update() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => 'Method not allowed'], 405);
        }

        $token = JWT::getBearerToken();
        if (!$token) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }

        $payload = JWT::decode($token, JWT_SECRET);
        if (!$payload || !isset($payload['user_id'])) {
            $this->jsonResponse(['error' => 'Token invalide ou expiré'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        
        // Filter out email and role - they cannot be updated through this endpoint
        $updateData = [];
        if (isset($input['first_name'])) $updateData['first_name'] = $input['first_name'];
        if (isset($input['last_name'])) $updateData['last_name'] = $input['last_name'];
        if (isset($input['series'])) $updateData['series'] = $input['series'];
        if (!empty($input['password'])) $updateData['password'] = $input['password'];

        if (empty($updateData)) {
            $this->jsonResponse(['error' => 'Aucune donnée à mettre à jour'], 400);
        }

        if ($this->userModel->updateProfile($payload['user_id'], $updateData)) {
            $updatedUser = $this->userModel->findById($payload['user_id']);
            $this->jsonResponse([
                'message' => 'Profil mis à jour avec succès',
                'user' => $updatedUser
            ]);
        } else {
            $this->jsonResponse(['error' => 'Erreur lors de la mise à jour du profil'], 500);
        }
    }

    // GET /auth/series
    public function series() {
        $stmt = $this->userModel->getDb()->query("SELECT * FROM series ORDER BY id ASC");
        $this->jsonResponse(['success' => true, 'series' => $stmt->fetchAll(\PDO::FETCH_ASSOC)]);
    }

    private function generateToken($user) {
        $payload = [
            'iss' => APP_URL,
            'iat' => time(),
            'exp' => time() + (60 * 60 * 24 * 7), // 7 jours
            'user_id' => $user['id'],
            'role' => $user['role']
        ];
        return JWT::encode($payload, JWT_SECRET);
    }
}
