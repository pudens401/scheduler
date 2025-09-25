#define MQTT_MAX_PACKET_SIZE 4096 
#include <WiFi.h>
#include <WebServer.h>
#include <EEPROM.h>
#include <Wire.h>
#include <RTClib.h>
#include <ArduinoOTA.h>
#include <ArduinoJson.h>
#include <SPIFFS.h>
#include <WiFiClientSecure.h>
#include <HTTPClient.h>
#include <PubSubClient.h>

// ---------- WiFi Config ----------
const char* SSID_AP = "RNG02";
const char* PASS_AP = "12345678";
String deviceId = "RNG02";
const uint16_t WIFI_TIMEOUT = 10000;
const size_t EEPROM_SIZE = 128;

const char* isrg_root_x1 = \
"-----BEGIN CERTIFICATE-----\n" \
"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\n" \
"-----END CERTIFICATE-----\n";



WebServer server(80);

struct Credentials {
  char ssid[32];
  char password[32];
} credentials;

// ---------- RTC ----------
RTC_DS3231 rtc;

// ---------- Pinouts (ESP32 GPIOs) ----------
#define silentBtn 25       // silent button with pullup
#define connectionLed 27
#define ONled 14
#define silentLed 13
#define relayPin 26       
#define ringLed 12
#define ringBtn 33

// ---------- Scheduling ----------
int scheduleHours[100];
int scheduleMinutes[100];
int scheduleCount = 0;
bool alreadyExecuted[100] = {false};

// ---------- API ----------
const char* API_URL = "https://smart-scheduler-s5q7.onrender.com/schedule/RNG02";

// ---------- MQTT ----------
const char* MQTT_SERVER = "test.mosquitto.org";
const int   MQTT_PORT   = 1883;
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// Topics
const char* TOPIC_RING     = "GD/RNG/V2/RING/RNG02";
const char* TOPIC_SILENT   = "GD/RNG/V2/SILENT/RNG02";
const char* TOPIC_SCHEDULE = "GD/RNG/V2/SCHEDULE/RNG02";
const char* TOPIC_TIME     = "GD/RNG/V2/TIME/RNG02";

// ---------- States ----------
bool silentMode = false;
bool relayActive = false;
unsigned long relayOnTime = 0;

// retry timers
unsigned long lastWiFiCheck = 0;
unsigned long lastMQTTCheck = 0;
unsigned long lastStatusBlink = 0;
bool ledBlinkState = false;

// ---------- SPIFFS ----------
bool saveScheduleToSPIFFS() {
  File file = SPIFFS.open("/schedule.json", FILE_WRITE);
  if (!file) {
    Serial.println("Failed to open /schedule.json for write");
    return false;
  }

  StaticJsonDocument<256> doc;
  JsonArray times = doc.createNestedArray("times");
  for (int i = 0; i < scheduleCount; i++) {
    char buf[6];
    sprintf(buf, "%02d:%02d", scheduleHours[i], scheduleMinutes[i]);
    times.add(buf);
  }
  if (serializeJson(doc, file) == 0) {
    Serial.println("Failed to write JSON to SPIFFS");
    file.close();
    return false;
  }
  file.close();
  return true;
}

bool loadScheduleFromSPIFFS() {
  if (!SPIFFS.exists("/schedule.json")) {
    Serial.println("No schedule.json in SPIFFS");
    return false;
  }
  File file = SPIFFS.open("/schedule.json", FILE_READ);
  if (!file) {
    Serial.println("Failed to open /schedule.json for read");
    return false;
  }

  StaticJsonDocument<256> doc;
  DeserializationError err = deserializeJson(doc, file);
  file.close();
  if (err) {
    Serial.print("Failed to parse schedule.json: ");
    Serial.println(err.c_str());
    return false;
  }

  JsonArray times = doc["times"];
  scheduleCount = 0;
  for (JsonVariant v : times) {
    String t = v.as<String>();
    if (t.length() < 5) continue;
    int hour = t.substring(0, 2).toInt();
    int minute = t.substring(3, 5).toInt();
    if (scheduleCount < 100) {
      scheduleHours[scheduleCount] = hour;
      scheduleMinutes[scheduleCount] = minute;
      alreadyExecuted[scheduleCount] = false;
      scheduleCount++;
    }
  }
  Serial.println("loaded schedule from SPIFFS");
  return scheduleCount > 0;
}

