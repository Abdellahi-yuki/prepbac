<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../../config/Database.php';

// Simulate basic admin auth check
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (!$authHeader) {
    http_response_code(401);
    echo json_encode(["message" => "Accès refusé. Token Admin manquant."]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Total users
    $stmt = $db->query("SELECT COUNT(*) as total FROM users");
    $total_users = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    // 2. Users by series
    $stmt = $db->query("SELECT series, COUNT(*) as count FROM users GROUP BY series");
    $users_by_series = [];
    while($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        if($row['series']) {
            $users_by_series[$row['series']] = $row['count'];
        }
    }

    // 3. Total stats (courses, quizzes, exercises, annales)
    // Coalesce prevents nulls if table exists but is empty
    $stmt = $db->query("SELECT COUNT(*) as total FROM courses");
    $total_courses = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    $stmt = $db->query("SELECT COUNT(*) as total FROM quizzes");
    $total_quizzes = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    $stmt = $db->query("SELECT COUNT(*) as total FROM exercises");
    $total_exercises = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    $stmt = $db->query("SELECT COUNT(*) as total FROM annales");
    $total_annales = $stmt->fetch(PDO::FETCH_ASSOC)['total'] ?? 0;

    // Simulate recent activity log for the admin dashboard
    $recent_activity = [
        ["id" => 1, "action" => "Nouveau cours publié", "target" => "Physique Quantique - Série C", "time" => "Il y a 2h", "type" => "course"],
        ["id" => 2, "action" => "Inscription", "target" => "Oumar Ba", "time" => "Il y a 3h", "type" => "user"],
        ["id" => 3, "action" => "Nouveau Quiz créé", "target" => "Limites et Continuité", "time" => "Hier", "type" => "quiz"]
    ];

    echo json_encode([
        "success" => true,
        "metrics" => [
            "total_users" => $total_users,
            "total_courses" => $total_courses,
            "total_quizzes" => $total_quizzes,
            "total_exercises" => $total_exercises,
            "total_annales" => $total_annales,
            "users_by_series" => [
                "C" => $users_by_series['C'] ?? 0,
                "D" => $users_by_series['D'] ?? 0
            ]
        ],
        "recent_activity" => $recent_activity
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["success" => false, "message" => "Erreur de requete.", "error" => $e->getMessage()]);
}
?>
