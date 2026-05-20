import { getFirebaseConfigDebug } from "@/lib/firebaseConfig";

export const dynamic = "force-dynamic";

export async function GET() {
  return Response.json(getFirebaseConfigDebug(), {
    headers: { "Cache-Control": "no-store" },
  });
}
