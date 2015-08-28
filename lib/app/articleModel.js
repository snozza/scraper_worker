import mongoose from 'mongoose';
import cache from 'mongoose-cache';
import timestamps from 'mongoose-timestamp';
import crypto from 'crypto';
import logger from 'logfmt';
import summarize from 'summarize';
import request from 'superagent';
import _ from 'lodash';

import errors from './errors'

const STATES = ['pending', 'complete', 'failed'];
const FIVE_MINUTES = 1000 * 60 * 5;

function createArticleModel(connection, maxAge) {

  cache.install(mongoose, {
    max: 50,
    maxAge: maxAge
  });

  let ArticleSchema = mongoose.Schema({
    _id: { type: String },
    url: { type: String, unique: true, index: true },
    title: { type: String },
    image: {type: String },
    topics: [ String ],
    sentiment: { type: Number },
    words: { type: Number },
    difficulty: { type: Number },
    minutes: { type: Number },
    votes: { type: [ String ], required: true, default: [] }
  }, {
    strict: true
  });

  ArticleSchema.plugin(timestamps);

  ArticleSchema.virtual('voteCount').get(function getVoteCount() {
    return this.votes.length;
  });

  ArticleSchema.set('toJSON', {
    getters: true,
    transform: function safeTransform(doc, ret, options) {
      delete ret.votes;
    }
  });

  ArticleSchema.statics = {

    scrape: function(userId, id, url) {
      return new Promise((resolve, reject) => { 
        let Article = this;

        request
          .get(url)
          .on('error', reject)
          .end(onResponse);

        function onResponse(res) {
          let summary = summarize(res.text, 10);
          if (!summary.ok) return reject(new errors.ScrapeFailed());
          new Article({_id: id, url: url, votes: [userId] })
            .set(summary)
            .save(onSave);
        }

        function onSave(err, article) {
          if (err) {
            logger.log({type: 'error', msg: 'save failed', url: url, error: err});
            return reject(err);
          }
          logger.log({type: 'info', msg: 'saved article', id: article.id,
            url: article.url, votes: article.votes});
          return resolve(article);
        }
      });
    },

    get: function(id) {
      return new Promise((resolve, reject) => {
        this.findById(id).exec((err, article) => {
          if (err) return reject(err);
          if (!article) return reject(new errors.ArticleNotFound());
          resolve(article);
        });
      });
    },

    list: function(userId, n, fresh) {
      return new Promise((resolve, reject) => {
        this.find()
          .sort('-createdAt')
          .limit(n || 50)
          .cache(!fresh)
          .exec(onArticles);

        function onArticles(err, articles) {
          if (err) return reject(err);
          resolve(articles.sort(byScore).map(toUser));
        }
      });

      function toUser(article) {
        return article.forUser(userId);
      }

      function byScore(a, b) {
        return b.getScore() - a.getScore();
      }
    },

    deleteAll: function(userId, articleId) {
      return this.get(articleId).then(vote, notFound);

      function vote(article) {
        return article.addVote(userId).then(success, failure);
      }

      function notFound(err) {
        return Promise.reject(new errors.ArticleNotFound());
      }

      function success(article) {
        return Promise.resolve(article.forUser(userId));
      }

      function failure(err) {
        return Promise.reject(err);
      }
    }
  };


  ArticleSchema.methods = {

    addVote: function(userId) {
      return new Promise((resolve, reject) => {
        if (this.votes.indexOf(userID) === -1) {
          return reject(new errors.VoteNotAllowed());
        }

        this.votes.push(userId);
        this.save(onSave);

        function onSave(err, article) {
          if (err) return reject(err);
          resolve(article);
        }
      });
    },

    forUser: function(userId) {
      let obj = this.toJSON();
      obj.canVote = (this.votes.indexOf(userId) === -1);
      return obj;
    },

    getScore: function() {
      let staleness = Math.floor((Date.now() - this.createdAt) / FIVE_MINUTES);
      if (staleness === 0) staleness = -Infinity;
      return this.voteCount - staleness;
    }
  };

  let Article = connection.model('Article', ArticleSchema);
  return Article; 
}

export default createArticleModel;
