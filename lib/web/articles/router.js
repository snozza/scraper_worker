import express from 'express'
import path from 'path';

const ERR_MAP = {
  'ArticleNotFound': 404,
  'VoteNotAllowed': 403,
  'ScrapeFailed': 500
};

function articlesRouter(app) {

  function showForm(req, res, next) {
    res.render(path.join(__dirname, 'list'));
  }
}
