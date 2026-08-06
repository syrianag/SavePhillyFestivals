import { handleUserCreate, handleUserList } from "@/features/users/user-http";

export function GET(request) {
  return handleUserList(request);
}

export function POST(request) {
  return handleUserCreate(request);
}
