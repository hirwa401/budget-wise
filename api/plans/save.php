<?php
// api/plans/save.php
require_once dirname(__DIR__) . '/config.php';

$body    = getBody();
$userId  = (int)($body['user_id'] ?? 0);

if (!$userId) {
    respond(false, 'User ID is required.');
}

$planName          = trim($body['plan_name']  ?? 'My Plan');
$period            = $body['period']           ?? 'monthly';
$incomeType        = $body['income_type']      ?? 'salary';
$income            = (float)($body['income']  ?? 0);
$currency          = $body['currency']         ?? 'RWF';
$expenses          = $body['expenses']         ?? '[]';  // JSON string
$totalExpenses     = (float)($body['total_expenses']     ?? 0);
$remaining         = (float)($body['remaining']          ?? 0);
$savingsPercentage = (float)($body['savings_percentage'] ?? 0);
$notes             = trim($body['notes'] ?? '');

if ($income <= 0) {
    respond(false, 'Income must be greater than zero.');
}

// Ensure expenses is valid JSON string
if (is_array($expenses)) {
    $expenses = json_encode($expenses);
}

$pdo  = getDB();
$stmt = $pdo->prepare(
    'INSERT INTO budget_plans
     (user_id, plan_name, period, income_type, income, currency, expenses,
      total_expenses, remaining, savings_percentage, notes)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
);

$stmt->execute([
    $userId,
    $planName,
    $period,
    $incomeType,
    $income,
    $currency,
    $expenses,
    $totalExpenses,
    $remaining,
    $savingsPercentage,
    $notes ?: null,
]);

$planId = (int) $pdo->lastInsertId();

respond(true, 'Plan saved successfully.', ['plan_id' => $planId]);
