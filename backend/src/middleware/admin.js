import { isAdminUser } from "../config/admin.js";

export function adminMiddleware(req, res, next) {
  if (!isAdminUser(req.user.email)) {
    return res.status(403).json({ error: "Admin access only" });
  }
  next();
}
