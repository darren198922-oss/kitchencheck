import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasSupabaseEnv } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteFooter from "@/components/layout/SiteFooter";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === "true";

export default function KCForgotPassword() {
  const navigate = useNavigate();
  const { requestPasswordReset, isAuthenticated, isLoadingAuth } = useAuth();
  const notConfigured = !LOCAL_DEV_AUTH && !hasSupabaseEnv;

  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!email.trim()) {
      setError("Please enter your email address.");
      return;
    }
    setLoading(true);
    try {
      await requestPasswordReset(email.trim());
      setSuccessMessage("If an account exists for that email, we sent a reset link. Check your inbox.");
    } catch (err) {
      console.error("KCForgotPassword failed:", err);
      setError(err.message || "Could not send reset email. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-background flex flex-col items-center justify-center p-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="text-center space-y-3">
          <div className="w-14 h-14 rounded-2xl bg-primary mx-auto flex items-center justify-center">
            <ClipboardCheck className="w-7 h-7 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight">Reset password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Enter your email and we will send you a reset link.
            </p>
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border p-5 space-y-4 shadow-sm">
          {notConfigured && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2.5">
              <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                KitchenCheck is not configured yet. Please contact support.
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="kc-forgot-email">Email</Label>
              <Input
                id="kc-forgot-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@kitchen.com"
                className="h-11 rounded-xl"
                disabled={loading || notConfigured}
              />
            </div>

            {error && (
              <div className="rounded-xl bg-red-500/10 border border-red-400/30 px-3 py-2.5">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            {successMessage && (
              <div className="rounded-xl bg-emerald-500/10 border border-emerald-400/30 px-3 py-2.5">
                <p className="text-xs text-emerald-700 dark:text-emerald-400 font-medium">{successMessage}</p>
              </div>
            )}

            <Button
              type="submit"
              className="w-full h-11 text-sm font-bold"
              disabled={loading || notConfigured}
            >
              {loading ? "Sending…" : "Send reset link"}
            </Button>
          </form>

          <p className="text-center text-xs text-muted-foreground">
            <Link to="/login" className="text-foreground font-medium hover:underline">
              Back to sign in
            </Link>
          </p>
        </div>

        <SiteFooter showBuiltBy />
      </div>
    </div>
  );
}
