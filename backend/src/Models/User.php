<?php
namespace App\Models;

use App\Core\Database;
use PDO;

class User {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    public function getDb() {
        return $this->db;
    }

    public function findByEmail($email) {
        $stmt = $this->db->prepare("SELECT * FROM users WHERE email = :email LIMIT 1");
        $stmt->execute(['email' => $email]);
        return $stmt->fetch();
    }
    
    public function findById($id) {
        $stmt = $this->db->prepare("SELECT id, first_name, last_name, email, role, series, avatar_url, current_streak, max_streak, last_activity_date, created_at FROM users WHERE id = :id LIMIT 1");
        $stmt->execute(['id' => $id]);
        return $stmt->fetch();
    }

    public function create($data) {
        $stmt = $this->db->prepare("INSERT INTO users (first_name, last_name, email, password_hash, series, role) VALUES (:first_name, :last_name, :email, :password_hash, :series, :role)");
        
        $userData = [
            'first_name' => $data['first_name'],
            'last_name'  => $data['last_name'],
            'email'      => $data['email'],
            'password_hash' => password_hash($data['password'], PASSWORD_DEFAULT),
            'series'     => (int)($data['series'] ?? 1), // Expects series ID now
            'role'       => $data['role'] ?? 'student'
        ];

        if ($stmt->execute($userData)) {
            $userData['id'] = $this->db->lastInsertId();
            unset($userData['password_hash']);
            return $userData;
        }
        return false;
    }

    public function updateProfile($id, $data) {
        $sets = [];
        $params = ['id' => $id];
        
        if (isset($data['first_name'])) {
            $sets[] = "first_name = :first_name";
            $params['first_name'] = $data['first_name'];
        }
        if (isset($data['last_name'])) {
            $sets[] = "last_name = :last_name";
            $params['last_name'] = $data['last_name'];
        }
        if (isset($data['series'])) {
            $sets[] = "series = :series";
            $params['series'] = (int)$data['series']; // Store as INT ID
        }
        if (!empty($data['password'])) {
            $sets[] = "password_hash = :password_hash";
            $params['password_hash'] = password_hash($data['password'], PASSWORD_DEFAULT);
        }
        
        if (empty($sets)) return true;

        $sql = "UPDATE users SET " . implode(", ", $sets) . " WHERE id = :id";
        $stmt = $this->db->prepare($sql);
        return $stmt->execute($params);
    }
}
