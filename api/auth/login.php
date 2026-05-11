<?php
// api/auth/login.php
require_once dirname(__DIR__) . '/config.php';

$body    = getBody();
$email   = trim($body['email']   ?? '');
$password = $body['password'] ?? '';

if (!$email || !$password) {
    respond(false, 'Email and password are required.');
}

$pdo  = getDB();
$stmt = $pdo->prepare('SELECT id, firstname, lastname, email, password, currency, country FROM users WHERE email = ?');
$stmt->execute([$email]);
$user = $stmt->fetch();

if (!$user || !password_verify($password, $user['password'])) {
    respond(false, 'Invalid email or password.');
}

// Remove sensitive data before sending
unset($user['password']);

respond(true, 'Login successful.', ['user' => $user]);
