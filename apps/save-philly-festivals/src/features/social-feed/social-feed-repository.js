import { prisma } from "@/lib/db";
import { createSocialFeedRepository } from "./social-feed-repository-core";

export * from "./social-feed-repository-core";
export const socialFeedRepository = createSocialFeedRepository(prisma);
