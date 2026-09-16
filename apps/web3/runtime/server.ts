import { createServer } from "node:http";

const service = process.env.METRON_SERVICE ?? "web3-runtime";
const port = Number(process.env.PORT ?? 8787);
const ready = process.env.METRON_RUNTIME_READY === "true";

const server = createServer((request, response) => {
  if (request.url === "/health") {
    response.writeHead(200, { "content-type": "application/json" });
    response.end(JSON.stringify({ service, status: "alive" }));
    return;
  }
  if (request.url === "/ready") {
    response.writeHead(ready ? 200 : 503, { "content-type": "application/json" });
    response.end(JSON.stringify({ service, ready, financialReadiness: false }));
    return;
  }
  response.writeHead(404);
  response.end();
});

server.listen(port, "0.0.0.0", () => {
  console.log(JSON.stringify({ service, port, status: "listening" }));
});
