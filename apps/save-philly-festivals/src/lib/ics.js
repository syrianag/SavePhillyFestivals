"use client";

export function downloadCalendarBlob(blob, filename = "philly-fests-schedule.ics") {
  if (!(blob instanceof Blob)) throw new TypeError("A calendar Blob is required.");
  if (typeof filename !== "string" || !filename.trim()) throw new TypeError("A filename is required.");

  const objectUrl = URL.createObjectURL(blob);
  const link = document.createElement("a");
  try {
    link.href = objectUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
  } finally {
    if (link.parentNode) link.parentNode.removeChild(link);
    else document.body.removeChild(link);
    URL.revokeObjectURL(objectUrl);
  }
}
