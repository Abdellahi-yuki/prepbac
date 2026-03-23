<?php
header("Access-Control-Allow-Origin: *");
header("Content-Type: application/json; charset=UTF-8");
header("Access-Control-Allow-Methods: POST");
header("Access-Control-Max-Age: 3600");
header("Access-Control-Allow-Headers: Content-Type, Access-Control-Allow-Headers, Authorization, X-Requested-With");

include_once '../../config/Database.php';

// Simuler la vérification du token JWT (pour l'exemple on va l'extraire du Auth header)
// Dans une vraie app, on utiliserait une lib JWT. Ici on récupère juste l'user_id de façon basique.
$headers = apache_request_headers();
$authHeader = isset($headers['Authorization']) ? $headers['Authorization'] : '';
if (!$authHeader) {
    http_response_code(401);
    echo json_encode(["message" => "Accès refusé. Token manquant."]);
    exit();
}

// On suppose que le token contient l'user_id (format: Bearer {user_id}-token-string)
// Pour la démo PrepBac, l'authentification stocke l'ID utilisateur dans le localStorage et le passe
// On va tricher et l'envoyer dans le body pour l'instant si le JWT est complexe, ou l'extraire du body
$data = json_decode(file_get_contents("php://input"));

if (empty($data->user_id) || empty($data->bac_date) || empty($data->hours_per_day) || empty($data->subjects)) {
    http_response_code(400);
    echo json_encode(["message" => "Données incomplètes."]);
    exit();
}

$database = new Database();
$db = $database->getConnection();

try {
    $db->beginTransaction();

    // 1. Supprimer l'ancien plan si existant (un seul plan actif par user)
    $stmt = $db->prepare("DELETE FROM study_plans WHERE user_id = :user_id");
    $stmt->bindParam(":user_id", $data->user_id);
    $stmt->execute();

    // 2. Créer le nouveau plan
    $stmt = $db->prepare("INSERT INTO study_plans (user_id, bac_date, hours_per_day) VALUES (:user_id, :bac_date, :hours)");
    $stmt->bindParam(":user_id", $data->user_id);
    $stmt->bindParam(":bac_date", $data->bac_date);
    $stmt->bindParam(":hours", $data->hours_per_day);
    $stmt->execute();
    $plan_id = $db->lastInsertId();

    // 3. Définition des chapitres par matière (simulation de programme Bac)
    $curriculum = [
        'Maths' => ['Algèbre', 'Analyse Numérique', 'Géométrie dans l\'espace', 'Probabilités', 'Nombres Complexes', 'Intégration', 'Suites', 'Équations différentielles'],
        'Physique' => ['Cinématique', 'Dynamique', 'Oscillateurs', 'Électricité', 'Optique', 'Mécanique Quantique', 'Relativité'],
        'Chimie' => ['Cinétique Chimique', 'Équilibre Chimique', 'Acides et Bases', 'Oxydoréduction', 'Chimie Organique', 'Estérification'],
        'Sciences Nat.' => ['Génétique', 'Immunologie', 'Reproduction', 'Système Nerveux', 'Évolution', 'Respiration Cellulaire'],
        'Philosophie' => ['La Conscience', 'L\'Inconscient', 'L\'Art', 'Le Travail', 'L\'État', 'La Justice', 'La Liberté']
    ];

    // 4. Calcul du temps (jours)
    $start_date = new DateTime(); // aujourd'hui
    $end_date = new DateTime($data->bac_date);
    
    if ($start_date >= $end_date) {
        throw new Exception("La date du Bac doit être dans le futur.");
    }

    $days_remaining = $start_date->diff($end_date)->days;
    if ($days_remaining < 7) {
         throw new Exception("Prévoyez au moins une semaine pour un planning efficace.");
    }

    // 5. Génération intelligente des sessions
    $current_date = clone $start_date;
    $subjects_selected = $data->subjects; // ex: ['Maths', 'Physique']
    
    // Flatten all topics to study
    $all_topics = [];
    foreach ($subjects_selected as $subj) {
        if (isset($curriculum[$subj])) {
            foreach ($curriculum[$subj] as $topic) {
                // On assigne arbitrairement 120 minutes de base pour maîtriser un grand chapitre
                $all_topics[] = ['subject' => $subj, 'topic' => $topic, 'time_needed' => 120]; 
            }
        }
    }
    
    // Mélange intelligent (alternance des matières)
    shuffle($all_topics); 

    $sessions = [];
    $daily_minutes_available = $data->hours_per_day * 60;
    
    $topic_index = 0;
    
    // Pour chaque jour jusqu'au bac
    for ($i = 0; $i < $days_remaining; $i++) {
        $minutes_left_today = $daily_minutes_available;
        $date_str = $current_date->format('Y-m-d');
        
        while ($minutes_left_today > 0 && $topic_index < count($all_topics)) {
            // Créer une session de 60 mins max pour éviter la surcharge (Pomodoro long)
            $session_duration = min(60, $minutes_left_today);
            
            $sessions[] = [
                'plan_id' => $plan_id,
                'subject' => $all_topics[$topic_index]['subject'],
                'topic'   => $all_topics[$topic_index]['topic'],
                'duration' => $session_duration,
                'date'    => $date_str
            ];
            
            $minutes_left_today -= $session_duration;
            $all_topics[$topic_index]['time_needed'] -= $session_duration;
            
            // Si chapitre terminé, on passe au suivant
            if ($all_topics[$topic_index]['time_needed'] <= 0) {
                $topic_index++;
            }
        }
        
        // Si on a fini tous les chapitres, on recommence en mode "Révision générale"
        if ($topic_index >= count($all_topics)) {
            // Re-remplir avec des quizz/révisions (simplifié ici en réinitialisant le temps)
            foreach ($all_topics as &$t) $t['time_needed'] = 60; // 1h de révision par chapitre
            $topic_index = 0;
            shuffle($all_topics);
        }

        $current_date->modify('+1 day');
    }

    // 6. Insérer toutes les sessions dans la BDD
    $stmt = $db->prepare("INSERT INTO study_sessions (plan_id, subject, topic, duration_minutes, planned_date) VALUES (:p, :s, :t, :d, :date)");
    foreach ($sessions as $s) {
        $stmt->execute([
            ':p' => $s['plan_id'],
            ':s' => $s['subject'],
            ':t' => $s['topic'],
            ':d' => $s['duration'],
            ':date' => $s['date']
        ]);
    }

    $db->commit();
    http_response_code(201);
    echo json_encode(["message" => "Planning généré avec succès.", "plan_id" => $plan_id, "days" => $days_remaining, "total_sessions" => count($sessions)]);

} catch (Exception $e) {
    $db->rollBack();
    http_response_code(500);
    echo json_encode(["message" => "Erreur lors de la génération: " . $e->getMessage()]);
}
?>
