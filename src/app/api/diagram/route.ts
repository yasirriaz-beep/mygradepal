import { readFile } from "node:fs/promises";
import path from "node:path";

const BASE_IMAGES_DIR = "C:\\Users\\yyria\\OneDrive\\Desktop\\Chemistry\\scripts\\output\\images";

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const ref = (searchParams.get("ref") ?? "").trim();

  if (!ref) {
    return new Response("Missing ref query param", { status: 400 });
  }

  const normalizedRef = ref.replace(/\\/g, "/");
  const filePath = path.resolve(BASE_IMAGES_DIR, normalizedRef);
  const basePath = path.resolve(BASE_IMAGES_DIR);

  if (!filePath.startsWith(basePath)) {
    return new Response("Invalid image ref path", { status: 400 });
  }

  try {
    const fileBuffer = await readFile(filePath);
    return new Response(fileBuffer, {
      status: 200,
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=86400",
      },
    });
  } catch {
    return new Response("Diagram image not found", { status: 404 });
  }
}
