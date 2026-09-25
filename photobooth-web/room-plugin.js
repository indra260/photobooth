const rooms = new Map();

function readBody(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (c) => chunks.push(c));
    req.on("end", () => resolve(globalThis.Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

function send(res, code, body, type = "application/json") {
  res.statusCode = code;
  res.setHeader("content-type", type);
  res.end(body);
}

function room(code) {
  if (!rooms.has(code)) rooms.set(code, { shots: [], guests: 0 });
  return rooms.get(code);
}

export function roomPlugin() {
  return {
    name: "booth-room",
    configureServer(server) {
      server.middlewares.use(async (req, res, next) => {
        const url = new URL(req.url, "http://local");
        const code = (url.searchParams.get("code") || "").toUpperCase();
        if (url.pathname === "/api/room" && req.method === "GET") {
          if (!/^[A-Z0-9]{4}$/.test(code)) return send(res, 400, "{\"error\":\"kode\"}");
          const data = room(code);
          return send(res, 200, JSON.stringify({ guests: data.guests, shots: data.shots.length }));
        }
        if (url.pathname === "/api/room/join" && req.method === "POST") {
          if (!/^[A-Z0-9]{4}$/.test(code)) return send(res, 400, "{\"error\":\"kode\"}");
          room(code).guests += 1;
          return send(res, 200, "{\"ok\":true}");
        }
        if (url.pathname === "/api/room/shot" && req.method === "POST") {
          if (!/^[A-Z0-9]{4}$/.test(code)) return send(res, 400, "{\"error\":\"kode\"}");
          const body = await readBody(req);
          if (body.length > 1_500_000) return send(res, 413, "{\"error\":\"besar\"}");
          const data = room(code);
          data.shots.push(body.toString("utf8"));
          if (data.shots.length > 8) data.shots.shift();
          return send(res, 200, "{\"ok\":true}");
        }
        if (url.pathname === "/api/room/shots" && req.method === "GET") {
          if (!rooms.has(code)) return send(res, 200, "{\"shots\":[]}");
          const data = rooms.get(code);
          const shots = data.shots.splice(0);
          return send(res, 200, JSON.stringify({ shots, guests: data.guests }));
        }
        next();
      });
    },
  };
}
