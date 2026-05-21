#!/bin/bash
set -e

echo "==> Limpiando proyecto..."

rm -rf node_modules
echo "  ✓ node_modules eliminado"

rm -rf .expo
echo "  ✓ caché de Expo eliminada"

npm cache clean --force 2>/dev/null || true
echo "  ✓ caché de npm limpiada"

# Limpia caché de Metro si existe
rm -rf /tmp/metro-* 2>/dev/null || true
rm -rf "$TMPDIR/metro-cache" 2>/dev/null || true
echo "  ✓ caché de Metro limpiada"

echo ""
echo "Limpieza completa. Ejecuta 'npm install' para reinstalar dependencias."