// ---------- API Fetch ----------
bool fetchScheduleFromAPI() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("Not connected to WiFi, cannot fetch schedule");
    return false;
  }

  WiFiClientSecure client;
  //client.setInsecure();
  client.setCACert(isrg_root_x1);
  HTTPClient https;

  if (!https.begin(client, API_URL)) {
    Serial.println("HTTPS begin failed");
    return false;
  }

  https.addHeader("User-Agent", "ESP32Client/1.0");
  https.addHeader("Accept", "application/json");

  int httpCode = https.GET();
  if (httpCode != HTTP_CODE_OK) {
    Serial.print("HTTP GET failed, code: ");
    Serial.println(httpCode);
    https.end();
    return false;
  }

  String payload = https.getString();
  StaticJsonDocument<512> doc;
  DeserializationError err = deserializeJson(doc, payload);
  if (err) {
    Serial.print("Failed to parse API JSON: ");
    Serial.println(err.c_str());
    https.end();
    return false;
  }

  // Expecting either an array or object with "times"
  scheduleCount = 0;
  if (doc.containsKey("times")) {
    JsonArray timesArray = doc["times"];
    for (JsonVariant t : timesArray) {
      String timeStr;
      if (t.is<const char*>() || t.is<String>()) {
        timeStr = t.as<String>();
      } else if (t.is<JsonObject>() && t.as<JsonObject>().containsKey("time")) {
        timeStr = t["time"].as<String>();
      } else {
        continue;
      }

      if (timeStr.length() < 5) continue;
      int hour = timeStr.substring(0, 2).toInt();
      int minute = timeStr.substring(3, 5).toInt();
      if (scheduleCount < 100 ) {
        scheduleHours[scheduleCount] = hour;
        scheduleMinutes[scheduleCount] = minute;
        alreadyExecuted[scheduleCount] = false;
        scheduleCount++;
      }
    }
    saveScheduleToSPIFFS();
    https.end();
    Serial.println("Fetched schedule from API");
    return true;
  }

  https.end();
  Serial.println("API JSON did not contain times");
  return false;
}

// ---------- EEPROM ----------
bool saveWiFiCredentials(const String& ssid, const String& pass) {
  if (ssid.length() > 31 || pass.length() > 31) return false;
  EEPROM.begin(EEPROM_SIZE);
  Credentials temp;
  memset(&temp, 0, sizeof(Credentials));
  ssid.toCharArray(temp.ssid, sizeof(temp.ssid));
  pass.toCharArray(temp.password, sizeof(temp.password));
  EEPROM.put(0, temp);
  bool success = EEPROM.commit();
  EEPROM.end();
  return success;
}

bool loadWiFiCredentials() {
  EEPROM.begin(EEPROM_SIZE);
  EEPROM.get(0, credentials);
  EEPROM.end();
  return strlen(credentials.ssid) > 0 && strlen(credentials.password) > 0;
}

// ---------- Web ----------
void handleRoot() {
  String html = R"rawliteral(
    <!DOCTYPE html><html><head><title>WiFi Setup</title>
    <meta name='viewport' content='width=device-width, initial-scale=1'>
    <style>body{font-family:Arial;}input{margin:5px;}</style></head>
    <body><h2>ESP32 WiFi Setup</h2>
    <form action='/save' method='POST'>
      <input name='ssid' placeholder='SSID' required><br>
      <input name='pass' type='password' placeholder='Password' required><br>
      <input type='submit' value='Save'>
    </form></body></html>
  )rawliteral";
  server.send(200, "text/html", html);
}

void handleSave() {
  if (!server.hasArg("ssid") || !server.hasArg("pass")) {
    server.send(400, "text/plain", "Missing credentials");
    return;
  }
  String ssid = server.arg("ssid");
  String pass = server.arg("pass");
  if (saveWiFiCredentials(ssid, pass)) {
    server.send(200, "text/plain", "Saved. Restarting...");
    delay(1000);
    ESP.restart();
  } else {
    server.send(500, "text/plain", "Failed to save credentials");
  }
}

void startAPMode() {
  WiFi.disconnect(true);
  WiFi.mode(WIFI_AP);
  WiFi.softAP(SSID_AP, PASS_AP);

  server.on("/", HTTP_GET, handleRoot);
  server.on("/save", HTTP_POST, handleSave);

  server.begin();
  Serial.print("Started AP: ");
  Serial.println(SSID_AP);
}

