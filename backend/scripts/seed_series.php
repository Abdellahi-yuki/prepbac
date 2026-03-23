<?php
require_once __DIR__ . '/backend/config/config.php';
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);

    // 1. Insert series
    $series = ['C', 'D'];
    foreach ($series as $s) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO series (name) VALUES (?)");
        $stmt->execute([$s]);
    }

    // 2. Insert the specific 7 subjects
    $subjects = [
        ['name' => 'Mathématiques', 'icon' => 'BookOpen', 'color_theme' => '#667eea'],
        ['name' => 'Sciences naturelles', 'icon' => 'FlaskConical', 'color_theme' => '#43e97b'],
        ['name' => 'Physique et Chimie', 'icon' => 'Atom', 'color_theme' => '#f5576c'],
        ['name' => 'Français', 'icon' => 'Languages', 'color_theme' => '#a18cd1'],
        ['name' => 'Arabe', 'icon' => 'Languages', 'color_theme' => '#fbc2eb'],
        ['name' => 'Anglais', 'icon' => 'Languages', 'color_theme' => '#ffd1ff'],
        ['name' => 'Éducation islamique', 'icon' => 'Library', 'color_theme' => '#20b2aa'],
    ];

    foreach ($subjects as $s) {
        $stmt = $pdo->prepare("INSERT IGNORE INTO subjects (name, icon, color_theme) VALUES (?, ?, ?)");
        $stmt->execute([$s['name'], $s['icon'], $s['color_theme']]);
    }

    echo "Series and Subjects seeded.\n";

    // 3. Associate all subjects with both series C and D
    $stmt = $pdo->query("INSERT IGNORE INTO series_subjects (series_id, subject_id)
                         SELECT series.id, subjects.id
                         FROM series CROSS JOIN subjects
                         WHERE subjects.name IN (
                             'Mathématiques', 'Sciences naturelles', 'Physique et Chimie',
                             'Français', 'Arabe', 'Anglais', 'Éducation islamique'
                         )");
    echo "Associated 7 subjects with both series.\n";
    
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
