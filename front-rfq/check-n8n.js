#!/usr/bin/env node

/**
 * Script para verificar el estado de n8n
 */

import https from 'https';

const N8N_URL = 'https://n8n.beaienergy.com';
const WEBHOOK_PATH = '/webhook-test/rfq';

function checkN8nStatus() {
  console.log('🔍 Verificando estado de n8n en producción...\n');

  // Verificar si n8n está corriendo
  const url = new URL(N8N_URL);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = https.request(options, (res) => {
    console.log(`✅ n8n está accesible en ${N8N_URL}`);
    console.log(`📊 Status: ${res.statusCode}`);

    // Verificar el webhook
    checkWebhook();
  });

  req.on('error', (err) => {
    console.log(`❌ n8n NO está accesible en ${N8N_URL}`);
    console.log('💡 Solución: Verifica la conexión a internet y que n8n esté corriendo');
  });

  req.on('timeout', () => {
    console.log('⏰ Timeout: n8n no responde');
    req.destroy();
  });

  req.end();
}

function checkWebhook() {
  console.log('\n🔍 Verificando webhook...');

  const postData = JSON.stringify({
    test: 'connection'
  });

  const url = new URL(N8N_URL + WEBHOOK_PATH);

  const options = {
    hostname: url.hostname,
    port: 443,
    path: url.pathname,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 5000
  };

  const req = https.request(options, (res) => {
    console.log(`📊 Webhook response: ${res.statusCode}`);

    if (res.statusCode === 404) {
      console.log('❌ Webhook no encontrado o no activo');
      console.log('💡 Solución:');
      console.log('   1. Accede a n8n en https://n8n.beaienergy.com');
      console.log('   2. Crea un nodo Webhook en el workflow');
      console.log('   3. Configura el path como "webhook-test/rfq"');
      console.log('   4. En modo test: haz click en "Execute workflow"');
    } else if (res.statusCode === 200) {
      console.log('✅ Webhook está activo y funcionando');
    } else {
      console.log(`⚠️ Respuesta inesperada: ${res.statusCode}`);
    }
  });

  req.on('error', (err) => {
    console.log('❌ Error conectando al webhook:', err.message);
  });

  req.on('timeout', () => {
    console.log('⏰ Timeout conectando al webhook');
    req.destroy();
  });

  req.write(postData);
  req.end();
}

// Ejecutar verificación
checkN8nStatus();
