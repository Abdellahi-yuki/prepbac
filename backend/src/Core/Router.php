<?php
namespace App\Core;

class Router {
    public function handleRequest($uri) {
        // 1. Separate path from query string
        $parsedUrl = parse_url($uri);
        $rawPath = $parsedUrl['path'] ?? '';

        // 2. Clean the path, removing '/api/index.php' or '/api' prefixes
        $path = str_replace(['/api/index.php', '/api'], '', $rawPath);
        $path = trim($path, '/');
        
        $parts = explode('/', $path);
        
        // Default controller & action
        $controllerName = 'Auth';
        $action = 'index';
        $args = [];

        // Special case: /admin/ai/... maps to AiController
        if (count($parts) >= 3 && $parts[0] === 'admin' && $parts[1] === 'ai') {
            // Convert pdf-to-html -> convertPdfToHtml (camelCase)
            $rawAction = $parts[2];
            $action = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $rawAction))));
            $controllerClass = "App\\Controllers\\AIController";
            $args = array_slice($parts, 3);

            if (class_exists($controllerClass)) {
                $controller = new $controllerClass();
                if (method_exists($controller, $action)) {
                    try {
                        call_user_func_array([$controller, $action], $args);
                    } catch (\Exception $e) {
                        $this->sendError(500, "Erreur Serveur: " . $e->getMessage());
                    }
                } else {
                    $this->sendError(404, "Action AI '$action' introuvable.");
                }
            } else {
                $this->sendError(404, "AiController introuvable.");
            }
            return;
        }
        
        // Special case: /ai/... maps to AIController or others AI controllers
        if (count($parts) >= 2 && $parts[0] === 'ai') {
            $rawAction = $parts[1];
            $action = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $rawAction))));
            $controllerClass = "App\\Controllers\\AIController";
            $args = array_slice($parts, 2);

            // Special handling for exercise generation
            if ($rawAction === 'generate-exercise' || $rawAction === 'generate') {
                $controllerClass = "App\\Controllers\\ExerciseGeneratorController";
                $action = 'generate';
            }

            if (class_exists($controllerClass)) {
                $controller = new $controllerClass();
                if (method_exists($controller, $action)) {
                    try {
                        call_user_func_array([$controller, $action], $args);
                    } catch (\Exception $e) {
                        $this->sendError(500, "Erreur Serveur: " . $e->getMessage());
                    }
                } else {
                    $this->sendError(404, "Action AI '$action' introuvable.");
                }
            } else {
                $this->sendError(404, "AIController introuvable.");
            }
            return;
        }
        
        if (!empty($parts[0])) {
            $controllerName = ucfirst($parts[0]);
        }
        
        if (isset($parts[1])) {
            $rawAction = $parts[1];
            // Convert kebab-case to camelCase: lesson-progress -> lessonProgress
            if (strpos($rawAction, '-') !== false) {
                $action = lcfirst(str_replace(' ', '', ucwords(str_replace('-', ' ', $rawAction))));
            } else {
                $action = $rawAction;
            }
        }
        
        if (count($parts) > 2) {
            $args = array_slice($parts, 2);
        }

        $controllerClass = "App\\Controllers\\{$controllerName}Controller";

        if (class_exists($controllerClass)) {
            $controller = new $controllerClass();
            if (method_exists($controller, $action)) {
                try {
                    // Support DELETE via X-HTTP-Method-Override or _method param
                    if ($_SERVER['REQUEST_METHOD'] === 'POST') {
                        $override = $_SERVER['HTTP_X_HTTP_METHOD_OVERRIDE']
                            ?? ($_POST['_method'] ?? null);
                        if ($override && in_array(strtoupper($override), ['PUT', 'DELETE'])) {
                            $_SERVER['REQUEST_METHOD'] = strtoupper($override);
                        }
                    }
                    call_user_func_array([$controller, $action], $args);
                } catch (\Exception $e) {
                    $this->sendError(500, "Erreur Serveur: " . $e->getMessage());
                }
            } else {
                $this->sendError(404, "Endpoint '$action' introuvable dans '$controllerName'.");
            }
        } else {
            $this->sendError(404, "Contrôleur '$controllerName' introuvable.");
        }
    }

    private function sendError($code, $message) {
        http_response_code($code);
        echo json_encode(["success" => false, "error" => $message]);
        exit;
    }
}
