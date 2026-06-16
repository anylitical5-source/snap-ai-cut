import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useAuth } from "@/hooks/use-auth";
import { supabase } from "@/integrations/supabase/client";
import { removeBackground } from "@/lib/api/bgcut.functions";
import { useServerFn } from "@tanstack/react-start";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { toast } from "sonner";
import { Upload, Download, LogOut, Sparkles, Loader2, ImageIcon, Trash2 } from "lucide-react";
import logoAsset from "@/assets/bgcut-logo.png.asset.json";

export const Route = createFileRoute("/dashboard")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Dashboard — BGCut AI" },
      { name: "description", content: "Your background removal workspace." },
    ],
  }),
  component: DashboardPage,
});

const MAX_BYTES = 10 * 1024 * 1024;
const ALLOWED = ["image/jpeg", "image/png", "image/webp"];

type HistoryRow = {
  id: string;
  original_filename: string | null;
  result_path: string | null;
  created_at: string;
  status: string;
};

function DashboardPage() {
  const { user, loading } = useAuth();
  const navigate = useNavigate();
  const inputRef = useRef<HTMLInputElement>(null);
  const [preview, setPreview] = useState<string | null>(null);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [progress, setProgress] = useState(0);
  const [processing, setProcessing] = useState(false);
  const [history, setHistory] = useState<HistoryRow[]>([]);
  const [credits, setCredits] = useState<{ used: number; max: number; plan: string } | null>(null);
  const removeFn = useServerFn(removeBackground);

  useEffect(() => {
    if (!loading && !user) navigate({ to: "/auth" });
  }, [loading, user, navigate]);

  useEffect(() => {
    if (!user) return;
    void refresh();
  }, [user]);

  async function refresh() {
    const [{ data: prof }, { data: hist }] = await Promise.all([
      supabase.from("profiles").select("plan, daily_credits, credits_used_today").eq("id", user!.id).maybeSingle(),
      supabase.from("uploads").select("id, original_filename, result_path, created_at, status").order("created_at", { ascending: false }).limit(12),
    ]);
    if (prof) setCredits({ used: prof.credits_used_today, max: prof.daily_credits, plan: prof.plan });
    if (hist) setHistory(hist as HistoryRow[]);
  }

  async function onFile(file: File) {
    if (!ALLOWED.includes(file.type)) return toast.error("Use JPG, PNG, or WEBP.");
    if (file.size > MAX_BYTES) return toast.error("Max 10MB.");
    if (!user) return;

    setResultUrl(null);
    setPreview(URL.createObjectURL(file));
    setProcessing(true);
    setProgress(10);

    try {
      const ext = file.name.split(".").pop() || "png";
      const path = `${user.id}/originals/${crypto.randomUUID()}.${ext}`;
      const { error: upErr } = await supabase.storage.from("bgcut").upload(path, file, { contentType: file.type });
      if (upErr) throw upErr;
      setProgress(40);

      const res = await removeFn({ data: { uploadPath: path, filename: file.name, bytes: file.size } });
      setProgress(90);

      if (res.downloadUrl) setResultUrl(res.downloadUrl);
      setProgress(100);
      toast.success("Background removed");
      await refresh();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Failed to process");
    } finally {
      setProcessing(false);
      setTimeout(() => setProgress(0), 800);
    }
  }

  async function downloadHistory(path: string) {
    const { data } = await supabase.storage.from("bgcut").createSignedUrl(path, 60 * 5);
    if (data?.signedUrl) window.open(data.signedUrl, "_blank");
  }

  async function signOut() {
    await supabase.auth.signOut();
    navigate({ to: "/" });
  }

  if (loading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="min-h-screen">
      {/* Top bar */}
      <header className="sticky top-0 z-40 border-b border-white/10 bg-background/70 backdrop-blur">
        <div className="mx-auto flex max-w-7xl items-center justify-between px-6 py-3">
          <Link to="/" className="flex items-center gap-2">
            <img src={logoAsset.url} alt="" className="h-8 w-8 rounded-md object-cover" />
            <span className="font-semibold">BGCut <span className="text-gradient">AI</span></span>
          </Link>
          <div className="flex items-center gap-3">
            {credits && (
              <div className="hidden items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs sm:flex">
                <Sparkles className="h-3.5 w-3.5 text-[var(--neon-cyan)]" />
                {credits.plan === "free"
                  ? `${Math.max(0, credits.max - credits.used)} / ${credits.max} left today`
                  : `Unlimited (${credits.plan})`}
              </div>
            )}
            <Button variant="ghost" size="sm" onClick={signOut}>
              <LogOut className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-7xl px-6 py-10">
        <div className="flex flex-col gap-1">
          <h1 className="text-3xl font-bold">Workspace</h1>
          <p className="text-sm text-muted-foreground">Drop an image, get a transparent PNG back in seconds.</p>
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-[1fr_360px]">
          {/* Upload / preview */}
          <section className="glass rounded-2xl p-6">
            {!preview ? (
              <div
                onClick={() => inputRef.current?.click()}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => {
                  e.preventDefault();
                  const f = e.dataTransfer.files?.[0];
                  if (f) void onFile(f);
                }}
                className="group cursor-pointer rounded-xl border-2 border-dashed border-white/15 p-14 text-center transition-all hover:border-[var(--neon-blue)]/60 hover:glow-sm"
              >
                <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-brand glow-sm">
                  <Upload className="h-7 w-7 text-primary-foreground" />
                </div>
                <h3 className="mt-4 text-xl font-semibold">Drop an image here</h3>
                <p className="mt-1 text-sm text-muted-foreground">JPG, PNG, WEBP · max 10MB</p>
                <Button className="mt-6 bg-gradient-brand text-primary-foreground border-0">Choose file</Button>
              </div>
            ) : (
              <div>
                <div className="grid gap-4 md:grid-cols-2">
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Original</p>
                    <div className="aspect-square overflow-hidden rounded-xl border border-white/10 bg-black/30">
                      <img src={preview} alt="Original" className="h-full w-full object-contain" />
                    </div>
                  </div>
                  <div>
                    <p className="mb-2 text-xs uppercase tracking-wider text-muted-foreground">Result</p>
                    <div
                      className="aspect-square overflow-hidden rounded-xl border border-white/10"
                      style={{
                        backgroundImage:
                          "conic-gradient(#0f172a 0% 25%, #1e293b 0% 50%, #0f172a 0% 75%, #1e293b 0% 100%)",
                        backgroundSize: "20px 20px",
                      }}
                    >
                      {resultUrl ? (
                        <img src={resultUrl} alt="Result" className="h-full w-full object-contain" />
                      ) : (
                        <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
                          {processing ? (
                            <span className="flex items-center gap-2"><Loader2 className="h-4 w-4 animate-spin" /> Cutting…</span>
                          ) : "Waiting"}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                {progress > 0 && <Progress value={progress} className="mt-4 h-1.5" />}
                <div className="mt-6 flex flex-wrap gap-2">
                  <Button
                    onClick={() => inputRef.current?.click()}
                    variant="outline"
                    className="border-white/15 bg-white/5"
                  >
                    <Upload className="mr-2 h-4 w-4" /> New image
                  </Button>
                  {resultUrl && (
                    <Button asChild className="bg-gradient-brand text-primary-foreground border-0">
                      <a href={resultUrl} download="bgcut-result.png">
                        <Download className="mr-2 h-4 w-4" /> Download PNG
                      </a>
                    </Button>
                  )}
                  <Button
                    variant="ghost"
                    onClick={() => { setPreview(null); setResultUrl(null); }}
                  >
                    <Trash2 className="mr-2 h-4 w-4" /> Clear
                  </Button>
                </div>
              </div>
            )}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) void onFile(f); e.target.value = ""; }}
            />
          </section>

          {/* History */}
          <aside className="glass rounded-2xl p-6">
            <h2 className="text-lg font-semibold">Recent</h2>
            <p className="text-xs text-muted-foreground">Auto-deleted after 24 hours</p>
            <div className="mt-4 space-y-2">
              {history.length === 0 && (
                <div className="rounded-lg border border-dashed border-white/10 p-6 text-center text-sm text-muted-foreground">
                  <ImageIcon className="mx-auto mb-2 h-5 w-5 opacity-50" /> No images yet
                </div>
              )}
              {history.map((h) => (
                <button
                  key={h.id}
                  disabled={!h.result_path}
                  onClick={() => h.result_path && downloadHistory(h.result_path)}
                  className="flex w-full items-center justify-between rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-left text-sm transition-colors hover:bg-white/10 disabled:opacity-50"
                >
                  <span className="truncate">{h.original_filename ?? "Untitled"}</span>
                  <Download className="h-4 w-4 text-muted-foreground" />
                </button>
              ))}
            </div>
          </aside>
        </div>
      </main>
    </div>
  );
}
