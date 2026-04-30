type ExecuteRequest = {
  orderId: string;
  packageName: string;
  customerName: string;
  customerEmail: string;
  notes: string;
  addons: string[];
  amount: number;
  prompt: string;
};

export const config = {
  runtime: "edge",
};

export default async function handler(request: Request): Promise<Response> {
  if (request.method !== "POST") {
    return new Response("Method not allowed", { status: 405 });
  }

  const adminSecret = process.env.ADMIN_SECRET;
  const openAiKey = process.env.OPENAI_API_KEY;
  const incomingSecret = request.headers.get("x-admin-secret");

  if (!adminSecret || !openAiKey) {
    return new Response("Server is missing required environment variables", { status: 500 });
  }

  if (!incomingSecret || incomingSecret !== adminSecret) {
    return new Response("Unauthorized", { status: 401 });
  }

  let payload: ExecuteRequest;
  try {
    payload = (await request.json()) as ExecuteRequest;
  } catch {
    return new Response("Invalid JSON", { status: 400 });
  }

  const systemPrompt =
    "You are an Arabic business delivery assistant. Return useful, practical service output in Arabic with clear headings and concise steps.";

  const userPrompt = [
    payload.prompt,
    "",
    `Order ID: ${payload.orderId}`,
    `Package: ${payload.packageName}`,
    `Customer: ${payload.customerName}`,
    `Customer Email: ${payload.customerEmail}`,
    `Amount: $${payload.amount}`,
    `Addons: ${payload.addons.length > 0 ? payload.addons.join(" | ") : "None"}`,
    `Notes: ${payload.notes || "No notes"}`,
  ].join("\n");

  const openAiResponse = await fetch("https://api.openai.com/v1/responses", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${openAiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4.1-mini",
      input: [
        { role: "system", content: systemPrompt },
        { role: "user", content: userPrompt },
      ],
    }),
  });

  if (!openAiResponse.ok) {
    const errorBody = await openAiResponse.text();
    return new Response(errorBody || "OpenAI request failed", { status: 500 });
  }

  const data = await openAiResponse.json();
  const outputText =
    data.output_text || data.output?.[0]?.content?.[0]?.text || "تم إنشاء المخرجات بنجاح.";

  return new Response(JSON.stringify({ outputText }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
}
