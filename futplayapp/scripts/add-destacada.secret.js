const { Pool } = require("pg");
const pwd = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImNkaGJmeXF0dWJxbm1namRna2FiIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NTY1NzMzNCwiZXhwIjoyMDkxMjMzMzM0fQ.ii6AQg7UU5vPrPXboKko5-iIRPgiTc5uT3rzTYdSQfE";
const ref = "cdhbfyqtubqnmgjdgkab";

async function tryPool(user, host, port, extraOpts) {
  const pool = new Pool({
    host, port, database: "postgres", user, password: pwd,
    ssl: { rejectUnauthorized: false, ...extraOpts },
    connectionTimeoutMillis: 5000,
  });
  try {
    const c = await pool.connect();
    console.log("CONNECTED with", user, host, port);
    await c.query("ALTER TABLE capsula ADD COLUMN IF NOT EXISTS destacada BOOLEAN NOT NULL DEFAULT false");
    console.log("Column added!");
    c.release();
    await pool.end();
    return true;
  } catch (e) {
    console.log("FAIL:", user, host, port, "-", e.message.substring(0, 120));
    await pool.end().catch(() => {});
    return false;
  }
}

(async () => {
  const attempts = [
    { user: "postgres." + ref, host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, extra: {} },
    { user: "postgres", host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, extra: { servername: ref } },
    { user: "postgres." + ref, host: "aws-0-us-east-1.pooler.supabase.com", port: 6543, extra: { servername: ref } },
  ];
  for (const a of attempts) {
    if (await tryPool(a.user, a.host, a.port, a.extra)) return;
  }
  console.log("All failed");
})();
