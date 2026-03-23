<?php
namespace App\Controllers;

use App\Models\Subject;
use App\Models\Chapter;
use App\Utils\JWT;

class CoursesController {
    private $subjectModel;
    private $chapterModel;

    public function __construct() {
        // Optionnel : vérifier JWT ici pour toutes les routes
        $this->requireAuth();
        $this->subjectModel = new Subject();
        $this->chapterModel = new Chapter();
    }

    private function requireAuth() {
        if ($_SERVER['REQUEST_METHOD'] === 'OPTIONS') return; // Handled nicely by index
        $token = JWT::getBearerToken();
        if (!$token || !JWT::decode($token, JWT_SECRET)) {
            $this->jsonResponse(['error' => 'Non autorisé. Connectez-vous.'], 401);
        }
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    // GET /courses/subjects
    public function subjects() {
        if (isset($_GET['series']) && !empty($_GET['series'])) {
            $subjects = $this->subjectModel->getBySeries($_GET['series']);
        } else {
            $subjects = $this->subjectModel->getAll();
        }
        $this->jsonResponse(['subjects' => $subjects]);
    }

    // GET /courses/chapters/{subject_id}
    public function chapters($subjectId = null) {
        if (!$subjectId) {
            $this->jsonResponse(['error' => 'ID de la matière requis'], 400);
        }
        $series = $_GET['series'] ?? null;
        $chapters = $this->chapterModel->getBySubject($subjectId, $series);
        $this->jsonResponse(['chapters' => $chapters]);
    }

    // GET /courses/lessons/{subject_id}
    public function lessons($subjectId = null) {
        if (!$subjectId) {
            $this->jsonResponse(['error' => 'ID de la matière requis'], 400);
        }
        $lessons = $this->chapterModel->getLessonsBySubject($subjectId);
        $this->jsonResponse(['lessons' => $lessons]);
    }
    
    public function lesson($lessonId = null) {
        if (!$lessonId) {
            $this->jsonResponse(['error' => 'ID de la lecon requis'], 400);
        }
        $lesson = $this->chapterModel->getLesson($lessonId);
        if ($lesson) {
            $this->jsonResponse(['lesson' => $lesson]);
        } else {
            $this->jsonResponse(['error' => 'Lecon introuvable'], 404);
        }
    }

    // GET /courses/library
    public function library() {
        $series = $_GET['series'] ?? 'C'; // Default to C

        $token = JWT::getBearerToken();
        $payload = JWT::decode($token, JWT_SECRET);
        $userId = $payload['user_id'] ?? null;

        // 1. Fetch subjects for the series
        $subjects = $this->subjectModel->getBySeries($series);

        $db = \App\Core\Database::getInstance()->getConnection();

        // 2. Build the nested structure
        foreach ($subjects as &$subject) {
            // Provide fallback styles if missing
            $subject['emoji'] = '📘'; // default
            $subject['color'] = $subject['color_theme'] ?? '#667eea';
            $subject['bg'] = 'rgba(102,126,234,0.1)';
            $subject['gradient'] = 'linear-gradient(135deg,#667eea,#764ba2)';

            // Fetch lessons with progress if user is logged in
            if ($userId) {
                $stmt = $db->prepare("
                    SELECT l.*, lp.progress_percent
                    FROM lessons l
                    LEFT JOIN lesson_progress lp ON (l.id = lp.lesson_id AND lp.user_id = ?)
                    WHERE l.subject_id = ?
                    ORDER BY l.id DESC
                ");
                $stmt->execute([$userId, $subject['id']]);
            } else {
                $stmt = $db->prepare("
                    SELECT l.*
                    FROM lessons l
                    WHERE l.subject_id = ?
                    ORDER BY l.id DESC
                ");
                $stmt->execute([$subject['id']]);
            }
            $lessons = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Fetch chapters for this subject
            $stmtCh = $db->prepare("
                SELECT id, title, series
                FROM chapters
                WHERE subject_id = ? AND JSON_CONTAINS(series, ?)
                ORDER BY id ASC
            ");
            $stmtCh->execute([$subject['id'], (string)(int)$series]);
            $chapters = $stmtCh->fetchAll(\PDO::FETCH_ASSOC);

            // Fetch revision sheets for this subject
            $stmtSh = $db->prepare("SELECT * FROM revision_sheets WHERE subject_id = ?");
            $stmtSh->execute([$subject['id']]);
            $sheets = $stmtSh->fetchAll(\PDO::FETCH_ASSOC);
            
            $totalProgress = 0;
            $processedLessons = array_map(function($l) use (&$totalProgress) {
                $l['progress'] = (int)($l['progress_percent'] ?? 0);
                $totalProgress += $l['progress'];
                return $l;
            }, $lessons);

            $subjectProgress = count($lessons) > 0 ? round($totalProgress / count($lessons)) : 0;

            $subject['lessons'] = $processedLessons;
            $subject['chapters'] = $chapters;
            $subject['sheets']  = $sheets;
            $subject['progress'] = $subjectProgress;
        }

        $this->jsonResponse(['subjects' => $subjects]);
    }

    // GET /courses/quizzes?series=C
    public function quizzes() {
        $series = $_GET['series'] ?? 'C';
        $db = \App\Core\Database::getInstance()->getConnection();

        // Get a single quiz with questions+answers
        if (isset($_GET['id'])) {
            $id = (int)$_GET['id'];
            $stmt = $db->prepare("SELECT q.*, s.name as subject FROM quizzes q JOIN subjects s ON q.subject_id = s.id WHERE q.id = ?");
            $stmt->execute([$id]);
            $quiz = $stmt->fetch(\PDO::FETCH_ASSOC);
            if (!$quiz) { $this->jsonResponse(['error' => 'Introuvable'], 404); }

            $stmtQ = $db->prepare("SELECT * FROM questions WHERE quiz_id = ?");
            $stmtQ->execute([$id]);
            $questions = $stmtQ->fetchAll(\PDO::FETCH_ASSOC);
            foreach ($questions as &$q) {
                $stmtA = $db->prepare("SELECT * FROM answers WHERE question_id = ?");
                $stmtA->execute([$q['id']]);
                $q['answers'] = $stmtA->fetchAll(\PDO::FETCH_ASSOC);
            }
            $quiz['questions'] = $questions;
            $this->jsonResponse(['success' => true, 'quiz' => $quiz]);
            return;
        }

        $token = \App\Utils\JWT::getBearerToken();
        $payload = \App\Utils\JWT::decode($token ?: '', JWT_SECRET);
        $userId = $payload ? $payload['user_id'] : 0;

        $stmt = $db->prepare("
            SELECT q.id, q.title, q.series, q.difficulty, q.time_limit_minutes, s.name as subject,
                   (SELECT COUNT(*) FROM questions WHERE quiz_id = q.id) as questions_count,
                   (SELECT CASE WHEN status = 'completed' THEN 1 ELSE 0 END FROM quiz_progress WHERE user_id = :user_id AND quiz_id = q.id LIMIT 1) as is_completed
            FROM quizzes q
            JOIN subjects s ON q.subject_id = s.id
            WHERE JSON_CONTAINS(q.series, :series)
            ORDER BY q.id DESC
        ");
        $stmt->execute(['series' => (string)(int)$series, 'user_id' => $userId]);
        $quizzes = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        
        // Convert to boolean for frontend convenience
        foreach ($quizzes as &$qz) {
            $qz['is_completed'] = (bool)$qz['is_completed'];
        }

        $this->jsonResponse(['success' => true, 'quizzes' => $quizzes]);
    }

    // POST /courses/lesson-progress
    public function lessonProgress() {
        if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
            $this->jsonResponse(['error' => 'POST requis'], 405);
        }

        $token = JWT::getBearerToken();
        $payload = JWT::decode($token, JWT_SECRET);
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }

        $input = json_decode(file_get_contents('php://input'), true);
        $lessonId = (int)($input['lesson_id'] ?? 0);
        $progress = min(100, max(0, (int)($input['progress_percent'] ?? 0)));

        if (!$lessonId) {
            $this->jsonResponse(['error' => 'lesson_id requis'], 400);
        }

        $db = \App\Core\Database::getInstance();
        $stmt = $db->prepare("
            INSERT INTO lesson_progress (user_id, lesson_id, progress_percent)
            VALUES (?, ?, ?)
            ON DUPLICATE KEY UPDATE progress_percent = GREATEST(progress_percent, ?), updated_at = NOW()
        ");
        $stmt->execute([$userId, $lessonId, $progress, $progress]);

        $this->jsonResponse(['success' => true, 'progress' => $progress]);
    }

    // GET /courses/resumes?series=C
    public function resumes() {
        $series = $_GET['series'] ?? 'C';
        $db = \App\Core\Database::getInstance()->getConnection();

        // 1. Fetch subjects
        $subjects = $this->subjectModel->getBySeries($series);

        foreach ($subjects as &$subject) {
            // Fetch resumes from the new independent table
            $stmt = $db->prepare("
                SELECT id, title, description, pdf_url, created_at
                FROM resumes
                WHERE subject_id = ? AND JSON_CONTAINS(series, ?)
                ORDER BY id DESC
            ");
            $stmt->execute([$subject['id'], (string)(int)$series]);
            $subject['resumes'] = $stmt->fetchAll(\PDO::FETCH_ASSOC);

            // Keep revision sheets too
            $stmtSh = $db->prepare("SELECT * FROM revision_sheets WHERE subject_id = ?");
            $stmtSh->execute([$subject['id']]);
            $subject['sheets'] = $stmtSh->fetchAll(\PDO::FETCH_ASSOC);
            
            // Fallback styles
            $subject['emoji'] = '📚';
            $subject['color'] = $subject['color_theme'] ?? '#f59e0b';
            $subject['bg'] = 'rgba(245,158,11,0.1)';
            $subject['gradient'] = 'linear-gradient(135deg, #f59e0b, #d97706)';
        }

        $this->jsonResponse(['subjects' => $subjects]);
    }

    // GET /courses/exercises?series=C
    public function exercises() {
        $series = $_GET['series'] ?? 'C';
        $token = \App\Utils\JWT::getBearerToken();
        $payload = \App\Utils\JWT::decode($token ?: '', JWT_SECRET);
        $userId = $payload ? $payload['user_id'] : 0;

        $db = \App\Core\Database::getInstance()->getConnection();
        
        $sql = "
            SELECT e.id, e.title, e.description, e.difficulty, e.type, e.pdf_path, e.subject_id, s.name as subject, e.series,
                   e.creator_id, e.is_public, e.statement_content, e.correction_content,
                   (SELECT CASE WHEN status = 'completed' THEN 1 ELSE 0 END FROM exercise_progress WHERE user_id = :user_id1 AND exercise_id = e.id LIMIT 1) as is_completed
            FROM exercises e 
            JOIN subjects s ON e.subject_id = s.id
            WHERE JSON_CONTAINS(e.series, :series)
              AND (e.creator_id IS NULL OR e.is_public = 1 OR e.creator_id = :user_id2)
            ORDER BY e.id DESC
        ";
        $stmt = $db->prepare($sql);
        $stmt->execute([
            'series' => (string)(int)$series, 
            'user_id1' => $userId,
            'user_id2' => $userId
        ]);
        $exercises = $stmt->fetchAll(\PDO::FETCH_ASSOC);

        foreach ($exercises as &$ex) {
            $ex['is_completed'] = (bool)$ex['is_completed'];
        }

        $this->jsonResponse(['success' => true, 'exercises' => $exercises]);
    }
}