// ---------- WiFi ----------
bool connectWiFi() {
  if (!loadWiFiCredentials()) {
    Serial.println("No stored WiFi credentials");
    return false;
  }
  WiFi.mode(WIFI_STA);
  WiFi.begin(credentials.ssid, credentials.password);

  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < WIFI_TIMEOUT) {
    delay(100);
  }
  if (WiFi.status() == WL_CONNECTED) {
    Serial.print("Connected to WiFi: ");
    Serial.println(credentials.ssid);
    return true;
  } else {
    Serial.println("WiFi connect timed out");
    return false;
  }
}

// ---------- Ringer ----------
void triggerRing() {
  Serial.println("Ring triggered");
  digitalWrite(relayPin, LOW); // assuming active LOW
  digitalWrite(ringLed, HIGH);
  relayActive = true;
  relayOnTime = millis();
}

void updateRelay() {
  if (relayActive && millis() - relayOnTime >= 50000) {
    digitalWrite(relayPin, HIGH);
    digitalWrite(ringLed, LOW);
    relayActive = false;
  }
}

// ---------- Silent Toggle ----------
void toggleSilent() {
  silentMode = !silentMode;
  digitalWrite(silentLed, silentMode ? HIGH : LOW);
  Serial.print("Silent mode: ");
  Serial.println(silentMode ? "ON" : "OFF");
}

// ---------- Weekend Check ----------
bool isWeekend(DateTime now) {
  // Sunday = 0, Saturday = 6
  return (now.dayOfTheWeek() == 0 || now.dayOfTheWeek() == 6);
}

void printCurrentTime() {
  DateTime now = rtc.now();
  char buf[20];
  sprintf(buf, "%02d:%02d:%02d %02d/%02d/%04d", 
          now.hour(), now.minute(), now.second(),
          now.day(), now.month(), now.year());
  Serial.print("Current time: ");
  Serial.println(buf);
}


// ---------- MQTT ----------
void mqttCallback(char* topic, byte* payload, unsigned int length) {
  String t = String(topic);
  Serial.print("MQTT msg on: ");
  Serial.println(t);

  // Convert payload to string
  String msg;
  for (unsigned int i = 0; i < length; i++) {
    msg += (char)payload[i];
  }
  Serial.print("Payload: ");
  Serial.println(msg);

  if (t == TOPIC_RING) {
    triggerRing();
  }
  else if (t == TOPIC_SILENT) {
    toggleSilent();
  }
  else if (t == TOPIC_SCHEDULE) {
    StaticJsonDocument<4096> doc;
    DeserializationError err = deserializeJson(doc, msg);
    if (err) {
      Serial.print("Failed to parse schedule JSON from MQTT: ");
      Serial.println(err.c_str());
      return;
    }

    // Reset schedule
    scheduleCount = 0;

    if (doc.containsKey("times")) {
      JsonArray timesArray = doc["times"];
      for (JsonVariant t : timesArray) {
        String timeStr;
        if (t.is<const char*>() || t.is<String>()) {
          timeStr = t.as<String>();
        } else if (t.is<JsonObject>() && t.as<JsonObject>().containsKey("time")) {
          timeStr = t["time"].as<String>();
        } else {
          continue;
        }

        if (timeStr.length() < 5) continue;
        int hour = timeStr.substring(0, 2).toInt();
        int minute = timeStr.substring(3, 5).toInt();
        if (scheduleCount < 100 ) {
          scheduleHours[scheduleCount] = hour;
          scheduleMinutes[scheduleCount] = minute;
          alreadyExecuted[scheduleCount] = false;
          scheduleCount++;
        }
      }

      if (saveScheduleToSPIFFS()) {
        Serial.println("Schedule updated from MQTT and saved to SPIFFS");
      }
    }
  } else if (t == TOPIC_TIME) {
  // Expecting ISO 8601 datetime, e.g. "2025-09-17T21:34:50"
    if (msg.length() >= 19) {
      int year   = msg.substring(0, 4).toInt();
      int month  = msg.substring(5, 7).toInt();
      int day    = msg.substring(8, 10).toInt();
      int hour   = msg.substring(11, 13).toInt();
      int minute = msg.substring(14, 16).toInt();
      int second = msg.substring(17, 19).toInt();

      if (year > 2000 && month >= 1 && month <= 12 && day >= 1 && day <= 31) {
        rtc.adjust(DateTime(year, month, day, hour, minute, second));
        Serial.print("RTC updated from MQTT to: ");
        Serial.println(msg);
      } else {
        Serial.println("Invalid ISO datetime received");
      }
    } else {
      Serial.println("Invalid ISO format length");
    }
}

}

