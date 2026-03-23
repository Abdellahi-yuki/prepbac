<?php
require_once __DIR__ . '/backend/config/config.php';
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);

    // Add subjects
    $subjects = [
        ['name' => 'Mathématiques', 'description' => 'Série C', 'icon' => 'BookOpen', 'color_theme' => '#667eea'],
        ['name' => 'Sciences Physiques', 'description' => 'Série C', 'icon' => 'FlaskConical', 'color_theme' => '#f5576c']
    ];

    foreach ($subjects as $s) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO subjects (name, description, icon, color_theme) VALUES (?, ?, ?, ?)");
        $stmt->execute([$s['name'], $s['description'], $s['icon'], $s['color_theme']]);
    }

    echo "Subjects seeded.\n";

    // Get subject IDs
    $stmt = $pdo->query("SELECT id, name FROM subjects");
    $subjectIds = [];
    while ($row = $stmt->fetch(PDO::FETCH_ASSOC)) {
        $subjectIds[$row['name']] = $row['id'];
    }

    // Add chapters
    if (isset($subjectIds['Mathématiques'])) {
        $chapters = [
            'Nombres Complexes',
            'Limites et Continuité',
            'Intégration',
            'Arithmétique'
        ];
        $id = $subjectIds['Mathématiques'];
        foreach ($chapters as $idx => $c) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO chapters (subject_id, title, description, order_index) VALUES (?, ?, '', ?)");
            $stmt->execute([$id, $c, $idx + 1]);
        }
    }

    if (isset($subjectIds['Sciences Physiques'])) {
        $chapters = [
            'Cinématique',
            'Dynamique',
            'Oscillateurs Mécaniques',
            'Radioactivité'
        ];
        $id = $subjectIds['Sciences Physiques'];
        foreach ($chapters as $idx => $c) {
            $stmt = $pdo->prepare("INSERT IGNORE INTO chapters (subject_id, title, description, order_index) VALUES (?, ?, '', ?)");
            $stmt->execute([$id, $c, $idx + 1]);
        }
    }

    echo "Chapters seeded.\n";

} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
