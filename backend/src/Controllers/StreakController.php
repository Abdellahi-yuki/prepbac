<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;
use PDO;

class StreakController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    // POST /streak/check-in
    public function checkIn() {
        $token = JWT::getBearerToken();
        $payload = JWT::decode($token, JWT_SECRET);
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }

        $stmt = $this->db->prepare("SELECT current_streak, max_streak, last_activity_date FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $user = $stmt->fetch();

        if (!$user) {
            $this->jsonResponse(['error' => 'Utilisateur introuvable'], 404);
        }

        $today = date('Y-m-d');
        $yesterday = date('Y-m-d', strtotime('-1 day'));
        $lastDate = $user['last_activity_date'];

        $newStreak = $user['current_streak'];
        $message = "Déjà à jour pour aujourd'hui !";
        $streakUpdated = false;

        if ($lastDate === null || $lastDate < $yesterday) {
            // New streak or reset
            $newStreak = 1;
            $streakUpdated = true;
            $message = "Nouveau streak commencé ! 🔥";
        } elseif ($lastDate === $yesterday) {
            // Increment
            $newStreak = $user['current_streak'] + 1;
            $streakUpdated = true;
            $message = "Streak continué ! 🔥 " . $newStreak . " jours";
        }

        if ($streakUpdated) {
            $newMax = max($user['max_streak'], $newStreak);
            $stmtUpd = $this->db->prepare("UPDATE users SET current_streak = ?, max_streak = ?, last_activity_date = ? WHERE id = ?");
            $stmtUpd->execute([$newStreak, $newMax, $today, $userId]);
            
            // Check for badges
            $this->checkBadges($userId, $newStreak);
        }

        $this->jsonResponse([
            'success' => true,
            'message' => $message,
            'current_streak' => (int)$newStreak,
            'updated' => $streakUpdated
        ]);
    }

    // GET /streak/stats
    public function stats() {
        $token = JWT::getBearerToken();
        $payload = JWT::decode($token, JWT_SECRET);
        $userId = $payload['user_id'] ?? null;

        if (!$userId) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }

        // Get user streak
        $stmt = $this->db->prepare("SELECT current_streak, max_streak FROM users WHERE id = ?");
        $stmt->execute([$userId]);
        $streak = $stmt->fetch();

        // Get unlocked badges
        $stmtB = $this->db->prepare("
            SELECT b.*, ub.unlocked_at 
            FROM badges b 
            LEFT JOIN user_badges ub ON b.id = ub.badge_id AND ub.user_id = ?
            ORDER BY b.milestone_days ASC
        ");
        $stmtB->execute([$userId]);
        $badges = $stmtB->fetchAll();

        // Find next badge
        $nextBadge = null;
        foreach ($badges as $b) {
            if (!$b['unlocked_at']) {
                $nextBadge = $b;
                break;
            }
        }

        $this->jsonResponse([
            'success' => true,
            'streak' => [
                'current' => (int)$streak['current_streak'],
                'max' => (int)$streak['max_streak']
            ],
            'badges' => $badges,
            'next_badge' => $nextBadge
        ]);
    }

    private function checkBadges($userId, $streak) {
        // Find badges that should be unlocked but aren't yet
        $stmt = $this->db->prepare("
            INSERT IGNORE INTO user_badges (user_id, badge_id)
            SELECT ?, id FROM badges WHERE milestone_days <= ?
        ");
        $stmt->execute([$userId, $streak]);
    }
}
