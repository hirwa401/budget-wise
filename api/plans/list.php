<?php
// api/plans/list.php
require_once dirname(__DIR__) . '/config.php';

$body   = getBody();
$userId = (int)($body['user_id'] ?? 0);

if (!$userId) {
    respond(false, 'User ID is required.');
}

$pdo  = getDB();
$stmt = $pdo->prepare(
    'SELECT id, plan_name, period, income_type, income, currency,
            expenses, total_expenses, remaining, savings_percentage, notes, created_at
     FROM budget_plans
     WHERE user_id = ?
     ORDER BY created_at DESC'
);
$stmt->execute([$userId]);
$plans = $stmt->fetchAll();

// expenses is stored as JSON string in MySQL — leave as string,
// frontend will JSON.parse() it.
respond(true, '', ['plans' => $plans]);
