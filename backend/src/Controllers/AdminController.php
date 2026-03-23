<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;
use PDO;

class AdminController {
    private $db;

    public function __construct() {
        $this->db = Database::getInstance()->getConnection();
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    private function requireAdmin() {
        $token = JWT::getBearerToken();
        if (!$token) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }
        $payload = JWT::decode($token, JWT_SECRET);
        if (!$payload || ($payload['role'] ?? '') !== 'admin') {
            $this->jsonResponse(['error' => 'Accès réservé aux administrateurs.'], 403);
        }
        return $payload;
    }

    // GET /admin/stats
    public function stats() {
        $this->requireAdmin();

        try {
            $totalUsers = $this->db->query("SELECT COUNT(*) FROM users")->fetchColumn();

            // Total users by series (dynamic)
            $stmt = $this->db->query("
                SELECT s.name, COUNT(u.id) as count 
                FROM series s 
                LEFT JOIN users u ON s.id = u.series 
                GROUP BY s.id
            ");
            $usersBySeries = [];
            while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
                $usersBySeries[$row['name']] = (int)$row['count'];
            }

            $totalCourses   = $this->db->query("SELECT COUNT(*) FROM lessons")->fetchColumn();
            $totalExercises = $this->db->query("SELECT COUNT(*) FROM exercises")->fetchColumn();
            $totalAnnales   = $this->db->query("SELECT COUNT(*) FROM exams")->fetchColumn();

            // Activité récente : les 5 derniers inscrits
            $stmt = $this->db->query(
                "SELECT id, first_name, last_name, email, series, created_at FROM users ORDER BY created_at DESC LIMIT 5"
            );
            $recentUsers = $stmt->fetchAll(PDO::FETCH_ASSOC);

            $recentActivity = array_map(function($u) {
                return [
                    'id'     => $u['id'] ?? uniqid(),
                    'action' => 'Nouvelle inscription',
                    'target' => ($u['first_name'] ?? '') . ' ' . ($u['last_name'] ?? ''),
                    'type'   => 'user',
                    'time'   => $u['created_at'],
                ];
            }, $recentUsers);

            $this->jsonResponse([
                'success' => true,
                'metrics' => [
                    'total_users'    => (int) $totalUsers,
                    'total_courses'  => (int) $totalCourses,
                    'total_exercises'=> (int) $totalExercises,
                    'total_annales'  => (int) $totalAnnales,
                    'users_by_series'=> $usersBySeries,
                ],
                'recent_activity' => $recentActivity,
            ]);

        } catch (\Exception $e) {
            $this->jsonResponse(['success' => false, 'message' => $e->getMessage()], 500);
        }
    }

