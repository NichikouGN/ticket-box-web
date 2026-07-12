import { useState, useMemo, type FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { Ticket, Mail, Lock, User, Loader2, Eye, EyeOff, Check, X } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { useAuth, ApiError } from "@/contexts/AuthContext";

interface PasswordStrength {
  score: number; // 0-5
  label: string;
  color: string;
  bgColor: string;
  checks: {
    length: boolean;
    uppercase: boolean;
    lowercase: boolean;
    number: boolean;
    special: boolean;
  };
}

function getPasswordStrength(password: string): PasswordStrength {
  const checks = {
    length: password.length >= 8,
    uppercase: /[A-Z]/.test(password),
    lowercase: /[a-z]/.test(password),
    number: /[0-9]/.test(password),
    special: /[^A-Za-z0-9]/.test(password),
  };

  const score = Object.values(checks).filter(Boolean).length;

  const configs: Record<number, { label: string; color: string; bgColor: string }> = {
    0: { label: "", color: "bg-border", bgColor: "bg-surface" },
    1: { label: "Very weak", color: "bg-red-500", bgColor: "bg-red-500/10" },
    2: { label: "Weak", color: "bg-orange-500", bgColor: "bg-orange-500/10" },
    3: { label: "Fair", color: "bg-yellow-500", bgColor: "bg-yellow-500/10" },
    4: { label: "Strong", color: "bg-emerald-500", bgColor: "bg-emerald-500/10" },
    5: { label: "Very strong", color: "bg-emerald-400", bgColor: "bg-emerald-400/10" },
  };

  const config = configs[score] || configs[0];

  return { score, checks, ...config };
}

export default function SignupPage() {
  const navigate = useNavigate();
  const { signup } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const strength = useMemo(() => getPasswordStrength(password), [password]);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");

    if (!fullName || !email || !password || !confirmPassword) {
      setError("Please fill in all fields.");
      return;
    }

    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return;
    }

    if (strength.score < 3) {
      setError("Please choose a stronger password.");
      return;
    }

    setIsSubmitting(true);
    try {
      await signup({ fullName, email, password });
      navigate("/login", { replace: true, state: { signupSuccess: true } });
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else if (err instanceof Error) {
        setError(err.message);
      } else {
        setError("An unexpected error occurred.");
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const checkItems = [
    { key: "length" as const, label: "At least 8 characters" },
    { key: "uppercase" as const, label: "Uppercase letter" },
    { key: "lowercase" as const, label: "Lowercase letter" },
    { key: "number" as const, label: "Number" },
    { key: "special" as const, label: "Special character" },
  ];

  return (
    <div className="min-h-screen flex items-center justify-center relative overflow-hidden bg-background text-foreground transition-colors duration-300 py-8">
      <motion.div
        initial={{ opacity: 0, y: 24, scale: 0.98 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.5, ease: "easeOut" }}
        className="w-full max-w-md mx-4 z-10"
      >
        <Card className="border-border bg-card shadow-lg transition-colors duration-300">
          <CardHeader className="text-center space-y-4 pb-2">
            {/* Logo */}
            <motion.div
              initial={{ scale: 0 }}
              animate={{ scale: 1 }}
              transition={{ delay: 0.2, type: "spring", stiffness: 200 }}
              className="mx-auto w-14 h-14 rounded-2xl bg-primary flex items-center justify-center shadow-md transition-colors duration-300"
            >
              <Ticket className="w-7 h-7 text-primary-foreground" />
            </motion.div>

            <div>
              <CardTitle className="text-2xl font-bold text-foreground">
                Create your account
              </CardTitle>
              <CardDescription className="text-muted mt-1">
                Join TicketBox and never miss an event
              </CardDescription>
            </div>
          </CardHeader>

          <CardContent className="pt-4">
            <form onSubmit={handleSubmit} className="space-y-4">
              {/* Error message */}
              {error && (
                <motion.div
                  initial={{ opacity: 0, y: -8 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-sm text-center"
                >
                  {error}
                </motion.div>
              )}

              {/* Full Name */}
              <div className="space-y-2">
                <Label htmlFor="signup-name">Full Name</Label>
                <div className="relative">
                  <User className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    id="signup-name"
                    type="text"
                    placeholder="John Doe"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    className="pl-10 border-border bg-input"
                    autoComplete="name"
                    aria-label="Full name"
                  />
                </div>
              </div>

              {/* Email */}
              <div className="space-y-2">
                <Label htmlFor="signup-email">Email</Label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    id="signup-email"
                    type="email"
                    placeholder="you@example.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    className="pl-10 border-border bg-input"
                    autoComplete="email"
                    aria-label="Email address"
                  />
                </div>
              </div>

              {/* Password */}
              <div className="space-y-2">
                <Label htmlFor="signup-password">Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    id="signup-password"
                    type={showPassword ? "text" : "password"}
                    placeholder="Create a password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="pl-10 pr-10 border-border bg-input"
                    autoComplete="new-password"
                    aria-label="Password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>

                {/* Password strength indicator */}
                {password && (
                  <motion.div
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    transition={{ duration: 0.3 }}
                    className="space-y-3 pt-1"
                  >
                    {/* Progress bar */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center">
                        <span className="text-xs text-muted">Password strength</span>
                        <span className="text-xs font-medium text-muted">{strength.label}</span>
                      </div>
                      <div className="h-1.5 bg-surface rounded-full overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${strength.color}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${(strength.score / 5) * 100}%` }}
                          transition={{ duration: 0.4, ease: "easeOut" }}
                        />
                      </div>
                    </div>

                    {/* Check list */}
                    <div className="grid grid-cols-2 gap-1.5">
                      {checkItems.map((item) => (
                        <div
                          key={item.key}
                          className="flex items-center gap-1.5 text-xs"
                        >
                          {strength.checks[item.key] ? (
                            <Check className="w-3 h-3 text-emerald-500 shrink-0" />
                          ) : (
                            <X className="w-3 h-3 text-muted shrink-0" />
                          )}
                          <span
                            className={
                              strength.checks[item.key]
                                ? "text-foreground"
                                : "text-muted"
                            }
                          >
                            {item.label}
                          </span>
                        </div>
                      ))}
                    </div>
                  </motion.div>
                )}
              </div>

              {/* Confirm Password */}
              <div className="space-y-2">
                <Label htmlFor="signup-confirm">Confirm Password</Label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-muted" />
                  <Input
                    id="signup-confirm"
                    type={showConfirmPassword ? "text" : "password"}
                    placeholder="Confirm your password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className={`pl-10 pr-10 border-border bg-input ${
                      confirmPassword && confirmPassword !== password
                        ? "border-red-500/50 focus:ring-red-500/50"
                        : ""
                    }`}
                    autoComplete="new-password"
                    aria-label="Confirm password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                    className="absolute right-3.5 top-1/2 -translate-y-1/2 text-muted hover:text-foreground transition-colors"
                    aria-label={showConfirmPassword ? "Hide password" : "Show password"}
                  >
                    {showConfirmPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                  </button>
                </div>
                {confirmPassword && confirmPassword !== password && (
                  <motion.p
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    className="text-xs text-red-500"
                  >
                    Passwords do not match
                  </motion.p>
                )}
              </div>

              {/* Submit */}
              <Button
                type="submit"
                variant="default"
                size="lg"
                className="w-full mt-2"
                disabled={isSubmitting}
                id="signup-submit-btn"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    Creating account...
                  </>
                ) : (
                  "Create Account"
                )}
              </Button>
            </form>

            {/* Divider */}
            <div className="relative my-6">
              <Separator className="bg-border" />
              <span className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-card px-3 text-xs text-muted transition-colors duration-300">
                or
              </span>
            </div>

            {/* Login link */}
            <p className="text-center text-sm text-muted">
              Already have an account?{" "}
              <Link
                to="/login"
                className="text-foreground hover:underline font-semibold transition-colors"
              >
                Sign in
              </Link>
            </p>
          </CardContent>
        </Card>

        {/* Branding */}
        <p className="text-center text-xs text-muted/60 mt-6">
          © {new Date().getFullYear()} TicketBox. All rights reserved.
        </p>
      </motion.div>
    </div>
  );
}
