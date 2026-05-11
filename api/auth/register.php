<?php
// api/auth/register.php
require_once dirname(__DIR__) . '/config.php';

$body      = getBody();
$firstname = trim($body['firstname'] ?? '');
$lastname  = trim($body['lastname']  ?? '');
$email     = strtolower(trim($body['email'] ?? ''));
$password  = $body['password'] ?? '';
$currency  = $body['currency'] ?? 'RWF';
$country   = trim($body['country'] ?? 'Rwanda');

// Validate
if (!$firstname || !$email || !$password) {
    respond(false, 'First name, email and password are required.');
}
if (!filter_var($email, FILTER_VALIDATE_EMAIL)) {
    respond(false, 'Please enter a valid email address.');
}
if (strlen($password) < 8) {
    respond(false, 'Password must be at least 8 characters.');
}

$pdo = getDB();

// Check duplicate email
$check = $pdo->prepare('SELECT id FROM users WHERE email = ?');
$check->execute([$email]);
if ($check->fetch()) {
    respond(false, 'An account with this email already exists.');
}

// Insert user
$hash = password_hash($password, PASSWORD_BCRYPT, ['cost' => 12]);
$ins  = $pdo->prepare(
    'INSERT INTO users (firstname, lastname, email, password, currency, country) VALUES (?, ?, ?, ?, ?, ?)'
);
$ins->execute([$firstname, $lastname, $email, $hash, $currency, $country]);

$userId = (int) $pdo->lastInsertId();

$user = [
    'id'        => $userId,
    'firstname' => $firstname,
    'lastname'  => $lastname,
    'email'     => $email,
    'currency'  => $currency,
    'country'   => $country,
];

respond(true, 'Account created successfully.', ['user' => $user]);
