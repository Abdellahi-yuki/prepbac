<?php
require_once __DIR__ . '/backend/config/config.php';
try {
    $dsn = "mysql:host=" . DB_HOST . ";dbname=" . DB_NAME . ";charset=utf8mb4";
    $pdo = new PDO($dsn, DB_USER, DB_PASS);
    
    $email = 'admin@prepbac.mr';
    $password = 'admin123';
    $first_name = 'Admin';
    $last_name = 'PrepBac';
    $role = 'admin';
    $series = 'C';
    $hash = password_hash($password, PASSWORD_BCRYPT);
    
    // Check if exists
    $stmt = $pdo->prepare("SELECT id FROM users WHERE email = ?");
    $stmt->execute([$email]);
    if ($stmt->fetch()) {
        $stmt = $pdo->prepare("UPDATE users SET password_hash = ?, role = ? WHERE email = ?");
        $stmt->execute([$hash, $role, $email]);
        echo "User updated.\n";
    } else {
        $stmt = $pdo->prepare("INSERT INTO users (first_name, last_name, email, password_hash, role, series) VALUES (?, ?, ?, ?, ?, ?)");
        $stmt->execute([$first_name, $last_name, $email, $hash, $role, $series]);
        echo "User created.\n";
    }
} catch (Exception $e) {
    echo "Error: " . $e->getMessage() . "\n";
}
