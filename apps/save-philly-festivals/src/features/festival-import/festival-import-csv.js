const SOURCE_HEADERS = Object.freeze([
  "Festival Name",
  "Start Date",
  "End Date",
  "2027 Dates (if applicable)",
  "Location",
  "Type",
  "Website",
  "Organiser/Contact",
  "Contact email",
  "Contact Phone",
  "Email sent?",
]);

export const FESTIVAL_IMPORT_HEADERS = SOURCE_HEADERS;
export const DEFAULT_CSV_LIMITS = Object.freeze({
  maxBytes: 2 * 1024 * 1024,
  maxRecords: 10_000,
  maxFieldCharacters: 64 * 1024,
});

export class FestivalImportCsvError extends Error {
  constructor(code, message, metadata = {}) {
    super(message);
    this.name = "FestivalImportCsvError";
    this.code = code;
    Object.assign(this, metadata);
  }
}

function fail(code, message, metadata) {
  throw new FestivalImportCsvError(code, message, metadata);
}

function decodeUtf8(input, maxBytes) {
  if (!(input instanceof Uint8Array)) {
    fail("invalid_input", "CSV input must be a Buffer or Uint8Array");
  }
  if (input.byteLength > maxBytes) {
    fail("file_too_large", `CSV exceeds the ${maxBytes}-byte limit`);
  }

  try {
    return new TextDecoder("utf-8", { fatal: true }).decode(input);
  } catch {
    fail("invalid_utf8", "CSV is not valid UTF-8");
  }
}

function normalizeHeaders(rawHeaders) {
  const normalized = rawHeaders.map((header) => header.trim());
  if (new Set(normalized).size !== normalized.length) {
    fail("duplicate_header", "CSV headers collide after safe whitespace trimming", { startLine: 1 });
  }
  if (
    normalized.length !== SOURCE_HEADERS.length ||
    normalized.some((header, index) => header !== SOURCE_HEADERS[index])
  ) {
    fail("invalid_headers", `CSV must contain exactly these headers in order: ${SOURCE_HEADERS.join(", ")}`, {
      startLine: 1,
      headers: normalized,
    });
  }
  return normalized;
}

export function parseFestivalCsv(input, options = {}) {
  const limits = { ...DEFAULT_CSV_LIMITS, ...options };
  for (const [name, value] of Object.entries(limits)) {
    if (!Number.isSafeInteger(value) || value < 1) {
      fail("invalid_limit", `${name} must be a positive safe integer`);
    }
  }

  let text = decodeUtf8(input, limits.maxBytes);
  if (text.startsWith("\uFEFF")) text = text.slice(1);
  if (text.includes("\uFEFF")) {
    fail("unexpected_bom", "A UTF-8 BOM is allowed only at the beginning of the file");
  }
  if (text.length === 0) fail("empty_file", "CSV is empty");

  const parsed = [];
  let fields = [];
  let field = "";
  let state = "unquoted";
  let line = 1;
  let recordStartLine = 1;

  const append = (character) => {
    field += character;
    if (field.length > limits.maxFieldCharacters) {
      fail("field_too_large", `CSV field exceeds ${limits.maxFieldCharacters} characters`, {
        startLine: recordStartLine,
        line,
      });
    }
  };
  const finishField = () => {
    fields.push(field);
    field = "";
    state = "unquoted";
  };
  const finishRecord = () => {
    finishField();
    parsed.push({ values: fields, startLine: recordStartLine });
    fields = [];
    if (parsed.length - 1 > limits.maxRecords) {
      fail("too_many_records", `CSV exceeds the ${limits.maxRecords}-record limit`, {
        startLine: recordStartLine,
      });
    }
  };

  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (state === "quoted") {
      if (character === '"') {
        if (text[index + 1] === '"') {
          append('"');
          index += 1;
        } else {
          state = "after_quote";
        }
      } else if (character === "\r") {
        if (text[index + 1] !== "\n") {
          fail("bare_carriage_return", "Bare carriage returns are not valid CSV line endings", { line });
        }
        append("\n");
        index += 1;
        line += 1;
      } else {
        append(character);
        if (character === "\n") line += 1;
      }
      continue;
    }

    if (state === "after_quote") {
      if (character === ",") {
        finishField();
      } else if (character === "\n") {
        finishRecord();
        line += 1;
        recordStartLine = line;
      } else if (character === "\r") {
        if (text[index + 1] !== "\n") {
          fail("bare_carriage_return", "Bare carriage returns are not valid CSV line endings", { line });
        }
        finishRecord();
        index += 1;
        line += 1;
        recordStartLine = line;
      } else {
        fail("characters_after_quote", "Only a delimiter or line ending may follow a closing quote", {
          line,
          startLine: recordStartLine,
        });
      }
      continue;
    }

    if (character === '"') {
      if (field.length !== 0) {
        fail("quote_in_unquoted_field", "Quotes must enclose an entire CSV field", {
          line,
          startLine: recordStartLine,
        });
      }
      state = "quoted";
    } else if (character === ",") {
      finishField();
    } else if (character === "\n") {
      finishRecord();
      line += 1;
      recordStartLine = line;
    } else if (character === "\r") {
      if (text[index + 1] !== "\n") {
        fail("bare_carriage_return", "Bare carriage returns are not valid CSV line endings", { line });
      }
      finishRecord();
      index += 1;
      line += 1;
      recordStartLine = line;
    } else {
      append(character);
    }
  }

  if (state === "quoted") {
    fail("unclosed_quote", "CSV ends inside a quoted field", { startLine: recordStartLine, line });
  }
  if (state === "after_quote" || field.length > 0 || fields.length > 0) finishRecord();
  if (parsed.length === 0) fail("missing_header", "CSV has no header record");

  const headers = normalizeHeaders(parsed[0].values);
  const records = parsed.slice(1).map((record, index) => {
    if (record.values.length !== headers.length) {
      fail("wrong_field_count", `Record has ${record.values.length} fields; expected ${headers.length}`, {
        recordNumber: index + 2,
        startLine: record.startLine,
      });
    }
    return Object.freeze({
      recordNumber: index + 2,
      startLine: record.startLine,
      values: Object.freeze(Object.fromEntries(headers.map((header, headerIndex) => [header, record.values[headerIndex]]))),
    });
  });

  return Object.freeze({ headers, records: Object.freeze(records) });
}