    // GET /admin/users | DELETE /admin/users?id=X | PUT /admin/users (body: {id, role})
    public function users($id = null) {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $id = $id ?? ($_GET['id'] ?? null);

        if ($method === 'GET') {
            $series = $_GET['series'] ?? null;
            if ($series) {
                $stmt = $this->db->prepare(
                    "SELECT u.id, u.first_name, u.last_name, u.email, s.name as series, u.role, u.created_at 
                     FROM users u 
                     LEFT JOIN series s ON u.series = s.id 
                     WHERE u.series = ? 
                     ORDER BY u.created_at DESC"
                );
                $stmt->execute([$series]);
            } else {
                $stmt = $this->db->query(
                    "SELECT u.id, u.first_name, u.last_name, u.email, s.name as series, u.role, u.created_at 
                     FROM users u 
                     LEFT JOIN series s ON u.series = s.id 
                     ORDER BY u.created_at DESC"
                );
            }
            $this->jsonResponse(['success' => true, 'users' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
        else if ($method === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM users WHERE id = ? AND role != 'admin'");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Utilisateur supprimé.']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true);
            $uid  = $input['id']   ?? null;
            $role = $input['role'] ?? null;
            if (!$uid || !in_array($role, ['admin', 'student'])) {
                $this->jsonResponse(['error' => 'Données invalides'], 400);
            }
            try {
                $stmt = $this->db->prepare("UPDATE users SET role = ? WHERE id = ?");
                $stmt->execute([$role, $uid]);
                $this->jsonResponse(['success' => true, 'message' => 'Rôle mis à jour.']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    // GET & POST /admin/courses
    // GET /admin/courses/{id}, PUT /admin/courses/{id}
    public function courses($id = null) {
        $this->requireAdmin();

        $method = $_SERVER['REQUEST_METHOD'];
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';

        // If POST is empty but Content-Length > 0, it usually means post_max_size was exceeded
        if ($method === 'POST' && empty($_POST) && isset($_SERVER['CONTENT_LENGTH']) && $_SERVER['CONTENT_LENGTH'] > 0) {
            $this->jsonResponse(['error' => 'Le fichier est trop volumineux pour le serveur. Augmentez post_max_size.'], 400);
        }

        // Initialize $input with $_POST data (populated for form-data)
        $input = $_POST;

        // Merge in JSON data if present
        if (stripos($contentType, 'application/json') !== false) {
            $jsonBody = json_decode(file_get_contents('php://input'), true);
            if (is_array($jsonBody)) {
                $input = array_merge($input, $jsonBody);
            }
        }

        // --- Handle method overrides (e.g., _method=PUT in POST) ---
        $actualMethod = $method;
        if ($method === 'POST' && isset($input['_method'])) {
            $actualMethod = strtoupper($input['_method']);
        }

        if ($actualMethod === 'PUT' && $id) {
            $this->updateCourseFromJson($id, $input);
            return;
        }

        // Case 1: GET single lesson
        if ($id && $method === 'GET') {
            try {
                $stmt = $this->db->prepare("SELECT l.*, s.name as subject FROM lessons l JOIN subjects s ON l.subject_id = s.id WHERE l.id = ?");
                $stmt->execute([$id]);
                $lesson = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$lesson) {
                    $this->jsonResponse(['error' => 'Leçon introuvable'], 404);
                }
                $this->jsonResponse(['success' => true, 'lesson' => $lesson]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()], 500);
            }
        }
        // Case 2: DELETE lesson
        else if ($id && $actualMethod === 'DELETE') {
            $this->deleteCourse($id);
            return;
        }
        // Case 3: POST (Add lesson)
        else if ($method === 'POST') {
            $subjectId = trim((string)($input['subject_id'] ?? ''));
            $title     = trim((string)($input['title'] ?? ''));
            $type      = trim((string)($input['type'] ?? ''));
            $description = trim((string)($input['description'] ?? ''));

            if ($subjectId === '' || $title === '') {
                $this->jsonResponse(['error' => 'Veuillez remplir les champs obligatoires (Matière, Titre)'], 400);
            }

            // Handle PDF upload
            $pdfUrl = null;
            if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/uploads/courses/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

                $filename = uniqid('course_') . '_' . preg_replace('/[^a-zA-Z0-9.\-_]/', '', basename($_FILES['pdf_file']['name']));
                if (move_uploaded_file($_FILES['pdf_file']['tmp_name'], $uploadDir . $filename)) {
                    $pdfUrl = '/uploads/courses/' . $filename;
                }
            }

            try {
                $stmt = $this->db->prepare("INSERT INTO lessons (subject_id, title, type, description, content, pdf_url) VALUES (?, ?, ?, ?, '', ?)");
                $stmt->execute([$subjectId, $title, $type, $description, $pdfUrl]);

                $this->jsonResponse(['success' => true, 'message' => 'Cours ajouté avec succès', 'id' => $this->db->lastInsertId()]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur lors de l\'ajout du cours: ' . $e->getMessage()], 500);
            }
        }

        if ($method === 'GET') {
            try {
                $sql = "SELECT l.id, l.title, l.type, s.name as subject
                        FROM lessons l
                        JOIN subjects s ON l.subject_id = s.id
                        ORDER BY l.id DESC";
                $stmt = $this->db->query($sql);
                $courses = $stmt->fetchAll(PDO::FETCH_ASSOC);
                foreach ($courses as &$c) {
                    $c['status'] = 'published';
                    $c['date'] = date('Y-m-d'); // Fallback since created_at is gone
                }
                $this->jsonResponse(['success' => true, 'courses' => $courses]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    private function updateCourseFromJson($id, $input) {
        $title      = trim($input['title'] ?? '');
        $type       = trim($input['type'] ?? '');
        $description= trim($input['description'] ?? '');
        $subjectId  = trim($input['subject_id'] ?? '');

        if ($title === '') {
            $this->jsonResponse(['error' => 'Titre requis'], 400);
        }

        $pdfUrl = $input['existing_pdf_url'] ?? null;
        
        if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../public/uploads/courses/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $filename = uniqid('course_') . '_' . preg_replace('/[^a-zA-Z0-9.\-_]/', '', basename($_FILES['pdf_file']['name']));
            if (move_uploaded_file($_FILES['pdf_file']['tmp_name'], $uploadDir . $filename)) {
                $pdfUrl = '/uploads/courses/' . $filename;
            }
        }

        try {
            $stmt = $this->db->prepare("UPDATE lessons SET title=?, type=?, description=?, pdf_url=? WHERE id=?");
            $stmt->execute([$title, $type, $description, $pdfUrl, $id]);
            $this->jsonResponse(['success' => true, 'message' => 'Cours mis à jour avec succès']);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => 'Erreur lors de la modification: ' . $e->getMessage()], 500);
        }
    }

    // GET, POST, DELETE /admin/subjects
    public function subjects($action = null, $id = null) {
        $this->requireAdmin();

        $method = $_SERVER['REQUEST_METHOD'];
        $id = $id ?? ($_GET['id'] ?? null);

        if ($method === 'GET') {
            $series = $_GET['series'] ?? null;
            
            if ($series) {
                $stmt = $this->db->prepare("
                    SELECT s.id, s.name, s.description, s.color_theme, ss.coefficient 
                    FROM subjects s
                    JOIN subject_series ss ON s.id = ss.subject_id
                    WHERE ss.series_id = :series
                    ORDER BY s.id DESC
                ");
                $stmt->execute(['series' => (int)$series]);
            } else {
                $stmt = $this->db->query("SELECT id, name, description, color_theme FROM subjects ORDER BY name ASC");
            }
            $subjects = $stmt->fetchAll(PDO::FETCH_ASSOC);

            // Attach series & coefficients to each subject for the UI form
            foreach ($subjects as &$subject) {
                $stmt = $this->db->prepare("SELECT series_id, coefficient FROM subject_series WHERE subject_id = ?");
                $stmt->execute([$subject['id']]);
                // Return an array mapping series_id => coefficient
                $seriesMap = [];
                foreach($stmt->fetchAll(PDO::FETCH_ASSOC) as $row) {
                    $seriesMap[$row['series_id']] = (float)$row['coefficient'];
                }
                $subject['series_map'] = $seriesMap;
            }

            $this->jsonResponse(['success' => true, 'subjects' => $subjects, 'queried_series' => $series]);
        } 
        else if ($method === 'POST' || $method === 'PUT') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['name']) || empty($input['series_map'])) {
                $this->jsonResponse(['error' => 'Nom et affectations de série sont requis'], 400);
            }

            try {
                $this->db->beginTransaction();
                
                if ($id) {
                    // Update existing subject
                    $stmt = $this->db->prepare("UPDATE subjects SET name = ?, description = ?, color_theme = ? WHERE id = ?");
                    $stmt->execute([
                        $input['name'],
                        $input['description'] ?? '',
                        $input['color_theme'] ?? '#667eea',
                        $id
                    ]);
                    $subjectId = $id;

                    // Delete existing series pivot relations before inserting the fresh map
                    $stmtDel = $this->db->prepare("DELETE FROM subject_series WHERE subject_id = ?");
                    $stmtDel->execute([$subjectId]);
                } else {
                    // Insert new subject
                    $stmt = $this->db->prepare("INSERT INTO subjects (name, description, color_theme) VALUES (?, ?, ?)");
                    $stmt->execute([
                        $input['name'],
                        $input['description'] ?? '',
                        $input['color_theme'] ?? '#667eea'
                    ]);
                    $subjectId = $this->db->lastInsertId();
                }

                // Insert into subject_series pivot table
                $stmtPivot = $this->db->prepare("INSERT INTO subject_series (subject_id, series_id, coefficient) VALUES (?, ?, ?)");
                foreach ($input['series_map'] as $seriesId => $coefficient) {
                    $stmtPivot->execute([$subjectId, (int)$seriesId, (float)$coefficient]);
                }

                $this->db->commit();
                $this->jsonResponse(['success' => true, 'message' => $id ? 'Matière modifiée avec succès.' : 'Matière ajoutée avec succès.']);
            } catch (\Exception $e) {
                $this->db->rollBack();
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($method === 'DELETE' && $id) {
            // Supprimer une matière
            try {
                // Delete will cascade to series_subjects if ON DELETE CASCADE is set
                $stmt = $this->db->prepare("DELETE FROM subjects WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Matière supprimée.']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    // GET, POST, DELETE /admin/chapters
    public function chapters($action = null, $id = null) {
        $this->requireAdmin();

        $method = $_SERVER['REQUEST_METHOD'];
        $id = $id ?? ($_GET['id'] ?? null);

        if ($method === 'GET') {
            $subjectId = $_GET['subject_id'] ?? null;
            $series = $_GET['series'] ?? 'C';
            
            $sql = "SELECT c.id, c.title, c.subject_id, s.name as subject_name, c.series
                    FROM chapters c
                    JOIN subjects s ON c.subject_id = s.id";
            
            $params = [];
            if ($subjectId) {
                $sql .= " WHERE c.subject_id = :subject_id";
                $params['subject_id'] = $subjectId;
            } else if ($series && $series !== 'all') {
                $sql .= " WHERE JSON_CONTAINS(c.series, :series)";
                $params['series'] = json_encode((int)$series);
            }
            
            $sql .= " ORDER BY c.id DESC";
            
            $stmt = $this->db->prepare($sql);
            $stmt->execute($params);
            $chapters = $stmt->fetchAll(PDO::FETCH_ASSOC);
            $this->jsonResponse(['success' => true, 'chapters' => $chapters]);
        } 
        else if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true) ?? $_POST;

            if (empty($input['title']) || empty($input['subject_id'])) {
                $this->jsonResponse(['error' => 'Titre et Matière sont requis'], 400);
            }

            try {
                if (!empty($input['id'])) {
                    $stmt = $this->db->prepare("UPDATE chapters SET title=?, subject_id=?, series=? WHERE id=?");
                    $stmt->execute([
                        $input['title'],
                        $input['subject_id'],
                        json_encode($input['series'] ?? []),
                        $input['id']
                    ]);
                    $this->jsonResponse(['success' => true, 'message' => 'Chapitre mis à jour.']);
                } else {
                    $stmt = $this->db->prepare("INSERT INTO chapters (title, subject_id, series) VALUES (?, ?, ?)");
                    $stmt->execute([
                        $input['title'],
                        $input['subject_id'],
                        json_encode($input['series'] ?? [])
                    ]);
                    $this->jsonResponse(['success' => true, 'message' => 'Chapitre ajouté avec succès.']);
                }
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($method === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM chapters WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Chapitre supprimé.']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    // GET /admin/resumes?series=X | POST /admin/resumes | DELETE /admin/resumes/{id}
    public function resumes($id = null) {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $id = $id ?? ($_GET['id'] ?? null);

        if ($method === 'GET') {
            $series = $_GET['series'] ?? 'C';
            $stmt = $this->db->prepare("
                SELECT r.id, r.title, r.description, r.pdf_url, r.series, r.created_at, s.name AS subject_name, r.subject_id
                FROM resumes r
                JOIN subjects s ON r.subject_id = s.id
                WHERE JSON_CONTAINS(r.series, :series)
                ORDER BY r.subject_id, r.id DESC
            ");
            $stmt->execute(['series' => json_encode((int)$series)]);
            $this->jsonResponse(['success' => true, 'resumes' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        }
        else if ($method === 'POST') {
            $input = $_POST;
            if (empty($input['title']) || empty($input['subject_id'])) {
                $this->jsonResponse(['error' => 'Titre et Matière sont requis'], 400);
            }

            $pdfUrl = null;
            if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/uploads/resumes/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                $filename = uniqid('resume_') . '_' . preg_replace('/[^a-zA-Z0-9.\-_]/', '', basename($_FILES['pdf_file']['name']));
                if (move_uploaded_file($_FILES['pdf_file']['tmp_name'], $uploadDir . $filename)) {
                    $pdfUrl = '/uploads/resumes/' . $filename;
                }
            }

            try {
                $stmt = $this->db->prepare("INSERT INTO resumes (title, description, subject_id, series, pdf_url) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([
                    trim($input['title']),
                    trim($input['description'] ?? ''),
                    (int)$input['subject_id'],
                    json_encode($input['series'] ?? []),
                    $pdfUrl
                ]);
                $this->jsonResponse(['success' => true, 'message' => 'Résumé ajouté avec succès.', 'id' => $this->db->lastInsertId()]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($method === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM resumes WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Résumé supprimé.']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    // GET, POST, DELETE /admin/sheets
    public function sheets($id = null) {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $actualMethod = $method;
        
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $input = $_POST;
        if (stripos($contentType, 'application/json') !== false) {
            $jsonBody = json_decode(file_get_contents('php://input'), true);
            if (is_array($jsonBody)) $input = array_merge($input, $jsonBody);
        }

        if ($method === 'POST' && isset($input['_method'])) {
            $actualMethod = strtoupper($input['_method']);
        }

        $id = $id ?? ($_GET['id'] ?? null);

        if ($actualMethod === 'PUT' && $id) {
            $this->updateSheet($id);
            return;
        }

        if ($actualMethod === 'GET') {
            if ($id) {
                $stmt = $this->db->prepare("SELECT * FROM revision_sheets WHERE id = ?");
                $stmt->execute([$id]);
                $sheet = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$sheet) $this->jsonResponse(['error' => 'Fiche introuvable'], 404);
                $this->jsonResponse(['success' => true, 'sheet' => $sheet]);
            } else {
                $series = $_GET['series'] ?? 'C';
                $stmt = $this->db->prepare("
                    SELECT rs.id, rs.title, rs.pdf_url, s.name as subject, s.id as subject_id, ss.coefficient
                    FROM revision_sheets rs 
                    JOIN subjects s ON rs.subject_id = s.id
                    JOIN subject_series ss ON s.id = ss.subject_id
                    WHERE ss.series_id = :series
                    ORDER BY rs.id DESC
                ");
                $stmt->execute(['series' => (int)$series]);
                $sheets = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $this->jsonResponse(['success' => true, 'sheets' => $sheets]);
            }
        } 
        else if ($actualMethod === 'POST') {
            $subjId    = trim((string)($input['subject_id'] ?? ''));
            $title     = trim((string)($input['title'] ?? ''));
            $content   = trim((string)($input['summary_content'] ?? ''));
            $seriesRaw = (string)($input['series'] ?? '');

            if ($subjId === '' || $title === '') {
                $this->jsonResponse(['error' => 'Matière et Titre requis'], 400);
            }

            $pdfUrl = null;
            if (isset($_FILES['pdf']) && $_FILES['pdf']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/uploads/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                $name = uniqid() . '_' . basename($_FILES['pdf']['name']);
                if (move_uploaded_file($_FILES['pdf']['tmp_name'], $uploadDir . $name)) {
                    $pdfUrl = '/uploads/' . $name;
                }
            } elseif ($content !== '') {
                if (!class_exists('\Dompdf\Dompdf') && file_exists(__DIR__ . '/../../../vendor/autoload.php')) {
                    require_once __DIR__ . '/../../../vendor/autoload.php';
                }
                if (class_exists('\Dompdf\Dompdf')) {
                    try {
                        $dompdf = new \Dompdf\Dompdf();
                        $dompdf->loadHtml($content);
                        $dompdf->setPaper('A4', 'portrait');
                        $dompdf->render();
                        $uploadDir = __DIR__ . '/../../public/uploads/';
                        if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                        $name = uniqid() . '_sheet.pdf';
                        file_put_contents($uploadDir . $name, $dompdf->output());
                        $pdfUrl = '/uploads/' . $name;
                    } catch (\Exception $e) {
                         $this->jsonResponse(['error' => 'Erreur de génération PDF : ' . $e->getMessage()], 500);
                    }
                }
            }

            if (empty($pdfUrl) && empty($content)) {
                $this->jsonResponse(['error' => 'Veuillez fournir un PDF ou du contenu HTML'], 400);
            }

            try {
                $seriesJson = json_encode([$seriesRaw]);
                $stmt = $this->db->prepare("INSERT INTO revision_sheets (subject_id, series, title, summary_content, pdf_url) VALUES (?, ?, ?, ?, ?)");
                $stmt->execute([$subjId, $seriesJson, $title, $content, $pdfUrl]);
                $this->jsonResponse(['success' => true, 'message' => 'Fiche ajoutée avec succès']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($actualMethod === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM revision_sheets WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Fiche supprimée']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }

    private function updateCourse($id) {
        $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
        $input = $isMultipart ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        
        $title   = $input['title'] ?? '';
        $content = $input['content'] ?? '';
        $references = isset($input['references']) ? json_decode($input['references'], true) : [];
        if (!is_array($references)) $references = [];

        if (empty($title)) {
            $this->jsonResponse(['error' => 'Titre requis'], 400);
        }

        if (empty($content)) {
            $this->jsonResponse(['error' => 'Le contenu HTML est obligatoire'], 400);
        }

        try {
            $stmt = $this->db->prepare("UPDATE lessons SET title=?, content=? WHERE id=?");
            $stmt->execute([$title, $content, $id]);
            $this->jsonResponse(['success' => true, 'message' => 'Leçon mise à jour.']);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    private function deleteCourse($id) {
        try {
            $stmt = $this->db->prepare("DELETE FROM lessons WHERE id = ?");
            $stmt->execute([$id]);
            $this->jsonResponse(['success' => true, 'message' => 'Leçon supprimée.']);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    private function updateSheet($id) {
        $isMultipart = strpos($_SERVER['CONTENT_TYPE'] ?? '', 'multipart/form-data') !== false;
        $input = $isMultipart ? $_POST : (json_decode(file_get_contents('php://input'), true) ?? []);
        
        $title     = $input['title'] ?? '';
        $content   = $input['summary_content'] ?? '';
        $subjId    = $input['subject_id'] ?? '';
        $seriesRaw = (string)($input['series'] ?? '');

        if (empty($title) || empty($subjId)) {
            $this->jsonResponse(['error' => 'Titre et Matière requis'], 400);
        }

        $pdfUrl = $input['existing_pdf'] ?? null;
        if (isset($_FILES['pdf']) && $_FILES['pdf']['error'] === UPLOAD_ERR_OK) {
            $uploadDir = __DIR__ . '/../../public/uploads/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
            $filename  = uniqid() . '_' . basename($_FILES['pdf']['name']);
            if (move_uploaded_file($_FILES['pdf']['tmp_name'], $uploadDir . $filename)) {
                $pdfUrl = '/uploads/' . $filename;
            }
        } elseif ($content !== '') {
            if (!class_exists('\Dompdf\Dompdf') && file_exists(__DIR__ . '/../../../vendor/autoload.php')) {
                require_once __DIR__ . '/../../../vendor/autoload.php';
            }
            if (class_exists('\Dompdf\Dompdf')) {
                try {
                    $dompdf = new \Dompdf\Dompdf();
                    $dompdf->loadHtml($content);
                    $dompdf->setPaper('A4', 'portrait');
                    $dompdf->render();
                    $uploadDir = __DIR__ . '/../../public/uploads/';
                    if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                    $filename = uniqid() . '_sheet.pdf';
                    file_put_contents($uploadDir . $filename, $dompdf->output());
                    $pdfUrl = '/uploads/' . $filename;
                } catch (\Exception $e) {
                    $this->jsonResponse(['error' => 'Erreur PDF : ' . $e->getMessage()], 500);
                }
            }
        }

        try {
            $seriesJson = json_encode([$seriesRaw]);
            $stmt = $this->db->prepare("UPDATE revision_sheets SET subject_id=?, series=?, title=?, summary_content=?, pdf_url=? WHERE id=?");
            $stmt->execute([$subjId, $seriesJson, $title, $content, $pdfUrl, $id]);
            $this->jsonResponse(['success' => true, 'message' => 'Fiche mise à jour.']);
        } catch (\Exception $e) {
            $this->jsonResponse(['error' => $e->getMessage()], 500);
        }
    }

    // GET, POST /admin/settings
    public function settings() {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $settingsFile = __DIR__ . '/../../config/settings.json';

        if (!file_exists($settingsFile)) {
            if (!is_dir(__DIR__ . '/../../config')) {
                mkdir(__DIR__ . '/../../config', 0777, true);
            }
            file_put_contents($settingsFile, json_encode(['GEMINI_API_KEY' => '']));
        }

        if ($method === 'GET') {
            $settings = json_decode(file_get_contents($settingsFile), true);
            $this->jsonResponse(['success' => true, 'settings' => $settings]);
        } 
        else if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (!is_array($input)) {
                $this->jsonResponse(['error' => 'Format invalide.'], 400);
            }

            // Merge with existing
            $current = json_decode(file_get_contents($settingsFile), true) ?? [];
            $newSettings = array_merge($current, $input);
            
            if (file_put_contents($settingsFile, json_encode($newSettings, JSON_PRETTY_PRINT))) {
                $this->jsonResponse(['success' => true, 'message' => 'Paramètres sauvegardés avec succès.']);
            } else {
                $this->jsonResponse(['error' => 'Impossible d\'écrire dans le fichier de paramètres. Vérifiez les permissions.'], 500);
            }
        }
    }

    // --- Exams / Annales ---
    public function exams($id = null) {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $actualMethod = $method;
        
        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $input = $_POST;
        if (stripos($contentType, 'application/json') !== false) {
            $jsonBody = json_decode(file_get_contents('php://input'), true);
            if (is_array($jsonBody)) $input = array_merge($input, $jsonBody);
        }

        if ($method === 'POST' && isset($input['_method'])) {
            $actualMethod = strtoupper($input['_method']);
        }

        $id = $id ?? ($_GET['id'] ?? null);

        if ($actualMethod === 'GET') {
            if ($id) {
                $stmt = $this->db->prepare("SELECT * FROM exams WHERE id = ?");
                $stmt->execute([$id]);
                $exam = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$exam) $this->jsonResponse(['error' => 'Annale introuvable'], 404);
                $this->jsonResponse(['success' => true, 'exam' => $exam]);
            } else {
                $series = $_GET['series'] ?? 'C';
                $stmt = $this->db->prepare("
                    SELECT e.*, s.name as subject 
                    FROM exams e 
                    JOIN subjects s ON e.subject_id = s.id
                    WHERE JSON_CONTAINS(e.series, :series)
                    ORDER BY e.year DESC, e.id DESC
                ");
                $stmt->execute(['series' => json_encode((int)$series)]);
                $exams = $stmt->fetchAll(PDO::FETCH_ASSOC);
                $this->jsonResponse(['success' => true, 'exams' => $exams]);
            }
        } 
        else if ($actualMethod === 'POST') {
            // Add or Update
            $id        = $input['id'] ?? null;
            $subjId    = trim((string)($input['subject_id'] ?? ''));
            $series    = $input['series'] ?? [];
            if (!is_array($series)) $series = [$series];
            $series    = array_map('intval', $series);
            $year      = (int)($input['year'] ?? date('Y'));
            $session   = trim((string)($input['session'] ?? 'normale'));
            $solution  = trim((string)($input['solution_content'] ?? ''));

            if ($subjId === '' || $year === 0) {
                $this->jsonResponse(['error' => 'Matière et Année requises'], 400);
            }

            $pdfStatement = $input['existing_pdf_statement'] ?? null;
            $pdfCorrection = $input['existing_pdf_correction'] ?? null;

            $uploadDir = __DIR__ . '/../../public/uploads/exams/';
            if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);

            if (isset($_FILES['pdf_statement']) && $_FILES['pdf_statement']['error'] === UPLOAD_ERR_OK) {
                $name = uniqid() . '_statement_' . basename($_FILES['pdf_statement']['name']);
                if (move_uploaded_file($_FILES['pdf_statement']['tmp_name'], $uploadDir . $name)) {
                    $pdfStatement = '/uploads/exams/' . $name;
                }
            }

            if (isset($_FILES['pdf_correction']) && $_FILES['pdf_correction']['error'] === UPLOAD_ERR_OK) {
                $name = uniqid() . '_correction_' . basename($_FILES['pdf_correction']['name']);
                if (move_uploaded_file($_FILES['pdf_correction']['tmp_name'], $uploadDir . $name)) {
                    $pdfCorrection = '/uploads/exams/' . $name;
                }
            }

            if (!$pdfStatement && !$id) {
                $this->jsonResponse(['error' => 'Le fichier PDF de l\'énoncé est requis pour une nouvelle annale'], 400);
            }

            try {
                if ($id) {
                    $stmt = $this->db->prepare("UPDATE exams SET subject_id=?, series=?, year=?, session=?, pdf_statement_url=?, pdf_correction_url=?, solution_content=? WHERE id=?");
                    $stmt->execute([$subjId, json_encode($series), $year, $session, $pdfStatement, $pdfCorrection, $solution, $id]);
                    $message = "Annale mise à jour";
                } else {
                    $stmt = $this->db->prepare("INSERT INTO exams (subject_id, series, year, session, pdf_statement_url, pdf_correction_url, solution_content) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$subjId, json_encode($series), $year, $session, $pdfStatement, $pdfCorrection, $solution]);
                    $message = "Annale ajoutée avec succès";
                }
                $this->jsonResponse(['success' => true, 'message' => $message]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($actualMethod === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM exams WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Annale supprimée']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }
    // GET, POST, DELETE /admin/exercises
    public function exercises($id = null) {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $actualMethod = $method;

        $contentType = $_SERVER['CONTENT_TYPE'] ?? $_SERVER['HTTP_CONTENT_TYPE'] ?? '';
        $input = $_POST;
        if (stripos($contentType, 'application/json') !== false) {
            $jsonBody = json_decode(file_get_contents('php://input'), true);
            if (is_array($jsonBody)) $input = array_merge($input, $jsonBody);
        }

        if ($method === 'POST' && isset($input['_method'])) {
            $actualMethod = strtoupper($input['_method']);
        }

        $id = $id ?? ($_GET['id'] ?? null);

        if ($actualMethod === 'GET') {
            if ($id) {
                $stmt = $this->db->prepare("SELECT * FROM exercises WHERE id = ?");
                $stmt->execute([$id]);
                $exercise = $stmt->fetch(PDO::FETCH_ASSOC);
                if (!$exercise) $this->jsonResponse(['error' => 'Exercice introuvable'], 404);
                $this->jsonResponse(['success' => true, 'exercise' => $exercise]);
            } else {
                $token = JWT::getBearerToken();
                $payload = JWT::decode($token ?: '', JWT_SECRET);
                $userId = $payload ? $payload['user_id'] : 0;
                
                $series = $_GET['series'] ?? 'C';
                $subjectFilter = $_GET['subject_id'] ?? null;
                $params = ['user_id' => $userId];
                
                $sql = "SELECT e.*, s.name as subject,
                       (SELECT CASE WHEN status = 'completed' THEN 1 ELSE 0 END FROM exercise_progress WHERE user_id = :user_id AND exercise_id = e.id LIMIT 1) as is_completed
                    FROM exercises e 
                    JOIN subjects s ON e.subject_id = s.id
                    WHERE JSON_CONTAINS(e.series, :series)";
                $params['series'] = json_encode((int)$series);
                if ($subjectFilter) {
                    $sql .= " AND e.subject_id = :subject_id";
                    $params['subject_id'] = $subjectFilter;
                }
                $sql .= " ORDER BY e.created_at DESC";
                $stmt = $this->db->prepare($sql);
                $stmt->execute($params);
                $exercises = $stmt->fetchAll(PDO::FETCH_ASSOC);
                
                foreach ($exercises as &$ex) {
                    $ex['is_completed'] = (bool)$ex['is_completed'];
                }
                
                $this->jsonResponse(['success' => true, 'exercises' => $exercises]);
            }
        } 
        else if ($actualMethod === 'POST') {
            $id        = $input['id'] ?? null;
            $subjId    = trim((string)($input['subject_id'] ?? ''));
            $title     = trim((string)($input['title'] ?? ''));
            $series    = $input['series'] ?? [];
            if (!is_array($series)) $series = [$series];
            $series    = array_map('intval', $series);
            $type      = trim((string)($input['type'] ?? 'Classique'));
            $difficulty= trim((string)($input['difficulty'] ?? 'medium'));
            $description= trim((string)($input['description'] ?? ''));

            if ($subjId === '' || $title === '') {
                $this->jsonResponse(['error' => 'Matière et Titre requis'], 400);
            }

            $pdfPath = $input['existing_pdf_path'] ?? null;
            if (isset($_FILES['pdf_file']) && $_FILES['pdf_file']['error'] === UPLOAD_ERR_OK) {
                $uploadDir = __DIR__ . '/../../public/uploads/exercises/';
                if (!is_dir($uploadDir)) mkdir($uploadDir, 0777, true);
                $name = uniqid() . '_ex_' . basename($_FILES['pdf_file']['name']);
                if (move_uploaded_file($_FILES['pdf_file']['tmp_name'], $uploadDir . $name)) {
                    $pdfPath = '/uploads/exercises/' . $name;
                }
            }

            try {
                if ($id) {
                    $stmt = $this->db->prepare("UPDATE exercises SET subject_id=?, series=?, title=?, description=?, type=?, difficulty=?, pdf_path=? WHERE id=?");
                    $stmt->execute([$subjId, json_encode($series), $title, $description, $type, $difficulty, $pdfPath, $id]);
                    $message = "Exercice mis à jour";
                } else {
                    $stmt = $this->db->prepare("INSERT INTO exercises (subject_id, series, title, description, type, difficulty, pdf_path) VALUES (?, ?, ?, ?, ?, ?, ?)");
                    $stmt->execute([$subjId, json_encode($series), $title, $description, $type, $difficulty, $pdfPath]);
                    $message = "Exercice ajouté avec succès";
                }
                $this->jsonResponse(['success' => true, 'message' => $message]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
        else if ($actualMethod === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM exercises WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true, 'message' => 'Exercice supprimé']);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => 'Erreur: ' . $e->getMessage()], 500);
            }
        }
    }
    
    public function series() {
        $this->requireAdmin();
        $method = $_SERVER['REQUEST_METHOD'];
        $id = $_GET['id'] ?? null;

        if ($method === 'GET') {
            $stmt = $this->db->query("SELECT * FROM series ORDER BY id ASC");
            $this->jsonResponse(['success' => true, 'series' => $stmt->fetchAll(PDO::FETCH_ASSOC)]);
        } 
        else if ($method === 'POST') {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['name'])) $this->jsonResponse(['error' => 'Nom de la série requis'], 400);

            try {
                $stmt = $this->db->prepare("INSERT INTO series (name) VALUES (?)");
                $stmt->execute([$input['name']]);
                $this->jsonResponse(['success' => true, 'id' => $this->db->lastInsertId()]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()], 500);
            }
        }
        else if ($method === 'PUT' && $id) {
            $input = json_decode(file_get_contents('php://input'), true);
            if (empty($input['name'])) $this->jsonResponse(['error' => 'Nom de la série requis'], 400);

            try {
                $stmt = $this->db->prepare("UPDATE series SET name = ? WHERE id = ?");
                $stmt->execute([$input['name'], $id]);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()], 500);
            }
        }
        else if ($method === 'DELETE' && $id) {
            try {
                $stmt = $this->db->prepare("DELETE FROM series WHERE id = ?");
                $stmt->execute([$id]);
                $this->jsonResponse(['success' => true]);
            } catch (\Exception $e) {
                $this->jsonResponse(['error' => $e->getMessage()], 500);
            }
        }
    }
}
