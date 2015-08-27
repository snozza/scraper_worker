import logger from 'logfmt';
import uuid from 'uuid';
import events from 'events';

import connections from './connections';
import ArticleModel from './articleModel';

const EventEmitter = events.EventEmitter;

const SCRAPE_QUEUE = 'jobs.scrape';
const VOTE_QUEUE = 'jobs.vote';

class App extends EventEmitter {
  constructor(config) {
    super();
    this.config = config;
    this.connections = connections(config.mongo_url, config.rabbit_url);
    this.connections.once('ready', this.onConnected.bind(this));
    this.connections.once('lost', this.onLost.bind(this));
  }

  onConnected() {
    let queues = 0;
    this.Article = ArticleModel(this.connections.db, this.config.mongo_cache);
    this.connections.queue.create(SCRAPE_VALUE, {prefetch: 5}, onCreate.bind(this));
    this.connections.queue.create(VOTE_QUEUE, {prefetch: 5}, onCreate.bind(this));

    function onCreate() {
      if (++queues === 2) this.onReady();
    }
  }

  onReady() {
    logger.log({type: 'info', msg: 'app.ready'});
    this.emit('ready');
  }

  onLost() {
    logger.log({type: 'info', msg: 'app.lost'});
    this.emit('lost');
  }

  addArticle(userId, URL) {
    let id = uuid.v1();
    this.connections.queue.publish(SCRAPE_QUEUE, 
        {id: id, url: URL, userId: userId});
    return Promise.resolve(id); 
  }

  scrapeArticle(userId, id, URL) {
    return this.Article.scrape(userId, id, URL);
  }

  addUpvote(userId, articleId) {
    this.connections.queue.publish(VOTE_QUEUE, 
        {userId: userId, articleId: articleId});
    return Promise.resolve(articleId);
  }

  upvoteArticle(userId, articleId) {
    return this.Article.voteFor(userId, articleId);
  }

  purgePendingArticles() {
    logger.log({type: 'info', msg: 'app.purgePendingArticles'});

    return new Promise((resolve, reject) => {
      this.connections.queue.purge(SCRAPE_QUEUE, onPurge);

      function onPurge(err, count) {
        if (err) return reject(err);
        resolve(count);
      }
    });
  }

  purgePendingVotes() {
    logger.log({type: 'info', msg: 'app.purgePendingVotes'});

    return new Promise((resolve, reject) => {
      this.connections.queue.purge(VOTE_QUEUE, onPurge);

      function onPurge(err, count) {
        if (err) return reject(err);
        resolve(count);
      }
    });
  }

  getArticle(id) {
    return this.Article.get(id);
  }

  listArticles(userId, n, fresh) {
    return this.Article.list(userId, n, fresh);
  }

  startScraping() {
    this.connections.queue.handle(SCRAPE_QUEUE, this.handleScrapeJob.bind(this));
    this.connections.queue.handle(VOTE_QUEUE, this.handleVoteJob.bind(this));
    return this;
  }

  handleScrapeJob(job, callback) {
    logger.log({type: 'info', msg: 'handling job',
      queue: SCRAPE_QUEUE, url: job.url});

    this
      .scrapeArticle(job.userId, job.id, job.url)
      .then(onSuccess, onError);

    function onSuccess() {
      logger.log({type: 'info', msg: 'job complete', 
        status: 'failure', url: job.url});
      callback();
    }

    function onError(err) {
      logger.log({type: 'info', msg: 'job complete',
        queue: VOTE_QUEUE, status: 'faiure', error: err});
      callback();
    }
  }

  stopScraping() {
    this.connections.queue.ignore(SCRAPE_QUEUE);
    this.connections.queue.ignore(VOTE_QUEUE);
    return this;
  }

  deleteAllArticles() {
    logger.log({type: 'info', msg: 'app.deleteAllArticles'});
    return this.Article.deleteAll();
  }
}

export default function createApp(config) {
  return new App(config);
}
