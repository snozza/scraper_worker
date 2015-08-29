import express from 'express';
import bodyParser from 'body-parser';
import path from 'path';
import compression from 'compression';
import session from 'cookie-session';

import errors from './errors';
import logs from './logs';

import users from './users/router';
import articles from './articles/router';

const ONE_WEEK = 7 * 24 * 60 * 60 * 1000;

function Web(app, config) {
  let web = express();
  let errs = errors(config.verbose);
  
  web
    .set('view engine', 'jade')
    .set('view cache', config.view_cache);

  web
    .use(compression())
    .use(logs(config.verbose))
    .use(bodyParser.json())
    .use(bodyParser.urlencoded({extended: true}))
    .use(session({secret: config.cookie_secret, maxAge: ONE_WEEK}));

  web
    .use(users(app))
    .use(articles(app));

  web
    .use(errs.notFound)
    .use(errs.log)
    .use(errs.json)
    .use(errs.html);

  return web;
}

export default Web;

