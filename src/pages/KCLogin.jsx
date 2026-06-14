import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { ClipboardCheck, Eye, EyeOff } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import { hasSupabaseEnv } from "@/lib/supabaseClient";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const LOCAL_DEV_AUTH = import.meta.env.VITE_LOCAL_DEV_AUTH === "true";

export default function KCLogin() {
  const navigate = useNavigate();
  const { login, signup, isAuthenticated, isLoadingAuth } = useAuth();
  const notConfigured = !LOCAL_DEV_AUTH && !hasSupabaseEnv;

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [successMessage, setSuccessMessage] = useState("");

  useEffect(() => {
    if (!isLoadingAuth && isAuthenticated) {
      navigate("/", { replace: true });
    }
  }, [isAuthenticated, isLoadingAuth, navigate]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      navigate("/", { replace: true });
    } catch (err) {
      console.error("KCLogin sign in failed:", err);
      setError(err.message || "Sign in failed. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async (e) => {
    e.preventDefault();
    setError("");
    setSuccessMessage("");
    if (!email.trim() || !password) {
      setError("Please enter your email and password.");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      const result = await signup(email.trim(), password);
      if (result.needsEmailConfirmation) {
        setSuccessMessage("Account created. Check your email to confirm your account, then sign in.");
      } else {
        navigate("/", { replace: true });
      }
    } catch (err) {
      console.error("KCLogin sign up failed:", err);
      setError(err.message || "Could not create account. Please try again.");
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
            <h1 className="text-2xl font-bold tracking-tight">KitchenCheck</h1>
            <p className="text-sm text-muted-foreground mt-1">
              Sign in to manage your kitchen records.
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

          <form className="space-y-4" onSubmit={handleSignIn}>
            <div className="space-y-2">
              <Label htmlFor="kc-login-email">Email</Label>
              <Input
                id="kc-login-email"
                type="email"
                autoComplete="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@kitchen.com"
                className="h-11 rounded-xl"
                disabled={loading || notConfigured}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="kc-login-password">Password</Label>
              <div className="relative">
                <Input
                  id="kc-login-password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Enter your password"
                  className="h-11 rounded-xl pr-11"
                  disabled={loading || notConfigured}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  disabled={loading || notConfigured}
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
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
              {loading ? "Signing in…" : "Sign in"}
            </Button>
          </form>

          <Button
            type="button"
            variant="outline"
            className="w-full h-11 text-sm font-semibold"
            disabled={loading || notConfigured}
            onClick={handleSignUp}
          >
            {loading ? "Please wait…" : "Create account"}
          </Button>
        </div>

        <div className="text-center space-y-2">
          <p className="text-xs text-muted-foreground">New to KitchenCheck?</p>
          <nav
            aria-label="Public information"
            className="flex flex-wrap items-center justify-center text-xs text-muted-foreground"
          >
            <Link to="/pricing" className="hover:text-foreground px-2 py-2">
              Pricing
            </Link>
            <span aria-hidden="true" className="text-muted-foreground/50">·</span>
            <Link to="/privacy" className="hover:text-foreground px-2 py-2">
              Privacy
            </Link>
            <span aria-hidden="true" className="text-muted-foreground/50">·</span>
            <Link to="/terms" className="hover:text-foreground px-2 py-2">
              Terms
            </Link>
            <span aria-hidden="true" className="text-muted-foreground/50">·</span>
            <Link to="/cookies" className="hover:text-foreground px-2 py-2">
              Cookies
            </Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
