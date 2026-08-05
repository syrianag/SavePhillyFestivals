export class SocialFeedNotFoundError extends Error {
  constructor(message = "Social feed not found.") {
    super(message);
    this.name = "SocialFeedNotFoundError";
    this.statusCode = 404;
    this.code = "not_found";
  }
}

export class SocialFeedConflictError extends Error {
  constructor(message = "Social feed changed. Reload and try again.") {
    super(message);
    this.name = "SocialFeedConflictError";
    this.statusCode = 409;
    this.code = "revision_conflict";
  }
}
