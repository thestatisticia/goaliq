// Kill stale dev ports on Windows before starting
const { execSync } = require("child_process");

const PORTS = [3000, 3001];

for (const port of PORTS) {
  try {
    const out = execSync(`netstat -ano | findstr :${port}`, { encoding: "utf8" });
    const lines = out.split("\n").filter((l) => l.includes("LISTENING"));
    const pids = new Set();
    for (const line of lines) {
      const pid = line.trim().split(/\s+/).pop();
      if (pid && pid !== "0") pids.add(pid);
    }
    for (const pid of pids) {
      try {
        execSync(`taskkill /PID ${pid} /F`, { stdio: "ignore" });
        console.log(`Freed port ${port} (PID ${pid})`);
      } catch { /* already gone */ }
    }
  } catch { /* no process on port */ }
}
