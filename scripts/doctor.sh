#!/bin/bash

echo "=== Diagnóstico del proyecto ==="
echo ""
echo "Node:    $(node --version)"
echo "npm:     $(npm --version)"
echo "Expo:    $(npx expo --version 2>/dev/null || echo 'no disponible')"
echo ""

# Verificar Node LTS
NODE_MAJOR=$(node --version | sed 's/v//' | cut -d. -f1)
if [ "$NODE_MAJOR" -ge 20 ] && [ "$NODE_MAJOR" -le 22 ]; then
  echo "✓ Node version compatible"
else
  echo "✗ Node version NO compatible. Usa Node 20 o 22 LTS (actual: $(node --version))"
fi

# Verificar node_modules
if [ -d "node_modules" ]; then
  CORRUPT=$(ls node_modules | grep " " | wc -l | tr -d ' ')
  if [ "$CORRUPT" -gt 0 ]; then
    echo "✗ node_modules corrompido: $CORRUPT directorios con nombres inválidos"
    echo "  Solución: npm run reinstall"
  else
    echo "✓ node_modules parece íntegro"
  fi
else
  echo "⚠ node_modules no existe. Ejecuta: npm install"
fi

# Verificar lockfile duplicado
if [ -f "package-lock 2.json" ]; then
  echo "✗ Encontrado 'package-lock 2.json' duplicado. Elimínalo."
fi

echo ""
echo "=== expo-doctor ==="
npx expo-doctor@latest 2>&1
