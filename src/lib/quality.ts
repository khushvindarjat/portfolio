import type { Quality, Tier } from "./store";

export function hasWebGL2(): boolean {
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    if (!gl) return false;
    // GPGPU needs float or half-float render targets.
    const ok = !!gl.getExtension("EXT_color_buffer_float") || !!gl.getExtension("EXT_color_buffer_half_float");
    gl.getExtension("WEBGL_lose_context")?.loseContext();
    return ok;
  } catch {
    return false;
  }
}

export function isMobile(): boolean {
  return (
    window.matchMedia("(pointer: coarse)").matches ||
    /Android|iPhone|iPad|iPod|Mobile/i.test(navigator.userAgent) ||
    window.innerWidth < 768
  );
}

function preset(tier: Tier, mobile: boolean): Quality {
  if (mobile) {
    return {
      tier,
      size: tier === "high" ? 160 : 144, // ~25k / ~20k particles
      dpr: [1, tier === "low" ? 1.25 : 1.6],
      post: tier === "low" ? "none" : "lite",
      glass: tier === "high",
      ink: tier !== "low",
      mobile,
    };
  }
  if (tier === "high")
    return { tier, size: 320, dpr: [1, 1.75], post: "full", glass: true, ink: true, mobile }; // ~102k
  if (tier === "medium")
    return { tier, size: 224, dpr: [1, 1.5], post: "full", glass: true, ink: true, mobile }; // ~50k
  return { tier, size: 160, dpr: [1, 1.25], post: "lite", glass: false, ink: false, mobile }; // ~25k
}

/**
 * Detects GPU tier with detect-gpu (benchmarks are self-hosted in /public/gpu-benchmarks).
 * `?quality=low|medium|high` in the URL overrides detection (handy for testing).
 */
export async function detectQuality(): Promise<Quality | null> {
  const mobile = isMobile();
  const forced = new URLSearchParams(location.search).get("quality") as Tier | null;
  if (forced && ["low", "medium", "high"].includes(forced)) return preset(forced, mobile);

  try {
    const { getGPUTier } = await import("detect-gpu");
    const result = await Promise.race([
      getGPUTier({ benchmarksURL: "/gpu-benchmarks" }),
      new Promise<null>((r) => setTimeout(() => r(null), 2500)),
    ]);
    if (!result) return preset(mobile ? "medium" : "high", mobile);
    if (result.type === "WEBGL_UNSUPPORTED") return null;
    // Software renderers / blocklisted GPUs still get the lightest 3D version.
    const tier: Tier = result.tier >= 3 ? "high" : result.tier === 2 ? "medium" : "low";
    // Unknown desktop GPUs (FALLBACK) are usually modern; don't punish them.
    if (result.type === "FALLBACK" && !mobile) return preset("medium", mobile);
    return preset(tier, mobile);
  } catch {
    return preset(mobile ? "medium" : "high", mobile);
  }
}
