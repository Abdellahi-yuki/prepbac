#!/bin/bash

# Configuration des couleurs
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Lancement du projet PrepBac ===${NC}"

# Vérifier si le port 8000 est utilisé
if lsof -Pi :8000 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}[!] Port 8000 déjà utilisé. Tentative de fermeture...${NC}"
    fuser -k 8000/tcp
fi

# Vérifier si le port 5173 est utilisé
if lsof -Pi :5173 -sTCP:LISTEN -t >/dev/null ; then
    echo -e "${RED}[!] Port 5173 déjà utilisé. Tentative de fermeture...${NC}"
    fuser -k 5173/tcp
fi

# Lancer le Backend (PHP)
echo -e "${GREEN}[+] Lancement du Backend (Port 8000)...${NC}"
php -S localhost:8000 \
    -t backend/api/ \
    -d upload_max_filesize=500M \
    -d post_max_size=510M \
    -d max_execution_time=600 \
    -d memory_limit=512M \
    backend/api/index.php > /dev/null 2>&1 &
BACKEND_PID=$!

# Lancer le Frontend (Vite)
echo -e "${GREEN}[+] Lancement du Frontend (Port 5173)...${NC}"
cd frontend && npm run dev -- --port 5173 > /dev/null 2>&1 &
FRONTEND_PID=$!

echo -e "${BLUE}------------------------------------------${NC}"
echo -e "${GREEN}✓ Projet démarré avec succès !${NC}"
echo -e "Backend running on: ${BLUE}http://localhost:8000${NC}"
echo -e "Frontend running on: ${BLUE}http://localhost:5173${NC}"
echo -e "${BLUE}------------------------------------------${NC}"
echo -e "Appuyez sur ${RED}Ctrl+C${NC} pour arrêter les deux serveurs."

# Gérer l'arrêt propre
trap "kill $BACKEND_PID $FRONTEND_PID; echo -e '\n${RED}Serveurs arrêtés.${NC}'; exit" INT
wait
