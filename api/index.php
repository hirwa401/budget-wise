<?php
// api/index.php - Main API entry point
require_once 'config.php';

// Simple health check
if ($_SERVER['REQUEST_METHOD'] === 'GET' && isset($_GET['health'])) {
    try {
        $pdo = getDB();
        $stmt = $pdo->query('SELECT 1');
        respond(true, 'API is healthy');
    } catch (Exception $e) {
        http_response_code(500);
        respond(false, 'Database connection failed');
    }
    exit;
}

// If no specific endpoint matched, return 404
http_response_code(404);
respond(false, 'API endpoint not found');
?>