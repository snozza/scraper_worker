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
