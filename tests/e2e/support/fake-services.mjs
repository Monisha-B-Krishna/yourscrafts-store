// Pretend Razorpay and Resend for the browser tests, so no real money or email moves.
//   Razorpay on 127.0.0.1:54399 — POST /v1/orders (needs your TEST key), GET /sign (signs a
//     payment the way Razorpay does, for the pretend payment window), GET /health
//   Resend   on 127.0.0.1:54398 — POST /emails (records it), GET /emails.json, GET /health
// Point the app at them in .env.local:
//   RAZORPAY_API_BASE=http://127.0.0.1:54399/v1   RESEND_API_BASE=http://127.0.0.1:54398
import http from "node:http";
import { createHmac, randomBytes } from "node:crypto";

const KEY_ID = process.env.RAZORPAY_KEY_ID;
const KEY_SECRET = process.env.RAZORPAY_KEY_SECRET;
if (!KEY_ID?.startsWith("rzp_test_") || !KEY_SECRET) {
  console.error("fake-services: RAZORPAY_KEY_ID must be a TEST key (rzp_test_...) and RAZORPAY_KEY_SECRET set.");
  process.exit(1);
}

const json = (res, status, body) => {
  res.writeHead(status, { "content-type": "application/json", "access-control-allow-origin": "*" });
  res.end(JSON.stringify(body));
};
const readBody = (req) =>
  new Promise((resolve) => {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => resolve(body));
  });

http
  .createServer(async (req, res) => {
    const url = new URL(req.url, "http://x");
    if (url.pathname === "/health") return json(res, 200, { ok: true });
    if (req.method === "POST" && url.pathname === "/v1/orders") {
      const expected = "Basic " + Buffer.from(`${KEY_ID}:${KEY_SECRET}`).toString("base64");
      if (req.headers.authorization !== expected) return json(res, 401, { error: { description: "Authentication failed" } });
      const input = JSON.parse(await readBody(req));
      if (!Number.isInteger(input.amount) || input.amount < 100 || input.currency !== "INR") {
        return json(res, 400, { error: { description: "bad amount" } });
      }
      const id = "order_" + randomBytes(7).toString("hex");
      return json(res, 200, { id, entity: "order", amount: input.amount, currency: "INR", receipt: input.receipt, status: "created" });
    }
    if (url.pathname === "/sign") {
      const sig = createHmac("sha256", KEY_SECRET)
        .update(`${url.searchParams.get("order")}|${url.searchParams.get("payment")}`)
        .digest("hex");
      res.writeHead(200, { "access-control-allow-origin": "*" });
      return res.end(sig);
    }
    json(res, 404, { error: "not found" });
  })
  .listen(54399, "127.0.0.1", () => console.log("pretend Razorpay on :54399"));

const emails = [];
http
  .createServer(async (req, res) => {
    if (req.url === "/health") return json(res, 200, { ok: true });
    if (req.url === "/emails.json") return json(res, 200, emails);
    if (req.method === "POST" && req.url === "/emails") {
      const m = JSON.parse(await readBody(req));
      emails.push({ to: [].concat(m.to).join(","), subject: m.subject, html: m.html });
      return json(res, 200, { id: `email_${emails.length}` });
    }
    json(res, 404, { error: "not found" });
  })
  .listen(54398, "127.0.0.1", () => console.log("pretend Resend on :54398"));
