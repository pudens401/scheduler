#include <Arduino.h>
#include <WiFi.h>
#include <WiFiManager.h>
#include <PubSubClient.h>
#include <HTTPClient.h>
#include <ArduinoJson.h>
#include <LittleFS.h>
#include <RTClib.h>
#include <ESP32Servo.h>

// ----------- CONFIG -------------
#define DEVICE_ID "FD02"

const char* MQTT_BROKER = "test.mosquitto.org";
const uint16_t MQTT_PORT = 1883;

// Topics
String FEED_TOPIC        = String("KY/FEED/FEED/") + DEVICE_ID;
String FEED_REQ_TOPIC    = String("KY/FEED/LEVEL/LOOK/") + DEVICE_ID;
String FEED_RES_TOPIC    = String("KY/FEED/LEVEL/SHOW/") + DEVICE_ID;
String FEED_UPDATE_TOPIC = String("KY/FEED/UPDATE/") + DEVICE_ID;
String TIME_TOPIC        = String("KY/FEED/TIME/") + DEVICE_ID;

// API Endpoint
String apiUrl = String("https://smart-scheduler-s5q7.onrender.com/schedule/") + DEVICE_ID;

// MQTT client
WiFiClient espClient;
PubSubClient mqttClient(espClient);

// File path
const char* SCHEDULE_FILE = "/schedule.json";

// RTC
RTC_DS3231 rtc;

// Store schedule in memory
struct FeedSlot {
  String time;
  int portion;
  bool triggered; // flag to prevent repeating
};
FeedSlot schedule[20]; // up to 20 slots
int scheduleCount = 0;

// ----------- HARDWARE -------------
// Servo
Servo myServo;
int servoPin = 26;
int angle = 0;

// Motor pins
#define IN1 33
#define IN2 25

// Button
#define BUTTON_PIN 23

// Ultrasonic
#define TRIG_PIN 18
#define ECHO_PIN 19
long duration;
float distance;
const float containerHeight = 20.0; // cm

// ----------- HELPERS -------------
void saveScheduleToFile(const String& json) {
  File file = LittleFS.open(SCHEDULE_FILE, "w");
  if (!file) {
    Serial.println("Failed to open schedule file for writing.");
    return;
  }
  file.print(json);
  file.close();
  Serial.println("Schedule saved to LittleFS.");
}

String loadScheduleFromFile() {
  File file = LittleFS.open(SCHEDULE_FILE, "r");
  if (!file) {
    Serial.println("Schedule file not found.");
    return "";
  }
  String content = file.readString();
  file.close();
  Serial.println("Loaded schedule from LittleFS:");
  Serial.println(content);
  return content;
}

void createDefaultSchedule() {
  StaticJsonDocument<256> doc;
  JsonArray times = doc.createNestedArray("times");
  JsonObject slot = times.createNestedObject();
  slot["time"] = "25:00";
  slot["portion"] = 1;

  String json;
  serializeJson(doc, json);

  saveScheduleToFile(json);
  Serial.println("Default schedule created.");
}

void loadScheduleIntoMemory(const String& json) {
  scheduleCount = 0;

  StaticJsonDocument<1024> doc;
  DeserializationError error = deserializeJson(doc, json);
  if (!error) {
    JsonArray times = doc["times"].as<JsonArray>();
    Serial.println("Schedule Times:");
    for (JsonObject t : times) {
      const char* time = t["time"];
      int portion = t["portion"];
      if (scheduleCount < 20) {
        schedule[scheduleCount].time = String(time);
        schedule[scheduleCount].portion = portion;
        schedule[scheduleCount].triggered = false;
        scheduleCount++;
      }
      Serial.printf("  Time: %s, Portion: %d\n", time, portion);
    }
  } else {
    Serial.print("JSON parse error: ");
    Serial.println(error.f_str());
  }
}

