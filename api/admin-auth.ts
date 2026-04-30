type AdminAuthRequest = {
  password?: string;
};

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const adminPassword = process.env.ADMIN_PANEL_PASSWORD;
  if (!adminPassword) {
    return new Response("ADMIN_PANEL_PASSWORD is not configured", { status: 500 });
  }

  let body: AdminAuthRequest;
  try {
    body = (await request.json()) as AdminAuthRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  if (!body.password || body.password !== adminPassword) {
    return new Response("Unauthorized", { status: 401 });
  }

  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
