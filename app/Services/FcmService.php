<?php

namespace App\Services;

use Illuminate\Support\Facades\Http;

class FcmService
{
    /**
     * Kirim push notification ke perangkat target menggunakan Firebase HTTP v1.
     */
    public static function sendPush($token, $title, $body, array $data = [])
    {
        if (empty($token)) {
            return false;
        }

        $serviceAccountPath = storage_path('app/firebase-service-account.json');
        if (!file_exists($serviceAccountPath)) {
            return false;
        }

        $serviceAccount = json_decode(file_get_contents($serviceAccountPath), true);
        if (!$serviceAccount) {
            return false;
        }

        $projectId = $serviceAccount['project_id'] ?? null;
        if (!$projectId) {
            return false;
        }

        $accessToken = self::getAccessToken($serviceAccount);
        if (!$accessToken) {
            return false;
        }

        $url = "https://fcm.googleapis.com/v1/projects/{$projectId}/messages:send";

        // Tambahkan metadata routing untuk Flutter jika ada
        $payloadData = array_merge([
            'click_action' => 'FLUTTER_NOTIFICATION_CLICK',
        ], $data);

        $response = Http::withHeaders([
            'Authorization' => "Bearer {$accessToken}",
            'Content-Type' => 'application/json',
        ])->post($url, [
            'message' => [
                'token' => $token,
                'notification' => [
                    'title' => $title,
                    'body' => $body,
                ],
                'data' => array_map('strval', $payloadData),
                'android' => [
                    'priority' => 'high',
                    'notification' => [
                        'sound' => 'notif_sound',
                        'channel_id' => 'posbankum_high_channel',
                    ],
                ],
                'apns' => [
                    'payload' => [
                        'aps' => [
                            'sound' => 'default',
                        ],
                    ],
                ],
            ],
        ]);

        return $response->successful();
    }

    /**
     * Dapatkan Access Token OAuth 2.0 dari Google Auth Server menggunakan JWT.
     */
    private static function getAccessToken(array $serviceAccount)
    {
        $privateKey = $serviceAccount['private_key'] ?? null;
        $clientEmail = $serviceAccount['client_email'] ?? null;

        if (!$privateKey || !$clientEmail) {
            return null;
        }

        $header = json_encode(['alg' => 'RS256', 'typ' => 'JWT']);
        $now = time();
        $payload = json_encode([
            'iss' => $clientEmail,
            'scope' => 'https://www.googleapis.com/auth/firebase.messaging',
            'aud' => 'https://oauth2.googleapis.com/token',
            'exp' => $now + 3600,
            'iat' => $now,
        ]);

        $base64UrlHeader = self::base64UrlEncode($header);
        $base64UrlPayload = self::base64UrlEncode($payload);

        $signatureInput = $base64UrlHeader . "." . $base64UrlPayload;
        $signature = '';

        if (!openssl_sign($signatureInput, $signature, $privateKey, 'SHA256')) {
            return null;
        }

        $base64UrlSignature = self::base64UrlEncode($signature);
        $jwt = $signatureInput . "." . $base64UrlSignature;

        $response = Http::asForm()->post('https://oauth2.googleapis.com/token', [
            'grant_type' => 'urn:ietf:params:oauth:grant-type:jwt-bearer',
            'assertion' => $jwt,
        ]);

        if ($response->successful()) {
            return $response->json()['access_token'] ?? null;
        }

        return null;
    }

    private static function base64UrlEncode($data)
    {
        return str_replace(['+', '/', '='], ['-', '_', ''], base64_encode($data));
    }
}
