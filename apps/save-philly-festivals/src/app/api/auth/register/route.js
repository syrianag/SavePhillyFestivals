import { handleProducerRegister } from "@/features/producer-submission/producer-registration";

export async function POST(request) {
  return handleProducerRegister(request);
}
