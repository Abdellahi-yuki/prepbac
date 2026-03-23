<?php
namespace App\Models;

use App\Core\Database;
use PDO;

class Chapter {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getBySubject($subjectId, $series = null) {
        if ($series) {
            $stmt = $this->db->prepare("SELECT * FROM chapters WHERE subject_id = :subject_id AND JSON_CONTAINS(series, :series) ORDER BY id ASC");
            $stmt->execute(['subject_id' => $subjectId, 'series' => (int)$series]);
        } else {
            $stmt = $this->db->prepare("SELECT * FROM chapters WHERE subject_id = :subject_id ORDER BY id ASC");
            $stmt->execute(['subject_id' => $subjectId]);
        }
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function getLessonsBySubject($subjectId) {
        $stmt = $this->db->prepare("SELECT * FROM lessons WHERE subject_id = :subject_id ORDER BY id DESC");
        $stmt->execute(['subject_id' => $subjectId]);
        return $stmt->fetchAll();
    }
    
    public function getLesson($lessonId) {
        $stmt = $this->db->prepare("SELECT * FROM lessons WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $lessonId]);
        return $stmt->fetch();
    }
}
