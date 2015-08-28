"use strict";

const currentENV = process.env.NODE_ENV || "development";
const PRODUCTION = process.env.NODE_ENV === "production";
const TEST = process.env.NODE_ENV === "test";

function int(str) {
  if (!str) return 0;
  return parseInt(str, 10);
}

function bool(str) {
  if (str === undefined) return false;
  return str.toLowerCase() === 'true';
}

let config = {};

config.express = {
  port: process.env.PORT || 3000,
  ip: "127.0.0.1"
};

// Services
config.mongo_url = process.env.MONGOLAB_URI || 'mongodb://localhost:27017/appDev';
config.rabbit_url = process.env.CLOUDAMQP_URL || 'amqp://localhost';
config.port = int(process.env.PORT) || 5000;

// App Behaviour
config.concurrency = int(process.env.CONCURRENCY) || 1;
config.worker_concurrency = int(process.env.WORKER_CONCURRENCY) || 1;

if (PRODUCTION) {
  config.express.ip = "0.0.0.0";
  config.express.port = "80";
}

if (TEST) {
  config.express.port = 4567;
}

config.currentENV = currentENV;

export default config;

