// utils/mqtt.js
const mqtt = require('mqtt');

// Prefer env, fallback to public broker with proper protocol
const MQTT_URL = process.env.MQTT_URL || 'mqtt://test.mosquitto.org:1883';
const MQTT_USERNAME = process.env.MQTT_USERNAME;
const MQTT_PASSWORD = process.env.MQTT_PASSWORD;

const options = {
  reconnectPeriod: 2000,
  queueQoSZero: true,
  maxPacketSize: 65536
};

if (MQTT_USERNAME) options.username = MQTT_USERNAME;
if (MQTT_PASSWORD) options.password = MQTT_PASSWORD;

// Singleton client
const client = mqtt.connect(MQTT_URL, options);

client.on('connect', () => {
  console.log('[MQTT] Connected:', MQTT_URL);
});

client.on('reconnect', () => {
  console.log('[MQTT] Reconnecting...');
});

client.on('error', (err) => {
  console.error('[MQTT] Error:', err.message);
});

/**
 * Publish a message to a topic. Any payload type is accepted; objects will be JSON-stringified.
 * @param {string} topic
 * @param {any} message
 * @param {Object} [opts]
 * @returns {Promise<void>}
 */
function publish(topic, message, opts = { qos: 0, retain: false }) {
  return new Promise((resolve, reject) => {
    let payload = message;
    if (typeof message === 'object') {
      try { payload = JSON.stringify(message); } catch (_) { payload = String(message); }
    } else if (typeof message !== 'string' && !Buffer.isBuffer(message)) {
      payload = String(message);
    }

    client.publish(topic, payload, opts, (err) => {
      if (err) return reject(err);
      resolve();
    });
  });
}

module.exports = { client, publish };
