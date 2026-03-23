<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;
use PDO;

class ExamsController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    // GET /exams/list
    public function list() {
        $token = JWT::getBearerToken();
        $payload = JWT::decode($token ?: '', JWT_SECRET);
        $userId = $payload ? $payload['user_id'] : 0;
        
        $seriesId = $_GET['series_id'] ?? null;
        try {
            $sql = "
                SELECT e.*, s.name as subject,
                       (SELECT CASE WHEN status = 'completed' THEN 1 ELSE 0 END FROM exam_progress WHERE user_id = :user_id AND exam_id = e.id LIMIT 1) as is_completed
                FROM exams e 
                JOIN subjects s ON e.subject_id = s.id
            ";
            
            $params = ['user_id' => $userId];
            if ($seriesId) {
                $sql .= " WHERE JSON_CONTAINS(e.series, :series_id)";
                $params['series_id'] = json_encode((int)$seriesId);
            }
            
            $sql .= " ORDER BY e.year DESC, e.id DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
            
            foreach ($exams as &$ex) {
                $ex['is_completed'] = (bool)$ex['is_completed'];
            }
            
            $this->jsonResponse(['success' => true, 'exams' => $exams]);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // GET /exams/series
    public function series() {
        $stmt = $this->db->query("SELECT id, name FROM series ORDER BY id ASC");
        $this->jsonResponse(['success' => true, 'series' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }

    // GET /exams/subjects
    public function subjects() {
        $stmt = $this->db->query("SELECT id, name FROM subjects ORDER BY name ASC");
        $this->jsonResponse(['success' => true, 'subjects' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
    }
}
