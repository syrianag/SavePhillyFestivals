import { NextResponse } from "next/server";
import { saveFile, UploadError } from "@/lib/uploads";
import { handleApiError, ForbiddenError } from "@/lib/errors";
import { auth } from "@/lib/auth";

export async function POST(request) {
  try {
    const session = await auth();
    
    if (!session || (session.user.role !== "admin" && session.user.role !== "super_admin")) {
      throw new ForbiddenError("Admin access required");
    }

    const formData = await request.formData();
    const file = formData.get("file");
    const directory = formData.get("directory") || "uploads";

    const result = await saveFile(file, directory);

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof UploadError) {
      return NextResponse.json(
        { error: error.message },
        { status: error.statusCode }
      );
    }
    return handleApiError(error);
  }
}
