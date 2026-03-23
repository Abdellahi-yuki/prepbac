<?php
namespace App\Controllers;

use App\Core\Database;
use App\Utils\JWT;

class AIController {
    private $db;
    private $userId;
    private $settingsFile;

    public function __construct() {
        // Silencing deprecation warnings to prevent invalid JSON output
        error_reporting(E_ALL & ~E_DEPRECATED);
        
        $token = JWT::getBearerToken();
        $payload = JWT::decode($token ?: '', JWT_SECRET);
        if (!$payload) {
            $this->jsonResponse(['error' => 'Non autorisé'], 401);
        }
        $this->userId = $payload['user_id'];
        $this->db = Database::getInstance()->getConnection();
        $this->settingsFile = __DIR__ . '/../../config/settings.json';
        error_log("[AI] Controller initialized for User: " . $this->userId);
    }

    private function jsonResponse($data, $status = 200) {
        http_response_code($status);
        echo json_encode($data);
        exit;
    }

    private function getEnv($key, $default = null) {
        $envFile = __DIR__ . '/../../.env';
        if (file_exists($envFile)) {
            $lines = file($envFile, FILE_IGNORE_NEW_LINES | FILE_SKIP_EMPTY_LINES);
            foreach ($lines as $line) {
                $line = trim($line);
                if (strpos($line, '#') === 0 || !strpos($line, '=')) continue;
                list($name, $value) = explode('=', $line, 2);
                $name = trim($name);
                $value = trim(explode('#', $value)[0]); // remove comments
                $value = trim($value, "'\"");
                if ($name === $key) return $value;
            }
        }
        return $default;
    }

    // POST /ai/chat
    public function chat() {
        $input = json_decode(file_get_contents('php://input'), true);
        $message = $input['message'] ?? '';
        $toolType = $input['tool'] ?? null;
        $conversationId = $input['conversation_id'] ?? null;

        error_log("[AI] chat() called. Tool: " . ($toolType ?: 'NONE') . " Conv: " . ($conversationId ?: 'NEW'));
        error_log("[AI] Message: " . $message);

        if (!$message) $this->jsonResponse(['error' => 'Message vide'], 400);
        
        $history = ["attachments" => [], "body" => []];

        // Load history from DB
        if ($conversationId) {
            $stmt = $this->db->prepare("SELECT messages FROM ai_conversations WHERE id = ? AND user_id = ?");
            $stmt->execute([$conversationId, $this->userId]);
            $conv = $stmt->fetch(\PDO::FETCH_ASSOC);
            if ($conv) {
                $history = json_decode($conv['messages'] ?? '{"attachments":[], "body":[]}', true);
                if (is_array($history) && isset($history[0])) {
                    $history = ["attachments" => [], "body" => $history];
                }
            }
        }

        $apiKey = $this->getEnv('GROQ_API_KEY');
        // Create new conversation if none exists
        if (!$conversationId) {
            $title = substr($message, 0, 30) . '...';
            $stmt = $this->db->prepare("INSERT INTO ai_conversations (user_id, title, messages) VALUES (?, ?, ?)");
            $stmt->execute([$this->userId, $title, json_encode($history, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE)]);
            $conversationId = $this->db->lastInsertId();
            error_log("[AI] Created new conversation: $conversationId");
        }

        $apiKey = $this->getEnv('GROQ_API_KEY');
        if (!$apiKey) $this->jsonResponse(['reply' => "⚠️ Erreur: Clé Groq manquante."]);

        // --- PHASE 1: DISCOVERY (If Tool Selected) ---
        if ($toolType && in_array($toolType, ['exam', 'lesson', 'exercise'])) {
            error_log("[AI] Starting Phase 1 (Discovery) for tool: $toolType");
            $matchedIds = $this->discoveryPhase($toolType, $message, $apiKey);
            error_log("[AI] Phase 1 Matched IDs: " . json_encode($matchedIds));
            
            if (!empty($matchedIds)) {
                foreach ($matchedIds as $id) {
                    $docKey = "{$toolType}-{$id}";
                    if (!in_array($docKey, $history['attachments'] ?? [])) {
                        // --- PHASE 2: EXTRACTION ---
                        error_log("[AI] Starting Phase 2 (Extraction) for: $docKey");
                        $extraction = $this->extractionPhase($toolType, $id, $apiKey);
                        
                        if ($extraction) {
                            $content = $extraction['content'];
                            $title = $extraction['title'];
                            
                            // Format requested by user: Attachment , bac-c-2021:${bac}
                            $history['body'][] = [
                                'role' => 'system', 
                                'content' => "Attachment , {$title}:{$content}"
                            ];
                            
                            if (!isset($history['attachments'])) $history['attachments'] = [];
                            $history['attachments'][] = $docKey;
                            error_log("[AI] Phase 2 Success for: $docKey");
                        } else {
                            error_log("[AI] Phase 2 FAILED for: $docKey");
                        }
                    } else {
                        error_log("[AI] $docKey already in attachments");
                    }
                }
            }
        }

        // --- PHASE 3: FINAL CHAT ---
        error_log("[AI] Starting Phase 3 (Final Chat)");
        $systemPrompt = "Tu es un tuteur académique expert pour le Bac en Mauritanie. "
            . "Tu réponds en français de manière pédagogique et structurée. Utilise le Markdown. "
            . "CONSIGNE MATHÉMATIQUE : Utilise TOUJOURS la syntaxe LaTeX pour les expressions mathématiques. "
            . "- Utilise \$ \$ (ex: \$x^2\$) pour le texte en ligne. "
            . "- Utilise \$\$ \$\$ (ex: \$\$\\frac{1}{2}\$\$) pour les formules isolées ou importantes. "
            . "Si des extraits de documents (énoncés, leçons) sont présents dans le contexte (rôle system), utilise-les comme source unique de vérité.";

        $messages = [['role' => 'system', 'content' => $systemPrompt]];
        foreach ($history['body'] as $h) {
            $messages[] = ['role' => $h['role'], 'content' => $h['content']];
        }
        $messages[] = ['role' => 'user', 'content' => $message];

        $reply = $this->callGroq($apiKey, 'llama-3.3-70b-versatile', $messages);
        error_log("[AI] Phase 3 Success");

        // Update history and save to DB
        $history['body'][] = ['role' => 'user', 'content' => $message];
        $history['body'][] = ['role' => 'assistant', 'content' => $reply];

        $stmt = $this->db->prepare("UPDATE ai_conversations SET messages = ?, updated_at = CURRENT_TIMESTAMP WHERE id = ? AND user_id = ?");
        $stmt->execute([json_encode($history, JSON_UNESCAPED_UNICODE | JSON_INVALID_UTF8_SUBSTITUTE), $conversationId, $this->userId]);
        error_log("[AI] Conversation $conversationId updated");

        $this->jsonResponse([
            'reply' => $reply,
            'conversation_id' => $conversationId
        ]);
    }

