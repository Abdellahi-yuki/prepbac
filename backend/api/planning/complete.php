<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/Database.php';

// Auth checker basique
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (!$authHeader) {
    http_response_code(401);
    echo json_encode(["message" => "Accès refusé. Token manquant."]);
    exit();
}

$data = json_decode(file_get_contents("php://input"));

if (!isset($data->session_id) || !isset($data->is_completed)) {
    http_response_code(400);
    echo json_encode(["message" => "Données incomplètes (session_id ou is_completed manquants)."]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    $stmt = $db->prepare("UPDATE study_sessions SET is_completed = :completed WHERE id = :id");
    
    // Convert boolean to tinyint for MySQL
    $completed_val = $data->is_completed ? 1 : 0;
    
    $stmt->bindParam(":completed", $completed_val, PDO::PARAM_INT);
    $stmt->bindParam(":id", $data->session_id, PDO::PARAM_INT);
    
    if($stmt->execute()) {
        http_response_code(200);
        echo json_encode(["message" => "Session mise à jour avec succès."]);
    } else {
        http_response_code(503);
        echo json_encode(["message" => "Impossible de mettre à jour la session."]);
    }
} catch (Exception $e) {
    http_response_code(500);
    echo json_encode(["message" => "Erreur lors de la mise à jour: " . $e->getMessage()]);
}
?>
