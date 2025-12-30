#!/usr/bin/env node

/**
 * Script para verificar el estado de n8n
 */

import http from 'http';

const N8N_HOST = 'localhost';
const N8N_PORT = 5678;
const WEBHOOK_PATH = '/webhook/rfq';

function checkN8nStatus() {
  console.log('🔍 Verificando estado de n8n...\n');

  // Verificar si n8n está corriendo
  const options = {
    hostname: N8N_HOST,
    port: N8N_PORT,
    path: '/',
    method: 'GET',
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log('✅ n8n está corriendo en http://localhost:5678');
    console.log(`📊 Status: ${res.statusCode}`);

    // Verificar el webhook
    checkWebhook();
  });

  req.on('error', (err) => {
    console.log('❌ n8n NO está corriendo en http://localhost:5678');
    console.log('💡 Solución: Ejecuta n8n en otra terminal con:');
    console.log('   n8n start');
    console.log('\n🔧 O verifica que n8n esté corriendo en el puerto correcto');
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

  const options = {
    hostname: N8N_HOST,
    port: N8N_PORT,
    path: WEBHOOK_PATH,
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Content-Length': Buffer.byteLength(postData)
    },
    timeout: 5000
  };

  const req = http.request(options, (res) => {
    console.log(`📊 Webhook response: ${res.statusCode}`);

    if (res.statusCode === 404) {
      console.log('❌ Webhook no encontrado');
      console.log('💡 Solución:');
      console.log('   1. Crea un nodo Webhook en n8n');
      console.log('   2. Configura el path como "rfq"');
      console.log('   3. En modo test: haz click en "Execute workflow"');
    } else if (res.statusCode === 200) {
      console.log('✅ Webhook está activo');
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
