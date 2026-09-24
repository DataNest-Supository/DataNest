export async function GET() {
  return Response.json({
    ok: true,
    project: "Resonance DataNest",
    tools: ["UNIFI", "TranScheduler"],
    timestamp: new Date().toISOString()
  });
}
