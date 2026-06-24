import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasSupabaseEnv, supabase } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import SiteFooter from "@/components/layout/SiteFooter";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === "true";

function hasRecoveryHash() {
  if (typeof window === "undefined") return false;
  const hash = window.location.hash;
  return hash.includes("type=recovery") || hash.includes("access_token=");
}

export default function KCResetPassword() {
  const navigate = useNavigate();
  const { updatePassword, isAuthenticated, isLoadingAuth } = useAuth();
  const notConfigured = !LOCAL_DEV_AUTH && !hasSupabaseEnv;

  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");
  const [canReset, setCanReset] = useState(hasRecoveryHash());
  const [sessionChecked, setSessionChecked] = useState(false);

  useEffect(() => {
    if (LOCAL_DEV_AUTH || !hasSupabaseEnv) {
      setSessionChecked(true);
      return;
    }

    const checkRecoverySession = async () => {
      if (hasRecoveryHash()) {
        setCanReset(true);
        setSessionChecked(true);
        return;
      }

      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        setCanReset(true);
      }
      setSessionChecked(true);
    };

    checkRecoverySession();
  }, []);

  useEffect(() => {
    if (!isLoadingAuth && sessionChecked && isAuthenticated && !canReset) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, canReset, sessionChecked, navigate]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");

    if (!canReset) {
      setError("This reset link is invalid or has expired. Please request a new one.");
      return;
    }
    if (!password) {
      setError("Please enter a new password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    setLoading(true);
    try {
      await updatePassword(password);
      setSuccessMessage("Password updated. You can now sign in with your new password.");
      setTimeout(() => {
        navigate("/login", { replace: true });
      }, 1500);
    } catch (err) {
      console.error("KCResetPassword failed:", err);
      setError(err.message || "Could not update password. Please try again.");
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
            <h1 className="text-2xl font-bold tracking-tight">Choose a new password</h1>
            <p className="text-sm text-muted-foreground mt-1">
              KitchenCheck helps small kitchens keep simple operational check records.
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

          {!canReset && !notConfigured && (
            <div className="rounded-xl bg-amber-500/10 border border-amber-500/25 px-3 py-2.5">
              <p className="text-xs text-amber-900 dark:text-amber-200 font-medium">
                This reset link is invalid or has expired.{" "}
                <Link to="/forgot-password" className="underline font-semibold">
                  Request a new link
                </Link>
              </p>
            </div>
          )}

          <form className="space-y-4" onSubmit={handleSubmit}>
            <div className="space-y-2">
              <Label htmlFor="kc-reset-password">New password</Label>
              <div className="relative">
                <Input
                  id="kc-reset-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="At least 6 characters"
                  className="h-11 rounded-xl pr-11"
                  disabled={loading || notConfigured || !canReset}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading || notConfigured || !canReset}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="kc-reset-confirm">Confirm password</Label>
              <Input
                id="kc-reset-confirm"
                type={showPassword ? "text" : "password"}
                autoComplete="new-password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Re-enter your password"
                className="h-11 rounded-xl"
                disabled={loading || notConfigured || !canReset}
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
              disabled={loading || notConfigured || !canReset}
            >
              {loading ? "Updating…" : "Update password"}
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
