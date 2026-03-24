#!/bin/bash
set -e

# ============================================
# Electoral Maps - Deploy / Reset Script
# Uso: bash deploy.sh
# ============================================

PROJECT_DIR="$(cd "$(dirname "$0")" && pwd)"
BACKEND_DIR="$PROJECT_DIR/backend"
FRONTEND_DIR="$PROJECT_DIR/frontend"
VENV_DIR="$BACKEND_DIR/venv"

echo "========================================"
echo "  Electoral Maps - Deploy"
echo "========================================"

# --- 1. Git pull ---
echo ""
echo "[1/8] Actualizando repositorio..."
cd "$PROJECT_DIR"
git pull origin master

# --- 2. Backend: dependencias ---
echo ""
echo "[2/8] Instalando dependencias del backend..."
cd "$BACKEND_DIR"
if [ ! -d "$VENV_DIR" ]; then
    python3 -m venv venv
fi
source "$VENV_DIR/bin/activate"
pip install -r requirements.txt --quiet


# --- 5. Refresh cache de estadísticas ---
echo ""
echo "[5/8] Refrescando cache de estadísticas..."
python scripts/refresh_territorial_stats_cache.py

# --- 6. Frontend: build ---
echo ""
echo "[6/8] Compilando frontend..."
cd "$FRONTEND_DIR"
npm install --silent
npm run build

# --- 7. Reiniciar backend (systemd) ---
echo ""
echo "[7/8] Reiniciando backend..."
sudo systemctl restart electoral-maps

# --- 8. Reiniciar nginx ---
echo ""
echo "[8/8] Reiniciando nginx..."
sudo systemctl reload nginx

# --- Verificación ---
echo ""
echo "========================================"
echo "  Verificación"
echo "========================================"
sleep 2

if systemctl is-active --quiet electoral-maps; then
    echo "  Backend:  OK"
else
    echo "  Backend:  FALLO"
    echo "  Revisa:   sudo journalctl -u electoral-maps -n 20"
fi

if systemctl is-active --quiet nginx; then
    echo "  Nginx:    OK"
else
    echo "  Nginx:    FALLO"
    echo "  Revisa:   sudo nginx -t"
fi

IP=$(curl -s ifconfig.me 2>/dev/null || echo "no disponible")
echo ""
echo "  URL:      http://$IP"
echo "========================================"
echo "  Deploy completado!"
echo "========================================"
