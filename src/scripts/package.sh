set -e

# === Empaquetar y subir send-notifications ===
echo "📦 Empaquetando Lambda: send-notifications..."

cd lambdas/send-notifications

# Instala dependencias de producción
npm install --production

# Copia carpetas compartidas
cp -r ../../shared ./shared
cp -r ../../config ./config

# Empaca en ZIP
zip -r ../send-notifications.zip .

# Sube el ZIP a AWS Lambda
aws lambda update-function-code \
  --function-name inferno-bank-dev-send-notifications \
  --zip-file fileb://../send-notifications.zip

# Vuelve a la raíz
cd ../../


# === Empaquetar y subir send-notifications-error ===
echo "📦 Empaquetando Lambda: send-notifications-error..."

cd lambdas/send-notifications-error

# Instala dependencias de producción
npm install --production

# Copia carpetas compartidas
cp -r ../../shared ./shared
cp -r ../../config ./config

# Empaca en ZIP
zip -r ../send-notifications-error.zip .

# Sube el ZIP a AWS Lambda
aws lambda update-function-code \
  --function-name inferno-bank-dev-send-notifications-error \
  --zip-file fileb://../send-notifications-error.zip

# Vuelve a la raíz
cd ../../

echo "✅ Deploy completado con éxito"