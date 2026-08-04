export class ProducerSubmissionError extends Error {
  constructor(message, statusCode, code) {
    super(message);
    this.name = "ProducerSubmissionError";
    this.statusCode = statusCode;
    this.code = code;
  }
}

export class ProducerFestivalNotFoundError extends ProducerSubmissionError {
  constructor() { super("Festival not found.", 404, "festival_not_found"); }
}

export class ProducerFestivalConflictError extends ProducerSubmissionError {
  constructor(message = "Festival revision or workflow state changed.") { super(message, 409, "festival_conflict"); }
}

export class ProducerFestivalIncompleteError extends ProducerSubmissionError {
  constructor(issues) {
    super("Festival is incomplete.", 422, "festival_incomplete");
    this.issues = issues;
  }
}

export class ProducerConfigurationError extends ProducerSubmissionError {
  constructor() { super("Submission notifications are not configured.", 503, "provider_unconfigured"); }
}
