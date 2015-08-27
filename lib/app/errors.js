class ExtendableError extends Error {
  constructor(message) {
    super();
    Error.captureStackTrace(this, this.constructor);
    this.name = this.constructor.name;
    this.message = message;
  }
}

class VoteNotAllowed extends ExtendableError {
  constructor() {
    super("Vote Not Allowed");
  }
}

class ScrapeFailed extends ExtendableError {
  constructor() {
    super("Scrape Failed");
  }
}

class ArticleNotFound extends ExtendableError {
  constructor() {
    super("Article Not Found");
  }
}

export { VoteNotAllowed, ScrapeFailed, ArticleNotFound };