    // Router maps /ai/conversations to conversations()
    public function conversations($id = null) {
        $method = $_SERVER['REQUEST_METHOD'];

        if ($method === 'GET') {
            if ($id) {
                // Get single conversation
                $stmt = $this->db->prepare("SELECT * FROM ai_conversations WHERE id = ? AND user_id = ?");
                $stmt->execute([$id, $this->userId]);
                $conv = $stmt->fetch(\PDO::FETCH_ASSOC);
                if (!$conv) $this->jsonResponse(['error' => 'introuvable'], 404);
                
                $messages = json_decode($conv['messages'] ?? '{"attachments":[], "body":[]}', true);
                if (is_array($messages) && isset($messages[0])) {
                    $messages = ["attachments" => [], "body" => $messages];
                }
                $conv['messages'] = $messages;
                $this->jsonResponse($conv);
            } else {
                // List conversations
                $stmt = $this->db->prepare("SELECT id, title, updated_at FROM ai_conversations WHERE user_id = ? ORDER BY updated_at DESC");
                $stmt->execute([$this->userId]);
                $this->jsonResponse($stmt->fetchAll(\PDO::FETCH_ASSOC));
            }
        } elseif ($method === 'POST') {
            // Create
            $input = json_decode(file_get_contents('php://input'), true);
            $title = $input['title'] ?? 'Nouvelle discussion';
            $stmt = $this->db->prepare("INSERT INTO ai_conversations (user_id, title, messages) VALUES (?, ?, ?)");
            $stmt->execute([$this->userId, $title, json_encode(['attachments' => [], 'body' => []])]);
            $this->jsonResponse(['success' => true, 'id' => $this->db->lastInsertId()]);
        } elseif ($method === 'DELETE') {
            // Delete
            if (!$id) $this->jsonResponse(['error' => 'ID manquant'], 400);
            $stmt = $this->db->prepare("DELETE FROM ai_conversations WHERE id = ? AND user_id = ?");
            $stmt->execute([$id, $this->userId]);
            $this->jsonResponse(['success' => true]);
        }

        $this->jsonResponse(['error' => 'Méthode non supportée'], 405);
    }

