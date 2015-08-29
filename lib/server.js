import logger from 'logfmt';
import http from 'http';
import throng from 'throng';
import os from 'os';

import config from './config';
import app from './app';
import web from './web';

const cpus = os.cpus().length;

// Can be removed in node 0.12 + 
http.globalAgent.maxSockets = Infinity;
throng(start, {workers: config.concurrency});

function start() {
  logger.log({
    type: 'info',
    msg: 'starting server',
    concurrency: config.concurrency,
    thrifty: config.thrifty,
    timeout: config.timeout,
    busy_ms: config.busy_ms
  });

  let instance = app(config);
  instance.on('ready', createServer);
  instance.on('lost', abort);

  function createServer() {
    if (config.thrifty) instance.startScraping();
    let server = http.createServer(web(instance, config));

    process.on('SIGTERM', shutdown);
    instance
      .removeListener('lost', abort)
      .on('lost', shutdown);

    server.listen(config.port, onListen);

    function onListen() {
      logger.log({type: 'info', msg: 'listening', port: server.address().port});
    }

    function shutdown() {
      logger.log({type: 'info', msg: 'shutdown'});
      server.close(() => {
        logger.log({type: 'info', msg: 'exiting'});
        process.exit();
      });
    }
  }

  function abort() {
    logger.log({type: 'info', msg: 'shutting down', abort: true});
    process.exit();
  }
}