// ----------- ULTRASONIC READER -------------
float readContainerLevel() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  duration = pulseIn(ECHO_PIN, HIGH, 25000); // timeout safeguard
  distance = duration * 0.034 / 2; // cm

  float level = ((containerHeight - distance) / containerHeight) * 100.0;
  if (level < 0) level = 0;
  if (level > 100) level = 100;

  Serial.print("Distance: ");
  Serial.print(distance);
  Serial.print(" cm | Level: ");
  Serial.print(level);
  Serial.println("%");

  return level;
}

// ----------- FEED SEQUENCE -------------
void feedNow() {
  Serial.println("Starting feed sequence...");

  myServo.attach(servoPin, 500, 2400);
  for (angle = 0; angle <= 90; angle++) {
    myServo.write(angle);
    Serial.print("Servo Angle: ");
    Serial.println(angle);
    delay(15);
  }
  for (angle = 90; angle >= 0; angle--) {
    myServo.write(angle);
    Serial.print("Servo Angle: ");
    Serial.println(angle);
    delay(15);
  }
  myServo.detach();

  digitalWrite(IN1, HIGH);
  digitalWrite(IN2, LOW);
  delay(2000);
  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);

  Serial.println("Feed sequence complete.");
}

// ----------- MQTT -------------
void mqttCallback(char* topic, byte* payload, unsigned int len) {
  String msg;
  for (unsigned int i = 0; i < len; i++) msg += (char)payload[i];
  Serial.printf("MQTT [%s]: %s\n", topic, msg.c_str());

  if (String(topic) == FEED_REQ_TOPIC) {
    float level = readContainerLevel();
    char buffer[10];
    dtostrf(level, 4, 1, buffer);
    mqttClient.publish(FEED_RES_TOPIC.c_str(), buffer);
    Serial.printf("Published feed level: %.1f%% → %s\n", level, FEED_RES_TOPIC.c_str());
  }

  if (String(topic) == FEED_TOPIC) {
    Serial.println("Received FEED command!");
    feedNow();
  }

  if (String(topic) == FEED_UPDATE_TOPIC) {
    // Check if this is schedule data (JSON) or just an update trigger
    if (msg.startsWith("{")) {
      Serial.println("Received schedule update via MQTT!");
      Serial.println("Schedule data: " + msg);
      saveScheduleToFile(msg);
      loadScheduleIntoMemory(msg);
    } else {
      Serial.println("Received UPDATE command → fetching schedule from API (backup method)...");
      fetchSchedule();
    }
  }

  if (String(topic) == TIME_TOPIC) {
    Serial.println("Received TIME sync command → updating RTC...");
    // Parse GMT+2 timestamp and update RTC
    unsigned long timestamp = msg.toInt();
    if (timestamp > 0) {
      DateTime newTime = DateTime(timestamp);
      rtc.adjust(newTime);
      Serial.printf("RTC updated to: %04d-%02d-%02d %02d:%02d:%02d\n", 
                   newTime.year(), newTime.month(), newTime.day(),
                   newTime.hour(), newTime.minute(), newTime.second());
    } else {
      Serial.println("Invalid timestamp received for time sync");
    }
  }
}

void mqttReconnect() {
  while (WiFi.status() == WL_CONNECTED && !mqttClient.connected()) {
    String clientId = "ESP32Client-" + String(random(0xffff), HEX);
    if (mqttClient.connect(clientId.c_str())) {
      Serial.println("MQTT connected");
      mqttClient.subscribe(FEED_TOPIC.c_str());
      mqttClient.subscribe(FEED_REQ_TOPIC.c_str());
      mqttClient.subscribe(FEED_UPDATE_TOPIC.c_str());
      mqttClient.subscribe(TIME_TOPIC.c_str());
    } else {
      Serial.print("MQTT failed, rc="); Serial.println(mqttClient.state());
      delay(2000);
    }
  }
}