    private function discoveryPhase($type, $userMessage, $apiKey) {
        // Fetch candidates for this user's series
        $userSeriesId = $this->getUserSeries();
        
        $stmt = $this->db->prepare("SELECT name FROM series WHERE id = ?");
        $stmt->execute([$userSeriesId]);
        $seriesName = $stmt->fetchColumn() ?: "Inconnue";

        error_log("[AI] Discovery: Type=$type, Series=$seriesName (ID:$userSeriesId)");
        $candidates = [];
        
        if ($type === 'exam') {
            $stmt = $this->db->prepare("SELECT e.id, CONCAT('Bac ', e.year, ' ', s.name) as title FROM exams e JOIN subjects s ON e.subject_id = s.id WHERE JSON_CONTAINS(e.series, ?)");
            $stmt->execute([json_encode((int)$userSeriesId)]);
            $candidates = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } else if ($type === 'lesson') {
            $stmt = $this->db->prepare("SELECT l.id, l.title FROM lessons l JOIN subjects s ON l.subject_id = s.id WHERE JSON_CONTAINS(s.series, ?)");
            $stmt->execute([json_encode((int)$userSeriesId)]);
            $candidates = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        } else if ($type === 'exercise') {
            $stmt = $this->db->prepare("SELECT ex.id, ex.title FROM exercises ex WHERE JSON_CONTAINS(ex.series, ?)");
            $stmt->execute([json_encode((int)$userSeriesId)]);
            $candidates = $stmt->fetchAll(\PDO::FETCH_ASSOC);
        }

        if (empty($candidates)) {
            error_log("[AI] No candidates found in DB for series $seriesName");
            return [];
        }

        $candidatesStr = "";
        foreach ($candidates as $c) {
            $candidatesStr .= "- ID: {$c['id']}, Titre: {$c['title']} (Série {$seriesName})\n";
        }
        
        error_log("[AI] Candidates fetched: " . count($candidates));
        error_log("[AI] Candidates List:\n$candidatesStr");

        $prompt = "Tu es un expert en identification de documents académiques pour le Bac en Mauritanie. "
            . "Voici une liste de documents disponibles dans notre base de données : \n" . $candidatesStr 
            . "\nL'utilisateur demande : \"{$userMessage}\".\n"
            . "CONSIGNE CRITIQUE : Trouve les IDs des documents les plus pertinents pour répondre à cette demande. "
            . "Ignore tes connaissances générales; base-toi UNIQUEMENT sur la liste fournie ci-dessus. "
            . "Si l'utilisateur mentionne une année, une matière ou une série, utilise ces critères de manière stricte."
            . "Retourne UNIQUEMENT un tableau JSON des IDs, par exemple [5]. Retourne [] si aucun ne correspond absolument.";

        error_log("[AI] Discovery Prompt sent to Groq (Llama-3.3-70b)");
        $reply = $this->callGroq($apiKey, 'llama-3.3-70b-versatile', [['role' => 'user', 'content' => $prompt]]);
        error_log("[AI] Raw Discovery Reply: " . $reply);

        // Robust JSON parsing (handles potential markdown or text)
        $ids = [];
        if (preg_match('/\[\s*(\d+\s*,\s*)*\d*\s*\]/', $reply, $matches)) {
            $ids = json_decode($matches[0], true);
        } else {
            $ids = json_decode($reply, true);
        }
        
        error_log("[AI] Discovey Final IDs: " . json_encode($ids ?: []));
        return is_array($ids) ? $ids : [];
    }

