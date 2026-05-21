#!/bin/bash
set -e

echo "==> Reinstalación limpia del proyecto"
echo ""

# Verificar versión de Node
NODE_VERSION=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_VERSION" -lt 20 ] || [ "$NODE_VERSION" -gt 22 ]; then
  echo "⚠️  ADVERTENCIA: Node v$(node --version) no es compatible."
  echo "   Usa Node 20 LTS o Node 22 LTS."
  echo "   Instala nvm: curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.40.3/install.sh | bash"
  echo "   Luego: nvm install 22 && nvm use 22"
  echo ""
  read -p "¿Continuar de todas formas? (s/N): " confirm
  if [ "$confirm" != "s" ] && [ "$confirm" != "S" ]; then
    echo "Abortado."
    exit 1
  fi
fi

echo "==> Usando Node $(node --version) | npm $(npm --version)"
echo ""

# Limpiar
bash "$(dirname "$0")/clean.sh"
echo ""

# Reinstalar
echo "==> Instalando dependencias..."
npm install
echo "  ✓ Dependencias instaladas"

echo ""
echo "==> Reinstalación completa."
echo "   Ejecuta 'npm run doctor' para validar el entorno."
