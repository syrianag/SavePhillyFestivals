import { handleProducerApplication } from "@/features/producer-access/producer-access-http";

export function POST(request) { return handleProducerApplication(request); }
