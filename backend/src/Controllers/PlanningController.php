<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;
use PDO;
use DateTime;
use Exception;

class PlanningController {
    private $db;
    private $userId;

    public function __construct() {
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
                $value = trim(explode('#', $value)[0]); // remove comments
                $value = trim($value, "'\"");
                if ($name === $key) return $value;
            }
        }
        return $default;
    }

    // GET /planning/get
    public function get() {
        try {
            // 1. Get current plan
            $stmt = $this->db->prepare("SELECT id, end_date as bac_date, title as hours_per_day FROM study_plans WHERE user_id = :uid LIMIT 1");
            $stmt->execute([':uid' => $this->userId]);
            $plan = $stmt->fetch(PDO::FETCH_ASSOC);

            if (!$plan) {
                 $this->jsonResponse(["message" => "Aucun planning trouvé.", "has_plan" => false]);
            }

            // 2. Get sessions
            $stmt = $this->db->prepare("
                SELECT ss.id, s.name as subject, c.title as topic, ss.duration_minutes, ss.scheduled_date, ss.is_completed 
                FROM study_sessions ss
                JOIN subjects s ON ss.subject_id = s.id
                LEFT JOIN chapters c ON ss.chapter_id = c.id
                WHERE ss.study_plan_id = :pid 
                ORDER BY ss.scheduled_date ASC, ss.id ASC
            ");
            $stmt->execute([':pid' => $plan['id']]);
            $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // 3. Calculate progress
            $total_sessions = count($sessions);
            $completed_sessions = 0;
            
            $grouped_sessions = [];
            foreach ($sessions as $s) {
                if ($s['is_completed']) $completed_sessions++;
                
                $date = $s['scheduled_date'];
                if (!isset($grouped_sessions[$date])) {
                    $grouped_sessions[$date] = [
                        'date' => $date,
                        'items' => []
                    ];
                }
                $grouped_sessions[$date]['items'][] = [
                    'id' => $s['id'],
                    'subject' => $s['subject'],
                    'topic' => $s['topic'] ?: 'Révision Générale',
                    'duration' => $s['duration_minutes'],
                    'is_completed' => (bool)$s['is_completed']
                ];
            }
            
            $progress_percentage = $total_sessions > 0 ? floor(($completed_sessions / $total_sessions) * 100) : 0;

            $this->jsonResponse([
                "has_plan" => true,
                "plan_info" => [
                    "id" => $plan['id'],
                    "bac_date" => $plan['bac_date'],
                    "hours_per_day" => (int)$plan['hours_per_day'],
                    "progress" => $progress_percentage,
                    "total_sessions" => $total_sessions,
                    "completed_sessions" => $completed_sessions
                ],
                "timeline" => array_values($grouped_sessions)
            ]);

        } catch (Exception $e) {
            $this->jsonResponse(["message" => "Erreur", "error" => $e->getMessage()], 500);
        }
    }

    // POST /planning/generate
    public function generate() {
        $input = json_decode(file_get_contents('php://input'), true);
        
        $bac_date = $input['bac_date'] ?? null;
        $hours_per_day = $input['hours_per_day'] ?? 4;
        $selected_subjects = $input['selected_subjects'] ?? [];
        $assessments = $input['assessments'] ?? [];

        if (!$bac_date || empty($selected_subjects)) {
            $this->jsonResponse(["message" => "Données incomplètes."], 400);
        }

        $apiKey = $this->getEnv('GROQ_API_KEY');
        if (!$apiKey) {
            $this->jsonResponse(["message" => "Clé API Groq manquante."], 500);
        }

        try {
            // 1. Prepare AI Prompt
            $today = date('Y-m-d');
            $prompt = "Aujourd'hui nous sommes le $today. Je prépare mon Bac pour le $bac_date.
            J'ai $hours_per_day heures par jour pour réviser.
            
            Voici mes matières et leur importance (coefficient) :
            " . json_encode($selected_subjects) . "
            
            Voici mon auto-évaluation par chapitre (niveau de 1 à 10, où 1 est débutant et 10 est expert) :
            " . json_encode($assessments) . "
            
            Génère un planning d'étude quotidien détaillé du " . date('Y-m-d', strtotime('+1 day')) . " jusqu'au $bac_date.
            Priorise les chapitres où mon niveau est faible (proche de 1) et respecte le temps quotidien imparti ($hours_per_day h).
            Répartis les sessions intelligemment pour ne pas saturer.
            
            Réponds EXCLUSIVEMENT sous format JSON valide avec la structure suivante :
            {
              \"days\": [
                {
                  \"date\": \"YYYY-MM-DD\",
                  \"sessions\": [
                    { \"subject\": \"Nom de la matière\", \"chapter\": \"Titre du chapitre\", \"duration_minutes\": 60 }
                  ]
                }
              ]
            }";

            // 2. Call Groq API
            $ch = curl_init('https://api.groq.com/openai/v1/chat/completions');
            curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
            curl_setopt($ch, CURLOPT_POST, true);
            curl_setopt($ch, CURLOPT_HTTPHEADER, [
                'Authorization: Bearer ' . $apiKey,
                'Content-Type: application/json'
            ]);
            curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode([
                'model' => 'llama-3.3-70b-versatile',
                'messages' => [
                    ['role' => 'system', 'content' => 'Tu es un expert en orientation et réussite scolaire. Tu génères des plannings d’étude optimisés au format JSON.'],
                    ['role' => 'user', 'content' => $prompt]
                ],
                'response_format' => ['type' => 'json_object'],
                'temperature' => 0.5
            ]));

            $response = curl_exec($ch);
            if (curl_errno($ch)) throw new Exception(curl_error($ch));
            curl_close($ch);

            $aiData = json_decode($response, true);
            $planJson = json_decode($aiData['choices'][0]['message']['content'], true);

            if (!isset($planJson['days'])) {
                throw new Exception("L'IA n'a pas renvoyé de planning valide.");
            }

            // 3. Save to Database
            $this->db->beginTransaction();

            // Clear old plan
            $stmt = $this->db->prepare("DELETE FROM study_plans WHERE user_id = ?");
            $stmt->execute([$this->userId]);

            // Create new plan
            $stmt = $this->db->prepare("INSERT INTO study_plans (user_id, title, start_date, end_date) VALUES (?, ?, ?, ?)");
            $stmt->execute([
                $this->userId,
                (string)$hours_per_day,
                $today,
                $bac_date
            ]);
            $planId = $this->db->lastInsertId();

            // Cache Subject/Chapter IDs to avoid repeated queries
            $subjectsInDb = [];
            $chaptersInDb = [];
            
            $stmtSub = $this->db->query("SELECT id, name FROM subjects");
            while($row = $stmtSub->fetch(PDO::FETCH_ASSOC)) $subjectsInDb[strtolower(trim($row['name']))] = $row['id'];

            $stmtChap = $this->db->query("SELECT id, title, subject_id FROM chapters");
            while($row = $stmtChap->fetch(PDO::FETCH_ASSOC)) {
                $chaptersInDb[strtolower(trim($row['title']))] = [
                    'id' => $row['id'],
                    'sid' => $row['subject_id']
                ];
            }

            $stmtSess = $this->db->prepare("INSERT INTO study_sessions (study_plan_id, subject_id, chapter_id, duration_minutes, scheduled_date) VALUES (?, ?, ?, ?, ?)");

            foreach ($planJson['days'] as $day) {
                $dDate = $day['date'];
                foreach ($day['sessions'] as $sess) {
                    $sName = strtolower(trim($sess['subject']));
                    $cTitle = strtolower(trim($sess['chapter']));
                    
                    $sId = $subjectsInDb[$sName] ?? null;
                    $cId = $chaptersInDb[$cTitle]['id'] ?? null;
                    
                    // If AI gives a chapter name without subject mapping, try to recover sid
                    if (!$sId && $cId) $sId = $chaptersInDb[$cTitle]['sid'];
                    
                    if ($sId) {
                        $stmtSess->execute([
                            $planId,
                            $sId,
                            $cId,
                            (int)$sess['duration_minutes'],
                            $dDate
                        ]);
                    }
                }
            }

            $this->db->commit();
            $this->jsonResponse(["success" => true, "message" => "Planning généré avec succès."]);

        } catch (Exception $e) {
            if ($this->db->inTransaction()) $this->db->rollBack();
            $this->jsonResponse(["message" => "Erreur", "error" => $e->getMessage()], 500);
        }
    }

    // POST /planning/complete
    public function complete() {
        $input = json_decode(file_get_contents('php://input'), true);
        $sid = $input['session_id'] ?? null;
        $done = isset($input['is_completed']) && $input['is_completed'] ? 1 : 0;

        if (!$sid) $this->jsonResponse(['error' => 'ID requis'], 400);

        try {
            $stmt = $this->db->prepare("UPDATE study_sessions SET is_completed = ? WHERE id = ?");
            $stmt->execute([$done, $sid]);
            $this->jsonResponse(['success' => true]);
        } catch (Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }
}
