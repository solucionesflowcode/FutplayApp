import { createClient } from "./node_modules/@supabase/supabase-js/dist/index.cjs";
import fs from "fs";
const env = fs.readFileSync(".env.local", "utf8");
const get = (k) => { const m = env.match(new RegExp(`^${k}=(.*)$`, "m")); return m ? m[1].replace(/\s*$/, "") : null; };
const supabase = createClient(get("NEXT_PUBLIC_SUPABASE_URL"), get("SUPABASE_SERVICE_ROLE_KEY"));

const { data: clases, error } = await supabase
  .from("clase")
  .select("id, titulo, fecha_hora, cupo_maximo, tipo_evento")
  .gte("fecha_hora", "2026-09-04T00:00:00")
  .lte("fecha_hora", "2026-09-04T23:59:59")
  .order("fecha_hora");
console.log("clases 4 sept:", JSON.stringify(clases, null, 2), error ? error.message : "");
