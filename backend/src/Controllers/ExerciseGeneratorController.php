<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;

class ExerciseGeneratorController {
    private $db;
    private $userId;

    public function __construct() {
        // Silencing deprecation warnings to prevent invalid JSON output
        error_reporting(E_ALL & ~E_DEPRECATED);
        
        $token = JWT::getBearerToken();
        $payload = JWT::decode($token ?: '', JWT_SECRET);
        if (!$payload) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }
        $this->userId = $payload['user_id'];
        $this->db = Database::getInstance()->getConnection();
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    private function getEnv($key, $default = null) {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (strpos($line, '#') === 0 || !strpos($line, '=')) continue;
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim(explode('#', $value)[0]);
                $value = trim($value, "'\"");
                if ($name === $key) return $value;
            }
        }
        return $default;
    }

    // POST /ai/generate-exercise
    public function generate() {
        $input = json_decode(file_get_contents('php://input'), true);

        $subjectId = $input['subject_id'] ?? null;
        $chapter = $input['chapter'] ?? 'Tous les chapitres';
        $difficulty = $input['difficulty'] ?? 'medium';
        $details = $input['additional_details'] ?? '';
        $series = $input['series'] ?? 'C';

        if (!$subjectId) {
            $this->jsonResponse(['error' => 'La matière est requise'], 400);
        }

        // Get subject name to pass to AI
        $stmt = $this->db->prepare("SELECT name FROM subjects WHERE id = ?");
        $stmt->execute([$subjectId]);
        $subjectName = $stmt->fetchColumn() ?: 'Inconnue';

        $apiKey = $this->getEnv('GROQ_API_KEY');
        if (!$apiKey) {
            $this->jsonResponse(['error' => 'Clé API Groq non configurée'], 500);
        }

        $prompt = "Tu es un professeur de lycée expert en {$subjectName} pour la filière scientifique (Série {$series}).
        L'utilisateur veut générer un exercice personnalisé de préparation au baccalauréat.
        
        Sujet/Matière: {$subjectName}
        Chapitre: {$chapter}
        Niveau de difficulté: {$difficulty}
        Détails supplémentaires: {$details}
        
        Tâche: Génère un exercice pertinent, pédagogique et structuré (avec des parties / questions).
        Obligatoire : 
        1. Utilise le format markdown pour le texte.
        2. Pour les formules mathématiques, utilise EXCLUSIVEMENT \$...\$ pour l'inline et \$\$...\$\$ pour les blocs d'équations (format KaTeX).
        3. NE GÉNÈRE PAS DE JSON. Tu DOIS générer ta réponse en texte brut, en utilisant exactement les délimiteurs suivants :
        
        ---TITRE---
        [Titre court de l'exercice]
        ---ENONCE---
        [Enoncé complet de l'exercice avec questions]
        ---CORRECTION---
        [Correction détaillée et expliquée étape par étape]
        ";

        $messages = [
            [
                "role" => "system",
                "content" => "Tu es un expert en pédagogie et examens scientifiques. Tu dois respecter strictement les délimiteurs demandés."
            ],
            [
                "role" => "user",
                "content" => $prompt
            ]
        ];

        $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
        $payload = json_encode([
            "model" => "llama-3.3-70b-versatile",
            "messages" => $messages,
            "temperature" => 0.7
        ]);

        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $payload);
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            'Content-Type: application/json',
            'Authorization: Bearer ' . $apiKey
        ]);

        $response = curl_exec($ch);
        $httpCode = curl_getinfo($ch, CURLINFO_HTTP_CODE);
        curl_close($ch);

        if ($httpCode !== 200 || !$response) {
            error_log("Groq API error on exercise generation: " . $response);
            $this->jsonResponse(['error' => 'Erreur lors de la communication avec l\'IA'], 500);
        }

        $data = json_decode($response, true);
        $resultText = $data['choices'][0]['message']['content'] ?? '';

        preg_match('/---TITRE---\s*(.*?)\s*---ENONCE---/is', $resultText, $titleMatch);
        preg_match('/---ENONCE---\s*(.*?)\s*---CORRECTION---/is', $resultText, $statementMatch);
        preg_match('/---CORRECTION---\s*(.*)/is', $resultText, $correctionMatch);

        $title = trim($titleMatch[1] ?? 'Exercice Généré par l\'IA');
        $statement = trim($statementMatch[1] ?? $resultText);
        $correction = trim($correctionMatch[1] ?? 'Correction non disponible.');

        // Insert into database
        $seriesJson = json_encode([$series]);
        $type = 'AI Generated';
        
        $difficultyDb = $difficulty;
        if (!in_array($difficulty, ['easy', 'medium', 'hard', 'bac'])) {
            $difficultyDb = 'medium';
        }

        $stmt = $this->db->prepare("
            INSERT INTO exercises 
            (subject_id, series, title, description, type, difficulty, creator_id, is_public, statement_content, correction_content)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        ");
        
        $stmt->execute([
            $subjectId, 
            $seriesJson, 
            $title, 
            substr($statement, 0, 200) . '...', // Brief description for cards
            $type, 
            $difficultyDb, 
            $this->userId, 
            0, // is_public = false by default
            $statement, 
            $correction
        ]);

        $newId = $this->db->lastInsertId();

        $this->jsonResponse([
            'success' => true,
            'exercise' => [
                'id' => $newId,
                'title' => $title,
                'statement_markdown' => $statement,
                'correction_markdown' => $correction,
                'is_public' => false
            ]
        ]);
    }
}
