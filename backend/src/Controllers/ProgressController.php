<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;

class ProgressController {
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

    // GET /progress/dashboard
    public function dashboard() {
        // 1. Exercices terminés
        $stmt = $this->db->prepare("SELECT COUNT(*) as completed FROM exercise_progress WHERE user_id = ? AND status = 'completed'");
        $stmt->execute([$this->userId]);
        $exCompleted = $stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM exercises");
        $exTotal = $stmt->fetchColumn();

        // 2. Annales terminées (exams)
        $stmt = $this->db->prepare("SELECT COUNT(*) as completed FROM exam_progress WHERE user_id = ? AND status = 'completed'");
        $stmt->execute([$this->userId]);
        $examCompleted = $stmt->fetchColumn();
        
        $stmt = $this->db->query("SELECT COUNT(*) FROM exams");
        $examTotal = $stmt->fetchColumn();
        
        // Subject breakdown
        $stmt = $this->db->prepare("SELECT id, name FROM subjects");
        $stmt->execute();
        $subjects = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Exercises per subject
        $stmt = $this->db->prepare("SELECT s.name, COUNT(*) as done
                                    FROM exercise_progress ep
                                    JOIN exercises e ON ep.exercise_id = e.id
                                    JOIN subjects s ON e.subject_id = s.id
                                    WHERE ep.user_id = ? AND ep.status = 'completed' GROUP BY s.id");
        $stmt->execute([$this->userId]);
        $exBySubject = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Exams per subject
        $stmt = $this->db->prepare("SELECT s.name, COUNT(*) as done
                                    FROM exam_progress ep
                                    JOIN exams e ON ep.exam_id = e.id
                                    JOIN subjects s ON e.subject_id = s.id
                                    WHERE ep.user_id = ? AND ep.status = 'completed' GROUP BY s.id");
        $stmt->execute([$this->userId]);
        $examBySubject = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        // Combine
        $subjectStats = [];
        foreach ($subjects as $subj) {
            $name = $subj['name'];
            $subjectStats[$name] = [
                'name' => $name,
                'exercises_done' => 0,
                'exams_done' => 0,
            ];
        }
        foreach ($exBySubject as $row) {
            $subjectStats[$row['name']]['exercises_done'] = (int)$row['done'];
        }
        foreach ($examBySubject as $row) {
            $subjectStats[$row['name']]['exams_done'] = (int)$row['done'];
        }

        $filteredStats = array_filter($subjectStats, fn($s) => $s['exercises_done'] > 0 || $s['exams_done'] > 0);
        
        // 3. Prochaines séances d'étude (Recommandations)
        $stmt = $this->db->prepare("
            SELECT ss.*, s.name as subject_name, c.title as chapter_title
            FROM study_sessions ss
            JOIN study_plans sp ON ss.study_plan_id = sp.id
            JOIN subjects s ON ss.subject_id = s.id
            LEFT JOIN chapters c ON ss.chapter_id = c.id
            WHERE sp.user_id = ? AND ss.is_completed = FALSE
            ORDER BY ss.scheduled_date ASC
            LIMIT 3
        ");
        $stmt->execute([$this->userId]);
        $upcomingSessions = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        $this->jsonResponse([
            'exercise_stats' => [
                'total' => (int)$exTotal,
                'completed' => (int)$exCompleted
            ],
            'exam_stats' => [
                'total' => (int)$examTotal,
                'completed' => (int)$examCompleted
            ],
            'subject_stats' => array_values($filteredStats),
            'study_sessions' => $upcomingSessions,
            'subjects' => $subjects
        ]);
    }

    // POST /progress/exercise
    public function exercise() {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['exercise_id'] ?? null;
        $status = $input['status'] ?? 'completed';

        if (!$id) $this->jsonResponse(['error' => 'ID requis'], 400);

        $stmt = $this->db->prepare("INSERT INTO exercise_progress (user_id, exercise_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?");
        $stmt->execute([$this->userId, $id, $status, $status]);
        
        $this->jsonResponse(['success' => true]);
    }

    // POST /progress/exam
    public function exam() {
        $input = json_decode(file_get_contents('php://input'), true);
        $id = $input['exam_id'] ?? null;
        $status = $input['status'] ?? 'completed';

        if (!$id) $this->jsonResponse(['error' => 'ID requis'], 400);

        $stmt = $this->db->prepare("INSERT INTO exam_progress (user_id, exam_id, status) VALUES (?, ?, ?) ON DUPLICATE KEY UPDATE status = ?");
        $stmt->execute([$this->userId, $id, $status, $status]);
        
        $this->jsonResponse(['success' => true]);
    }
}
