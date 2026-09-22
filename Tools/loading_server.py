"""
loading_server.py - Micro-serveur de page d'attente OptiCut Pro
Port : 8090  |  Stdlib Python pure (zero import lourd)
Lance instantanement (<200ms) et sert la page de chargement pendant
que le backend principal (port 8000) demarre en arriere-plan.
"""

import http.server
import os
import sys
import signal
import threading

# ---------------------------------------------------------------------------
# Configuration
# ---------------------------------------------------------------------------
HOST = "127.0.0.1"
PORT = 8090
BACKEND_HEALTH_URL = "http://localhost:8000/health"
BACKEND_APP_URL    = "http://localhost:8000/"

# ---------------------------------------------------------------------------
# Page HTML embarquee
# ---------------------------------------------------------------------------
HTML_PAGE = b"""<!DOCTYPE html>
<html lang="fr">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>OptiCut Pro \xe2\x80\x94 D\xc3\xa9marrage en cours\xe2\x80\xa6</title>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    body {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #0d0f14;
      font-family: 'Segoe UI', system-ui, -apple-system, sans-serif;
      color: #e2e8f0;
      overflow: hidden;
    }
    body::before {
      content: '';
      position: fixed;
      inset: 0;
      background:
        radial-gradient(ellipse 80% 60% at 20% 20%, rgba(59,130,246,.12) 0%, transparent 60%),
        radial-gradient(ellipse 60% 80% at 80% 80%, rgba(139,92,246,.10) 0%, transparent 60%);
      pointer-events: none;
      animation: bgPulse 6s ease-in-out infinite alternate;
    }
    @keyframes bgPulse { from { opacity:.7; } to { opacity:1; } }
    .card {
      position: relative;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      padding: 3.5rem 4rem;
      background: rgba(255,255,255,.04);
      border: 1px solid rgba(255,255,255,.08);
      border-radius: 1.5rem;
      backdrop-filter: blur(24px);
      box-shadow: 0 0 0 1px rgba(255,255,255,.04) inset, 0 32px 80px rgba(0,0,0,.5);
      max-width: 480px;
      width: 90vw;
      animation: cardIn .5s cubic-bezier(.22,1,.36,1) both;
    }
    @keyframes cardIn { from { opacity:0; transform:translateY(20px); } to { opacity:1; transform:translateY(0); } }
    .logo-area { display:flex; flex-direction:column; align-items:center; gap:.6rem; }
    .logo-icon {
      width: 64px; height: 64px;
      background: linear-gradient(135deg, #3b82f6 0%, #8b5cf6 100%);
      border-radius: 1rem;
      display: flex; align-items: center; justify-content: center;
      font-size: 2rem;
      box-shadow: 0 8px 32px rgba(59,130,246,.35);
    }
    .app-name {
      font-size: 1.6rem; font-weight: 700;
      background: linear-gradient(90deg, #60a5fa, #a78bfa);
      -webkit-background-clip: text; -webkit-text-fill-color: transparent; background-clip: text;
      letter-spacing: -.02em;
    }
    .app-version { font-size:.8rem; color:rgba(255,255,255,.35); letter-spacing:.08em; text-transform:uppercase; }
    .spinner-wrap { position:relative; width:72px; height:72px; }
    .spinner { width:72px; height:72px; animation:spin 1.4s linear infinite; }
    .spinner circle { fill:none; stroke-width:4; stroke-linecap:round; }
    .spinner .track { stroke:rgba(255,255,255,.08); }
    .spinner .arc { stroke:url(#grad); stroke-dasharray:120 180; stroke-dashoffset:0; animation:dash 1.4s ease-in-out infinite; }
    @keyframes spin { to { transform:rotate(360deg); } }
    @keyframes dash {
      0%   { stroke-dashoffset:0;    stroke-dasharray:30 270;  }
      50%  { stroke-dashoffset:-80;  stroke-dasharray:120 180; }
      100% { stroke-dashoffset:-210; stroke-dasharray:30 270;  }
    }
    .status-area { text-align:center; display:flex; flex-direction:column; gap:.4rem; }
    #statusText { font-size:1rem; font-weight:500; color:#cbd5e1; transition:color .3s; }
    #subText { font-size:.8rem; color:rgba(255,255,255,.35); min-height:1.2em; }
    .progress-bar { width:100%; height:3px; background:rgba(255,255,255,.06); border-radius:99px; overflow:hidden; }
    .progress-fill { height:100%; width:40%; background:linear-gradient(90deg,#3b82f6,#8b5cf6); border-radius:99px; animation:progress 1.8s ease-in-out infinite; }
    @keyframes progress { 0% { transform:translateX(-100%); } 100% { transform:translateX(350%); } }
    #errorPanel { display:none; flex-direction:column; align-items:center; gap:1rem; text-align:center; }
    #errorPanel.visible { display:flex; }
    .error-icon { font-size:2rem; }
    #errorMsg { font-size:.9rem; color:#f87171; line-height:1.5; }
    .retry-btn {
      padding:.55rem 1.5rem;
      background:linear-gradient(135deg,#3b82f6,#8b5cf6);
      border:none; border-radius:.6rem; color:#fff;
      font-size:.9rem; font-weight:600; cursor:pointer;
      transition:opacity .2s, transform .15s;
    }
    .retry-btn:hover { opacity:.85; transform:translateY(-1px); }
    .retry-btn:active { transform:translateY(0); }
    #loadingPanel { display:flex; flex-direction:column; align-items:center; gap:2rem; width:100%; }
    #loadingPanel.hidden { display:none; }
  </style>
</head>
<body>
<div class="card">
  <div class="logo-area">
    <div class="logo-icon">&#x2702;&#xFE0F;</div>
    <div class="app-name">OptiCut Pro</div>
    <div class="app-version">V6</div>
  </div>

  <div id="loadingPanel">
    <div class="spinner-wrap">
      <svg class="spinner" viewBox="0 0 72 72">
        <defs>
          <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%"   stop-color="#3b82f6"/>
            <stop offset="100%" stop-color="#8b5cf6"/>
          </linearGradient>
        </defs>
        <circle class="track" cx="36" cy="36" r="30"/>
        <circle class="arc"   cx="36" cy="36" r="30"/>
      </svg>
    </div>
    <div class="status-area">
      <div id="statusText">D&#xE9;marrage d&#x2019;OptiCut Pro&#x2026;</div>
      <div id="subText">Initialisation du moteur de d&#xE9;coupe</div>
    </div>
    <div class="progress-bar"><div class="progress-fill"></div></div>
  </div>

  <div id="errorPanel">
    <div class="error-icon">&#x26A0;&#xFE0F;</div>
    <div id="errorMsg">
      Le d&#xE9;marrage du backend prend plus de temps que pr&#xE9;vu.<br>
      V&#xE9;rifiez que le processus OptiCut Pro est bien en cours d&#x2019;ex&#xE9;cution.
    </div>
    <button class="retry-btn" id="retryBtn">&#x1F504; R&#xE9;essayer</button>
  </div>
</div>

<script>
  const HEALTH_URL    = 'http://localhost:8000/health';
  const APP_URL       = 'http://localhost:8000/';
  const POLL_INTERVAL = 800;
  const TIMEOUT_MS    = 90000;

  const statusText   = document.getElementById('statusText');
  const subText      = document.getElementById('subText');
  const loadingPanel = document.getElementById('loadingPanel');
  const errorPanel   = document.getElementById('errorPanel');
  const retryBtn     = document.getElementById('retryBtn');

  const hints = [
    'Initialisation du moteur de d\u00e9coupe',
    'Chargement des algorithmes d\u2019optimisation',
    'Pr\u00e9paration de l\u2019interface utilisateur',
    'Connexion aux bases de donn\u00e9es',
    'V\u00e9rification des param\u00e8tres syst\u00e8me',
    'Presque pr\u00eat\u2026',
  ];
  let hintIndex = 0;
  let hintTimer = null;
  let pollTimer    = null;
  let timeoutTimer = null;
  let redirecting  = false;

  function rotateHint() {
    hintIndex = (hintIndex + 1) % hints.length;
    subText.textContent = hints[hintIndex];
  }

  function showError() {
    clearInterval(pollTimer);
    clearInterval(hintTimer);
    clearTimeout(timeoutTimer);
    loadingPanel.classList.add('hidden');
    errorPanel.classList.add('visible');
  }

  function startPolling() {
    loadingPanel.classList.remove('hidden');
    errorPanel.classList.remove('visible');
    statusText.textContent = 'D\u00e9marrage d\u2019OptiCut Pro\u2026';
    subText.textContent    = hints[0];
    hintIndex   = 0;
    redirecting = false;

    hintTimer    = setInterval(rotateHint, 4000);
    timeoutTimer = setTimeout(showError, TIMEOUT_MS);

    pollTimer = setInterval(async () => {
      if (redirecting) return;
      try {
        const controller = new AbortController();
        const tid = setTimeout(() => controller.abort(), 1000);
        const resp = await fetch(HEALTH_URL, { method:'GET', signal:controller.signal, cache:'no-store' });
        clearTimeout(tid);
        if (resp.ok) {
          redirecting = true;
          clearInterval(pollTimer);
          clearInterval(hintTimer);
          clearTimeout(timeoutTimer);
          statusText.textContent = '\u2705 Pr\u00eat\u00a0! Ouverture de l\u2019application\u2026';
          subText.textContent    = '';
          setTimeout(() => { window.location.href = APP_URL; }, 300);
        }
      } catch (_) {
        // backend pas encore pret - continuer silencieusement
      }
    }, POLL_INTERVAL);
  }

  retryBtn.addEventListener('click', startPolling);
  startPolling();
</script>
</body>
</html>
"""

