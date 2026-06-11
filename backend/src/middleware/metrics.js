import { httpRequestsTotal, httpRequestDuration } from "../metrics/prometheus.js";

export function metricsMiddleware(req, res, next) {
  const start = process.hrtime.bigint();

  res.on("finish", () => {
    const durationNs = Number(process.hrtime.bigint() - start);
    const durationSec = durationNs / 1e9;

    const route = req.route?.path || req.path || "unknown";
    const method = req.method;
    const status = res.statusCode.toString();

    httpRequestsTotal.labels(method, route, status).inc();
    httpRequestDuration.labels(method, route).observe(durationSec);
  });

  next();
}
