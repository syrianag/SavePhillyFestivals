export const FESTIVAL_STATUS = {
  DRAFT: "draft",
  PENDING: "pending",
  APPROVED: "approved",
  REJECTED: "rejected",
};

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const ALLOWED_FILE_TYPES = [
  "image/jpeg",
  "image/png",
  "image/webp",
  "image/svg+xml",
];



export const STATUS_COLORS = {
  draft: { bg: "bg-gray-100", text: "text-gray-700", dot: "bg-gray-500" },
  pending: { bg: "bg-yellow-100", text: "text-yellow-700", dot: "bg-yellow-500" },
  approved: { bg: "bg-green-100", text: "text-green-700", dot: "bg-green-500" },
  rejected: { bg: "bg-red-100", text: "text-red-700", dot: "bg-red-500" },
};

export const STATUS_LABELS = {
  draft: "Draft",
  pending: "Pending Review",
  approved: "Approved",
  rejected: "Rejected",
};
