import { supabase } from "@/lib/supabase";
export async function flashcardsFetch(path: string, init?: RequestInit): Promise<Response> {
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const t = session?.access_token;
  if (!t) return new Response(JSON.stringify({ error: "Unauthorized" }), { status: 401 });
  const h = new Headers(init?.headers);
  h.set("Authorization", `Bearer ${t}`);
  if (init?.body && !h.has("Content-Type")) h.set("Content-Type", "application/json");
  return fetch(path, { ...init, headers: h });
}
