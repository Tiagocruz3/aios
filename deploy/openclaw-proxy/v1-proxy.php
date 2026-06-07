<?php
/**
 * OpenClaw API reverse proxy for shared hosting (no mod_proxy needed).
 *
 * Forwards requests for /v1/* on this Hostinger site to the real OpenClaw
 * gateway, so the existing website keeps serving at / while the OpenAI-
 * compatible API becomes reachable at https://<your-site>/v1/...
 *
 * Setup:
 *   1. Upload this file to your site root (same folder as index.html).
 *   2. Add the routing rule from .htaccess (in this folder) so /v1/* hits it.
 *   3. Set the upstream below (or the OPENCLAW_UPSTREAM env var) to the gateway
 *      address reachable FROM THIS SERVER, e.g. http://127.0.0.1:18789
 *
 * The client's Authorization: Bearer <token> header is forwarded as-is; this
 * proxy never stores or logs the token.
 */

declare(strict_types=1);

// Gateway base URL reachable from THIS server (no trailing slash).
$UPSTREAM = getenv('OPENCLAW_UPSTREAM') ?: 'http://127.0.0.1:18789';

$requestUri = $_SERVER['REQUEST_URI'] ?? '/';
$path = parse_url($requestUri, PHP_URL_PATH) ?: '/';
$query = $_SERVER['QUERY_STRING'] ?? '';

// Only proxy the API namespace.
if (strpos($path, '/v1/') !== 0) {
    http_response_code(404);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Not found']);
    exit;
}

$target = rtrim($UPSTREAM, '/') . $path . ($query !== '' ? '?' . $query : '');
$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
$body = file_get_contents('php://input');

// Forward request headers (drop hop-by-hop / host-specific ones).
$skip = ['host', 'content-length', 'connection', 'accept-encoding'];
$forwardHeaders = [];
if (function_exists('getallheaders')) {
    foreach (getallheaders() as $name => $value) {
        if (in_array(strtolower($name), $skip, true)) {
            continue;
        }
        $forwardHeaders[] = $name . ': ' . $value;
    }
}

$ch = curl_init($target);
curl_setopt_array($ch, [
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $forwardHeaders,
    CURLOPT_POSTFIELDS => $body,
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_HEADER => true,
    CURLOPT_TIMEOUT => 120,
    CURLOPT_FOLLOWLOCATION => false,
]);

$response = curl_exec($ch);
if ($response === false) {
    http_response_code(502);
    header('Content-Type: application/json');
    echo json_encode(['error' => 'Upstream request failed: ' . curl_error($ch)]);
    curl_close($ch);
    exit;
}

$status = (int) curl_getinfo($ch, CURLINFO_HTTP_CODE);
$headerSize = (int) curl_getinfo($ch, CURLINFO_HEADER_SIZE);
$rawHeaders = substr($response, 0, $headerSize);
$respBody = substr($response, $headerSize);
curl_close($ch);

http_response_code($status);
// Pass through the upstream content-type so JSON stays JSON.
foreach (explode("\r\n", $rawHeaders) as $h) {
    if (stripos($h, 'Content-Type:') === 0) {
        header($h, true);
    }
}
echo $respBody;
