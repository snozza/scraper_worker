import uuid from 'node-uuid';
import express from 'express';
import path from 'path';

function userRouter(app) {

  function loadUser(req, res, next) {
    req.session.user = req.session.user || {id: uuid.v1()};
    req.user = req.session.user;
    next();
  }

  return new express.Router()
    .use(loadUser);
}

export default userRouter;