# ---------------------------------------------------------------------------
# Gestionnaire HTTP avec en-tetes CORS
# ---------------------------------------------------------------------------
class LoadingHandler(http.server.BaseHTTPRequestHandler):

    def log_message(self, format, *args):
        pass  # Silencieux

    def _cors(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "*")

    def do_OPTIONS(self):
        self.send_response(204)
        self._cors()
        self.end_headers()

    def do_GET(self):
        if self.path in ("/", "/index.html"):
            self.send_response(200)
            self.send_header("Content-Type", "text/html; charset=utf-8")
            self.send_header("Content-Length", str(len(HTML_PAGE)))
            self.send_header("Cache-Control", "no-store")
            self._cors()
            self.end_headers()
            self.wfile.write(HTML_PAGE)

        elif self.path == "/health":
            body = b'{"status":"ok","service":"loading_server"}'
            self.send_response(200)
            self.send_header("Content-Type", "application/json")
            self.send_header("Content-Length", str(len(body)))
            self._cors()
            self.end_headers()
            self.wfile.write(body)

        else:
            self.send_response(404)
            self.end_headers()
            self.wfile.write(b"Not found")


# ---------------------------------------------------------------------------
# Point d'entree
# ---------------------------------------------------------------------------
def save_pid(pid_path):
    os.makedirs(os.path.dirname(pid_path), exist_ok=True)
    with open(pid_path, "w") as f:
        f.write(str(os.getpid()))


def main():
    script_dir  = os.path.dirname(os.path.abspath(__file__))
    project_dir = os.path.dirname(script_dir)   # Tools -> racine projet
    pid_path    = os.path.join(project_dir, "Moteur", "UserData", "opticut_loading.pid")

    save_pid(pid_path)

    server = http.server.HTTPServer((HOST, PORT), LoadingHandler)

    def _shutdown(signum, frame):
        threading.Thread(target=server.shutdown, daemon=True).start()

    signal.signal(signal.SIGTERM, _shutdown)
    if hasattr(signal, "SIGBREAK"):
        signal.signal(signal.SIGBREAK, _shutdown)

    server.serve_forever()


if __name__ == "__main__":
    main()