"use strict"

import mongoose from 'mongoose';
import jackrabbit from 'jackrabbit';
import logger from 'logfmt';
import events from 'events';
const EventEmitter = events.EventEmitter;

class Connector extends EventEmitter {
  constructor(mongoURL, rabbitURL) {
    super();
    let readyCount = 0;
    this.db = this.connectDB(mongoURL);
    this.queue = this.connectQueue(rabbitURL);
  }

  connectDB(mongoURL) {
    return mongoose.createConnection(mongoURL)
      .on('connected', () => {
        logger.log({type: 'info', msg: 'connected', service: 'mongodb'});
        ready();
      })
      .on('error', (err) => {
        logger.log({type: 'error', msg: err, service: 'mongodb'});
      })
      .on('close', () => {
        logger.log({type: 'error', msg: 'closed', service: 'mongodb'});
      })
      .on('disconnected', () => {
        logger.log({type: 'error', msg: 'disconnected', service: 'mongodb'});
        disconnected();
      });
  }

  connectQueue(rabbitURL) {
    return jackrabbit(rabbitURL)
      .on('connected', () => {
        logger.log({type: 'info', msg: 'connected', service: 'rabbitmq'});
        ready();
      })
      .on('error', (err) => {
        logger.log({type: 'error', msg: err, service: 'rabbitmq'});
      })
      .on('disconnected', () => {
        logger.log({type: 'error', msg: 'disconnected', service: 'rabbitmq'});
        lost();
      });
  }

  ready() {
    if (++readyCount === 2) {
      this.emit('ready');
    }
  }

  lost() {
    this.emit('lost');
  }
}

//singleton-like
export default function(mongoURL, rabbitURL) {
  return new Connector(mongoURL, rabbitURL);
};
      
