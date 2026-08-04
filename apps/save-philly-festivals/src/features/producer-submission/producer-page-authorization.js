import { authorizeProducer, ProducerAuthenticationError, ProducerAuthorizationError } from "./producer-authorization";
import { productionDependencies } from "./producer-submission-http";

export async function authorizeProducerPage() {
  try {
    const dependencies = await productionDependencies();
    const user = await authorizeProducer(dependencies);
    return { status: "authorized", user };
  } catch (error) {
    if (error instanceof ProducerAuthenticationError) return { status: "unauthenticated" };
    if (error instanceof ProducerAuthorizationError) return { status: "denied" };
    throw error;
  }
}
