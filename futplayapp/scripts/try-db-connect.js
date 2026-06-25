const { Pool } = require("pg");
const ref = "cdhbfyqtubqnmgjdgkab";
const pwd =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";

const users = ["postgres." + ref, ref, "postgres", ref + ".postgres"];

async function tryUser(user) {
  const pool = new Pool({
    connectionString:
      "postgresql://" +
      user +
      ":" +
      encodeURIComponent(pwd) +
      "@aws-0-us-east-1.pooler.supabase.com:6543/postgres",
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 5000,
  });
  try {
    const c = await pool.connect();
    console.log("CONNECTED:", user);
    await c.query(
      "ALTER TABLE capsula ADD COLUMN IF NOT EXISTS destacada BOOLEAN NOT NULL DEFAULT false"
    );
    console.log("Column added!");
    c.release();
    await pool.end();
    return true;
  } catch (e) {
    console.log("FAIL:", user, "-", e.message.substring(0, 120));
    await pool.end().catch(() => {});
    return false;
  }
}

(async () => {
  for (const u of users) {
    if (await tryUser(u)) process.exit(0);
  }
  // Try direct hostname
  const pool2 = new Pool({
    host: ref + ".supabase.co",
    port: 5432,
    database: "postgres",
    user: "postgres",
    password: pwd,
    ssl: { rejectUnauthorized: false },
    connectionTimeoutMillis: 8000,
  });
  try {
    const c = await pool2.connect();
    console.log("CONNECTED direct!");
    await c.query(
      "ALTER TABLE capsula ADD COLUMN IF NOT EXISTS destacada BOOLEAN NOT NULL DEFAULT false"
    );
    console.log("Column added!");
    c.release();
    await pool2.end();
    process.exit(0);
  } catch (e) {
    console.log("FAIL direct:", e.message.substring(0, 120));
    await pool2.end().catch(() => {});
  }
  console.log("All failed");
  process.exit(1);
})();
