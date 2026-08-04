export class ProducerApiError extends Error {
  constructor(message, { status, code, issues } = {}) {
    super(message);
    this.name = "ProducerApiError";
    this.status = status;
    this.code = code;
    this.issues = issues || [];
  }
}

async function responseBody(response) {
  return response.json().catch(() => ({}));
}

async function request(path, options = {}) {
  const response = await fetch(path, { cache: "no-store", ...options });
  const body = await responseBody(response);
  if (!response.ok) {
    throw new ProducerApiError(body.error || "The request could not be completed.", {
      status: response.status,
      code: body.code,
      issues: body.issues,
    });
  }
  return body;
}

const jsonOptions = (method, body) => ({
  method,
  headers: { "content-type": "application/json" },
  body: JSON.stringify(body),
});

export const producerApi = {
  capabilities: () => request("/api/producer/capabilities"),
  list: () => request("/api/producer/festivals"),
  get: (id) => request(`/api/producer/festivals/${encodeURIComponent(id)}`),
  create: (submissionKey) => request("/api/producer/festivals", jsonOptions("POST", { submission_key: submissionKey })),
  patch: (id, payload) => request(`/api/producer/festivals/${encodeURIComponent(id)}`, jsonOptions("PATCH", payload)),
  submit: (id, payload) => request(`/api/producer/festivals/${encodeURIComponent(id)}/submit`, jsonOptions("POST", payload)),
  upload: (id, formData) => request(`/api/producer/festivals/${encodeURIComponent(id)}/assets`, { method: "POST", body: formData }),
};
