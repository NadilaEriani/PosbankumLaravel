// Debug helper to validate webhook connectivity from browser/runtime.
// Not used by the app by default.

export async function debugWebhookConnectivity(webhookUrl) {
  const res = await fetch(webhookUrl, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ message: 'test', sessionId: 'debug', source: 'website' }),
  });

  const text = await res.text();
  let json;
  try {
    json = JSON.parse(text);
  } catch {
    json = null;
  }

  return {
    ok: res.ok,
    status: res.status,
    statusText: res.statusText,
    raw: text,
    json,
  };
}

