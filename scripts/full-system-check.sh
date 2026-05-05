#!/bin/bash

set -e

echo "======================================="
echo "🔍 FULL SYSTEM CHECK — CENTRO-HOGAR"
echo "======================================="

CORE_URL="http://localhost:6100"
BACKEND_CONTAINER="centro-hogar-backend"

EMAIL="andresjalvar93@gmail.com"
PASSWORD="Coreytaylor1"

echo ""
echo "1️⃣ Checking exposed ports..."

curl -s $CORE_URL/health >/dev/null && echo "✅ Core-Hogar OK ($CORE_URL/health)" || echo "❌ Core-Hogar FAIL"
curl -s http://localhost >/dev/null && echo "✅ Frontend OK (http://localhost)" || echo "❌ Frontend FAIL"

echo "⚠️ Backend (6000) no expuesto → se testea internamente"

echo ""
echo "2️⃣ Login (desde contenedor backend)..."

LOGIN_RESPONSE=$(docker exec -i $BACKEND_CONTAINER sh -c \
"curl -s -X POST http://localhost:6000/api/auth/login \
-H 'Content-Type: application/json' \
-d '{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}'")

TOKEN=$(echo $LOGIN_RESPONSE | grep -o '"token":"[^"]*"' | cut -d '"' -f4)

if [ -z "$TOKEN" ]; then
  echo "❌ No se pudo obtener JWT"
  echo "$LOGIN_RESPONSE"
  exit 1
fi

echo "✅ JWT obtenido"

echo ""
echo "3️⃣ Validando JWT contra Core..."

VALIDATE=$(curl -s -H "Authorization: Bearer $TOKEN" $CORE_URL/auth/validate)
echo "$VALIDATE"

USER_ID=$(echo "$VALIDATE" | grep -o '"user_id":"\?[0-9]*' | grep -o '[0-9]*')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
  echo "❌ No se pudo extraer user_id"
  exit 1
fi

echo "✅ JWT válido en Core"
echo "👤 user_id detectado: $USER_ID"

echo ""
echo "4️⃣ Probando /profile..."
curl -s -H "Authorization: Bearer $TOKEN" $CORE_URL/profile | jq

echo ""
echo "5️⃣ Probando /apps..."
curl -s -H "Authorization: Bearer $TOKEN" $CORE_URL/apps | jq

echo ""
echo "6️⃣ Enviando notificaciones (simulación apps)..."

echo "📤 Boslei..."
curl -s -X POST $CORE_URL/events/notification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"source_app\":\"boslei\",\"message\":\"Evento de prueba desde Boslei\"}"

echo ""

echo "📤 Piggy-Bank..."
curl -s -X POST $CORE_URL/events/notification \
  -H "Content-Type: application/json" \
  -d "{\"user_id\":$USER_ID,\"source_app\":\"piggy-bank\",\"message\":\"Alerta financiera desde Piggy\"}"

echo ""

echo ""
echo "7️⃣ Validando notificaciones..."

NOTIFS=$(curl -s -H "Authorization: Bearer $TOKEN" $CORE_URL/notifications)
echo "$NOTIFS" | jq

COUNT=$(echo "$NOTIFS" | grep -o '"id"' | wc -l)

if [ "$COUNT" -ge 2 ]; then
  echo "✅ Notificaciones recibidas correctamente ($COUNT)"
else
  echo "❌ Faltan notificaciones (esperadas ≥2, actuales: $COUNT)"
fi

echo ""
echo "8️⃣ Check logs recientes..."

docker logs core-hogar --since 2m 2>&1 | grep -iE 'error|exception|fatal' && \
echo "❌ Hay errores en logs" || \
echo "✅ Logs limpios"

echo ""
echo "======================================="
echo "✅ CHECK COMPLETADO"
echo "======================================="