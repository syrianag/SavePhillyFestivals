import { handleUserDeactivate, handleUserGet, handleUserUpdate } from "@/features/users/user-http";

export const GET = handleUserGet;
export const PATCH = handleUserUpdate;
export const DELETE = handleUserDeactivate;
