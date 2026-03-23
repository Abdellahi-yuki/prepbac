<?php
namespace App\Models;

use App\Core\Database;
use PDO;

class Subject {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getAll() {
        $stmt = $this->db->query("SELECT * FROM subjects ORDER BY id ASC");
        return $stmt->fetchAll();
    }

    public function getBySeries($seriesId) {
        $stmt = $this->db->prepare("
            SELECT s.*, ss.coefficient
            FROM subjects s
            JOIN subject_series ss ON s.id = ss.subject_id
            WHERE ss.series_id = :series
            ORDER BY s.id ASC
        ");
        $stmt->execute(['series' => (int)$seriesId]);
        return $stmt->fetchAll(PDO::FETCH_ASSOC);
    }

    public function findById($id) {
        $stmt = $this->db->prepare("SELECT * FROM subjects WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }
}
