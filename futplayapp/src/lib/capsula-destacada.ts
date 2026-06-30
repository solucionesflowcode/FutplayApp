import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), ".data");
const DATA_FILE = path.join(DATA_DIR, "capsula-destacada.json");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

export async function getCapsulaDestacadaId(): Promise<string | null> {
  try {
    ensureDir();
    if (!fs.existsSync(DATA_FILE)) return null;
    const raw = fs.readFileSync(DATA_FILE, "utf-8");
    const data = JSON.parse(raw);
    return data.capsula_id || null;
  } catch {
    return null;
  }
}

export async function setCapsulaDestacadaId(capsulaId: string | null): Promise<boolean> {
  try {
    ensureDir();
    const body = capsulaId ? { capsula_id: capsulaId } : {};
    fs.writeFileSync(DATA_FILE, JSON.stringify(body, null, 2), "utf-8");
    return true;
  } catch {
    return false;
  }
}
