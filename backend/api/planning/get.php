<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: GET");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/Database.php';

// Auth checker basique (à remplacer par librairie JWT)
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (!$authHeader) {
    http_response_code(401);
    echo json_encode(["message" => "Accès refusé. Token manquant."]);
    exit();
}

// Extraction basique de l'ID utilisateur passé en query params ou depuis le token
$user_id = isset($_GET['user_id']) ? $_GET['user_id'] : null;

if (!$user_id) {
    http_response_code(400);
    echo json_encode(["message" => "user_id manquant."]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    // 1. Récupérer le plan actuel
    $stmt = $db->prepare("SELECT id, bac_date, hours_per_day, created_at FROM study_plans WHERE user_id = :uid LIMIT 1");
    $stmt->execute([':uid' => $user_id]);
    $plan = $stmt->fetch(PDO::FETCH_ASSOC);

    if (!$plan) {
         echo json_encode(["message" => "Aucun planning trouvé.", "has_plan" => false]);
         exit();
    }

    // 2. Récupérer toutes les sessions de ce plan par date ascendante
    $stmt = $db->prepare("SELECT id, subject, topic, duration_minutes, planned_date, is_completed FROM study_sessions WHERE plan_id = :pid ORDER BY planned_date ASC, id ASC");
    $stmt->execute([':pid' => $plan['id']]);
    $sessions = $stmt->fetchAll(PDO::FETCH_ASSOC);

    // 3. Calcul de la progression globale
    $total_sessions = count($sessions);
    $completed_sessions = 0;
    
    // Grouper les sessions par date
    $grouped_sessions = [];
    foreach ($sessions as $s) {
        if ($s['is_completed']) $completed_sessions++;
        
        $date = $s['planned_date'];
        if (!isset($grouped_sessions[$date])) {
            $grouped_sessions[$date] = [
                'date' => $date,
                'items' => []
            ];
        }
        $grouped_sessions[$date]['items'][] = [
            'id' => $s['id'],
            'subject' => $s['subject'],
            'topic' => $s['topic'],
            'duration' => $s['duration_minutes'],
            'is_completed' => (bool)$s['is_completed']
        ];
    }
    
    $progress_percentage = $total_sessions > 0 ? floor(($completed_sessions / $total_sessions) * 100) : 0;

    echo json_encode([
        "has_plan" => true,
        "plan_info" => [
            "id" => $plan['id'],
            "bac_date" => $plan['bac_date'],
            "hours_per_day" => $plan['hours_per_day'],
            "progress" => $progress_percentage,
            "total_sessions" => $total_sessions,
            "completed_sessions" => $completed_sessions
        ],
        "timeline" => array_values($grouped_sessions) // Array des jours
    ]);

} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Erreur de chargement du planning.", "error" => $e->getMessage()]);
}
?>
