// Utiliser une table Supabase pour le rate limiting
export async function checkRateLimit(
  supabase: any,
  identifier: string,
  action: string,
  maxAttempts: number,
  windowMinutes: number
): Promise<{ allowed: boolean; remaining: number }> {
  
  const windowStart = new Date(Date.now() - windowMinutes * 60 * 1000).toISOString();
  
  const { count } = await supabase
    .from("rate_limit_events")
    .select("*", { count: "exact", head: true })
    .eq("identifier", identifier)
    .eq("action", action)
    .gte("created_at", windowStart);

  const currentCount = count ?? 0;

  if (currentCount >= maxAttempts) {
    return { allowed: false, remaining: 0 };
  }
  
  await supabase.from("rate_limit_events").insert({ identifier, action });
  return { allowed: true, remaining: maxAttempts - currentCount - 1 };
}