    private function extractionPhase($type, $id, $apiKey) {
        $pdfPath = null;
        $title = "doc-{$id}";
        
        if ($type === 'exam') {
            $stmt = $this->db->prepare("SELECT e.pdf_statement_url, CONCAT('Bac ', e.year, ' ', s.name) as title FROM exams e JOIN subjects s ON e.subject_id = s.id WHERE e.id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $pdfPath = $row['pdf_statement_url'] ?? null;
            $title = $row['title'] ?? $title;
        } else if ($type === 'lesson') {
            $stmt = $this->db->prepare("SELECT pdf_url, title FROM lessons WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $pdfPath = $row['pdf_url'] ?? null;
            $title = $row['title'] ?? $title;
        } else if ($type === 'exercise') {
            $stmt = $this->db->prepare("SELECT pdf_path, title FROM exercises WHERE id = ?");
            $stmt->execute([$id]);
            $row = $stmt->fetch(\PDO::FETCH_ASSOC);
            $pdfPath = $row['pdf_path'] ?? null;
            $title = $row['title'] ?? $title;
        }

        if (!$pdfPath) {
            error_log("[AI] PDF path missing for $type ID $id");
            return null;
        }
        
        // Resolve absolute path
        $fullPath = __DIR__ . '/../../public' . $pdfPath;
        if (!file_exists($fullPath)) {
            error_log("[AI] PDF file not found at: $fullPath");
            return null;
        }

        error_log("[AI] Converting multi-page PDF to images: $fullPath");
        $files = $this->pdfToImage($fullPath);
        if (empty($files)) {
            error_log("[AI] PDF to Image conversion failed or returned no files");
            return null;
        }

        $tmpDir = __DIR__ . '/../../../tmp/';
        if (!is_dir($tmpDir)) mkdir($tmpDir, 0777, true);

        $concatenatedContent = "";
        foreach ($files as $index => $file) {
            $pageNum = $index + 1;
            $imageUrl = $file['Url'];
            error_log("[AI] Processing Page $pageNum: $imageUrl");
            
            // Store intermediate image in tmp/
            $imageFile = "{$type}-{$id}-p{$pageNum}.jpg";
            $imagePath = $tmpDir . $imageFile;
            file_put_contents($imagePath, file_get_contents($imageUrl));
            
            error_log("[AI] Extracting content from Page $pageNum...");
            $imageData = base64_encode(file_get_contents($imagePath));
            
            $messages = [
                [
                    'role' => 'user',
                    'content' => [
                        ['type' => 'text', 'text' => "Décris précisément le contenu de cette page ($pageNum) du document. Ne répète pas les informations des pages précédentes si possible, mais sois exhaustif sur les nouveaux éléments."],
                        ['type' => 'image_url', 'image_url' => ['url' => "data:image/jpeg;base64,{$imageData}"]]
                    ]
                ]
            ];

            $pageContent = $this->callGroq($apiKey, 'meta-llama/llama-4-scout-17b-16e-instruct', $messages, true);
            if ($pageContent) {
                $concatenatedContent .= "\n--- PAGE $pageNum ---\n" . $pageContent;
            }
        }
        
        if ($concatenatedContent) {
            // Store concatenated text in tmp/
            $textFile = "{$type}-{$id}.txt";
            $textPath = $tmpDir . $textFile;
            file_put_contents($textPath, $concatenatedContent);
            error_log("[AI] Full extracted text stored at: $textPath");
            
            return [
                'content' => $concatenatedContent,
                'title' => $title
            ];
        }

        return null;
    }

    private function pdfToImage($pdfPath) {
        $convertApiKey = $this->getEnv('CONVERTAPI_API_KEY');
        if (!$convertApiKey) return null;

        $url = "https://v2.convertapi.com/convert/pdf/to/jpg?secret=" . $convertApiKey;
        $ch = curl_init($url);
        
        $data = [
            'File' => new \CURLFile($pdfPath),
            'StoreFile' => 'true'
        ];

        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, $data);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);

        $response = curl_exec($ch);
        $err = curl_error($ch);
        if ($err) error_log("[AI] ConvertAPI cURL Error: $err");
        
        $data = json_decode($response, true);
        return $data['Files'] ?? [];
    }

    private function callGroq($apiKey, $model, $messages, $isVision = false) {
        $ch = curl_init("https://api.groq.com/openai/v1/chat/completions");
        
        $payload = ['model' => $model];
        if ($isVision) {
            $payload['messages'] = $messages;
        } else {
            $payload['messages'] = $messages;
            $payload['temperature'] = 0.7;
        }
        
        curl_setopt($ch, CURLOPT_POST, true);
        curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
        curl_setopt($ch, CURLOPT_HTTPHEADER, [
            "Authorization: Bearer " . $apiKey,
            "Content-Type: application/json"
        ]);
        curl_setopt($ch, CURLOPT_RETURNTRANSFER, true);
        curl_setopt($ch, CURLOPT_TIMEOUT, 60);
        
        $response = curl_exec($ch);
        $err = curl_error($ch);
        if ($err) error_log("[AI] Groq cURL Error: $err");
        
        $data = json_decode($response, true);
        if (isset($data['error'])) {
            error_log("[AI] Groq API Error: " . json_encode($data['error']));
        }

        return $data['choices'][0]['message']['content'] ?? "";
    }

    private function getUserSeries() {
        $stmt = $this->db->prepare("SELECT series FROM users WHERE id = ?");
        $stmt->execute([$this->userId]);
        return $stmt->fetchColumn();
    }
}
