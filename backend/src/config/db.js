import pg from "pg";

function getPgPassword() {
  if (process.env.PG_PASSWORD) return process.env.PG_PASSWORD;
  if (process.env.NODE_ENV === "production") {
    throw new Error("PG_PASSWORD environment variable is required in production");
  }
  return "tsmchat_secret";
}

const pool = new pg.Pool({
  host: process.env.PG_HOST || "localhost",
  port: parseInt(process.env.PG_PORT || "5432", 10),
  user: process.env.PG_USER || "tsmchat",
  password: getPgPassword(),
  database: process.env.PG_DATABASE || "tsmchat",
  max: 20,
  idleTimeoutMillis: 30000,
  connectionTimeoutMillis: 5000
});

pool.on("error", (err) => {
  console.error("Unexpected PostgreSQL pool error:", err);
});

export async function initPostgres() {
  try {
    const client = await pool.connect();
    console.log("PostgreSQL connected");
    client.release();
  } catch (err) {
    console.error("PostgreSQL connection failed:", err.message);
    console.warn("Continuing without PostgreSQL — will retry on queries");
  }
}

export default pool;