void connectMQTT() {
  if (mqttClient.connected()) {
    return;
  }

  Serial.print("Connecting to MQTT as ");
  Serial.println(deviceId);
  if (!mqttClient.connect(deviceId.c_str())) {
    Serial.println("MQTT connect failed");
    return;
  }

  mqttClient.subscribe(TOPIC_RING);
  mqttClient.subscribe(TOPIC_SILENT);
  mqttClient.subscribe(TOPIC_SCHEDULE);
  mqttClient.subscribe(TOPIC_TIME); 
  Serial.println("MQTT connected and subscribed");
}

// ---------- Setup ----------
void setup() {
  Serial.begin(115200);

  pinMode(relayPin, OUTPUT);
  digitalWrite(relayPin, HIGH); // default off (assuming active LOW)

  pinMode(silentBtn, INPUT_PULLUP);
  pinMode(ringBtn, INPUT_PULLUP);
  pinMode(connectionLed, OUTPUT);
  pinMode(ONled, OUTPUT);
  pinMode(ringLed, OUTPUT);
  pinMode(silentLed, OUTPUT);

  if (!rtc.begin()) {
    Serial.println("RTC error");
    while (1) delay(1000);
  }

  if (!SPIFFS.begin(true)) {
    Serial.println("SPIFFS init failed");
  }

  mqttClient.setServer(MQTT_SERVER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  if (!connectWiFi()) {
    startAPMode();
    loadScheduleFromSPIFFS();
  } else {
    if (!fetchScheduleFromAPI()) loadScheduleFromSPIFFS();

    ArduinoOTA.setHostname("RNG02");
    ArduinoOTA.setPassword("R");
    ArduinoOTA.begin();
  }

  digitalWrite(ONled, HIGH);
}

// ---------- Loop ----------
void loop() {
  if (WiFi.getMode() == WIFI_AP) {
    server.handleClient();
  } else {
    ArduinoOTA.handle();

    if (millis() - lastWiFiCheck > 10000) {
      lastWiFiCheck = millis();
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost, attempting reconnect");
        WiFi.disconnect();
        WiFi.begin(credentials.ssid, credentials.password);
      }
    }

    if (millis() - lastMQTTCheck > 5000) {
      lastMQTTCheck = millis();
      if (!mqttClient.connected()) connectMQTT();
    }
    mqttClient.loop();
  }

  updateRelay();

  // Silent button handling
  if (digitalRead(silentBtn) == LOW) {
    static unsigned long lastPress = 0;
    if (millis() - lastPress > 300) {
      toggleSilent();
      lastPress = millis();
    }
  }

  DateTime now = rtc.now();

  // Force silent mode on weekends
 /* if (isWeekend(now)) {
    if (!silentMode) {
      silentMode = true;
      digitalWrite(silentLed, HIGH);
      Serial.println("Weekend: Silent mode enforced");
    }
  }*/

  // Scheduled rings
  for (int i = 0; i < scheduleCount; i++) {
    if (now.hour() == scheduleHours[i] && now.minute() == scheduleMinutes[i]) {
      if (!alreadyExecuted[i] && !silentMode) {
        triggerRing();
        alreadyExecuted[i] = true;
      }
    } else {
      alreadyExecuted[i] = false;
    }
  }

  // WiFi/MQTT status LED
  if (WiFi.status() != WL_CONNECTED) {
    digitalWrite(connectionLed, LOW);
  } else if (!mqttClient.connected()) {
    if (millis() - lastStatusBlink > 500) {
      lastStatusBlink = millis();
      ledBlinkState = !ledBlinkState;
      digitalWrite(connectionLed, ledBlinkState ? HIGH : LOW);
    }
  } else {
    digitalWrite(connectionLed, HIGH);
  }

  // Ring button handling (manual trigger)
  if (digitalRead(ringBtn) == LOW) {
    static unsigned long lastPressRing = 0;
    if (millis() - lastPressRing > 300) {
      triggerRing();
      lastPressRing = millis();
    }
  }
  static unsigned long lastTimePrint = 0;
if (millis() - lastTimePrint > 1000) {
  lastTimePrint = millis();
  printCurrentTime();
}

}