// ----------- WIFI SETUP -------------
void setupWiFi() {
  WiFiManager wm;
  wm.setConnectTimeout(10);
  bool res = wm.autoConnect("ESP32-Provision");

  if (!res) {
    Serial.println("Failed to connect or timeout → staying in AP mode.");
  } else {
    Serial.print("Connected. IP: ");
    Serial.println(WiFi.localIP());
  }
}

// ----------- API REQUEST -------------
void fetchSchedule() {
  if (WiFi.status() == WL_CONNECTED) {
    HTTPClient http;
    Serial.println("Fetching schedule from API: " + apiUrl);

    http.begin(apiUrl);
    int httpCode = http.GET();

    if (httpCode == 200) {
      String payload = http.getString();
      Serial.println("API Response:");
      Serial.println(payload);

      saveScheduleToFile(payload);
      loadScheduleIntoMemory(payload);
    } else {
      Serial.printf("HTTP GET failed, code: %d → loading local schedule\n", httpCode);
    }
    http.end();
  }

  String json = loadScheduleFromFile();
  if (json.length() == 0) {
    createDefaultSchedule();
    json = loadScheduleFromFile();
  }
  loadScheduleIntoMemory(json);
}

// ----------- SETUP + LOOP -------------
void setup() {
  Serial.begin(115200);
  delay(100);
  myServo.attach(servoPin, 500, 2400);
  for (angle = 90; angle >= 0; angle--) {
    myServo.write(angle);
    Serial.print("Servo Angle: ");
    Serial.println(angle);
    delay(15);
  }
  myServo.detach();

  if (!LittleFS.begin(true)) {
    Serial.println("LittleFS Mount Failed!");
    return;
  }

  if (!rtc.begin()) {
    Serial.println("Couldn't find RTC");
    while (1);
  }
  if (rtc.lostPower()) {
    Serial.println("RTC lost power, setting time to compile time");
    rtc.adjust(DateTime(F(__DATE__), F(__TIME__)));
  }

  setupWiFi();
  WiFi.setAutoReconnect(true);
  WiFi.persistent(true);

  mqttClient.setServer(MQTT_BROKER, MQTT_PORT);
  mqttClient.setCallback(mqttCallback);

  randomSeed(esp_random());

  // Pins
  pinMode(IN1, OUTPUT);
  pinMode(IN2, OUTPUT);
  pinMode(BUTTON_PIN, INPUT_PULLUP);
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);

  digitalWrite(IN1, LOW);
  digitalWrite(IN2, LOW);

  Serial.println("Device ID: " DEVICE_ID);
  Serial.println("Subscribed Topics:");
  Serial.println("  " + FEED_TOPIC);
  Serial.println("  " + FEED_REQ_TOPIC);
  Serial.println("  " + FEED_UPDATE_TOPIC);
  Serial.println("  " + TIME_TOPIC);
  Serial.println("Will respond on:");
  Serial.println("  " + FEED_RES_TOPIC);

  fetchSchedule();
}

void loop() {
  if (WiFi.status() == WL_CONNECTED) {
    if (!mqttClient.connected()) mqttReconnect();
    mqttClient.loop();
  }

  // Current time
  DateTime now = rtc.now();
  char buf[6];
  sprintf(buf, "%02d:%02d", now.hour(), now.minute());
  String currentTime(buf);
  Serial.printf("Current time: %s\n", buf);

  // Schedule check
  for (int i = 0; i < scheduleCount; i++) {
    if (!schedule[i].triggered && schedule[i].time == currentTime) {
      Serial.printf("Scheduled time: %s has arrived\n", currentTime.c_str());
      schedule[i].triggered = true;
      feedNow();
    }
    if (schedule[i].triggered && schedule[i].time != currentTime) {
      schedule[i].triggered = false;
    }
  }

  // Button check (active LOW)
  if (digitalRead(BUTTON_PIN) == LOW) {
    feedNow();
    delay(200); // debounce
  }

  delay(1000);
}
