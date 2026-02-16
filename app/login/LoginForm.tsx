"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";
import { emailTemplates, sendEmail } from "@/lib/email";
import { logger, logAuth, logError, logSuccess } from "@/lib/logger";
import crypto from 'crypto';

// LoginForm.tsx file ke bahar, import ke baad
class PasswordHash {
  private itoa64 = './0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz'
  private iterationCountLog2: number
  private portableHashes: boolean
  constructor(iterationCountLog2: number, portableHashes: boolean) {
    if (iterationCountLog2 < 4 || iterationCountLog2 > 31) iterationCountLog2 = 8
    this.iterationCountLog2 = iterationCountLog2
    this.portableHashes = portableHashes
  }
  checkPassword(password: string, storedHash: string) {
    const hash = this.cryptPrivate(password, storedHash)
    return hash === storedHash
  }
  private cryptPrivate(password: string, setting: string) {
    let output = '*0'
    if (setting.substring(0, 2) === '*0') output = '*1'
    const id = setting.substring(0, 3)
    if (id !== '$P$' && id !== '$H$') return output
    const countLog2 = this.itoa64.indexOf(setting[3])
    if (countLog2 < 7 || countLog2 > 30) return output
    const count = 1 << countLog2
    const salt = setting.substring(4, 12)
    if (salt.length !== 8) return output
    let hash = crypto.createHash('md5').update(salt + password).digest()
    for (let i = 0; i < count; i++) {
      hash = crypto.createHash('md5').update(Buffer.concat([hash, Buffer.from(password)])).digest()
    }
    return setting.substring(0, 12) + this.encode64(hash, 16)
  }
  private encode64(input: Buffer, count: number) {
    let output = ''
    let i = 0
    do {
      let value = input[i++]
      output += this.itoa64[value & 0x3f]
      if (i < count) value |= input[i] << 8
      output += this.itoa64[(value >> 6) & 0x3f]
      if (i++ >= count) break
      if (i < count) value |= input[i] << 16
      output += this.itoa64[(value >> 12) & 0x3f]
      if (i++ >= count) break
      output += this.itoa64[(value >> 18) & 0x3f]
    } while (i < count)
    return output
  }
}


export default function LoginForm() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [isloading, setLoading] = useState(false);
  const [errors, setErrors] = useState({
    email: "",
    password: "",
  });
  const [submitted, setSubmitted] = useState(false);

  const searchParams = useSearchParams();
  const router = useRouter();
  const { profile, isLoggedIn, loading, user } = useAuth();
  const [showContent, setShowContent] = useState(false); // New state for controlled content display
  const [initialLoadingComplete, setInitialLoadingComplete] = useState(false); // Track initial loading

  const source = `${process.env.NEXT_PUBLIC_APP_URL || window.location.origin}/login`;

  // Initial delay to show loading spinner first - NO AUTH CHECK DURING THIS
  useEffect(() => {
    const timer = setTimeout(() => {
      setShowContent(true);
      setInitialLoadingComplete(true);
    }, 2000); // 1.2 seconds delay before checking auth

    return () => clearTimeout(timer);
  }, []);

  // Handle auth check ONLY AFTER initial loading is complete
  useEffect(() => {
    // Don't check auth until initial loading is complete
    if (!initialLoadingComplete) return;

    // If still loading auth, wait
    if (loading) return;

    // Now check if user is already logged in and verified
    if (isLoggedIn && profile?.isVerified === true) {
      const redirectTo = searchParams.get("redirect_to");
      const redirectPath = redirectTo ? `/${redirectTo}` : "/";

      // Log auto-redirect
      logAuth('auto_redirect', `User already logged in, redirecting to ${redirectPath}`, user?.id, undefined, 'completed', source);

      // Show redirecting state briefly then redirect
      setTimeout(() => {
        router.push(redirectPath);
      }, 10);

      return;
    }

  }, [initialLoadingComplete, loading, isLoggedIn, profile, router, searchParams, user?.id, source]);


  const [progress, setProgress] = useState(0);
  useEffect(() => {
    let current = 0;

    const interval = setInterval(() => {
      current += 2; // speed control (2% per tick)

      if (current >= 90) {
        current = 90;
        clearInterval(interval);
      }

      setProgress(current);
    }, 30); // smooth animation

    return () => clearInterval(interval);
  }, []);

  // Show loading spinner for initial 1.2 seconds
  if (!showContent) {
    return (
      <div className="relative min-h-screen">
        {/* Background image */}
        <div
          className="bg-white"
        />

        {/* Loading content - Only shows for first 1.2 seconds */}
        <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white sm:px-13 px-6 py-14">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  className="h-10 object-contain"
                />
              </div>

              {/* Progress bar */}
              <div className="w-full bg-gray-200 rounded-full h-2.5 mb-4">
                <div
                  className="bg-[#35c8dc] h-2.5 rounded-full animate-pulse"
                  style={{ width: `${progress}%` }}>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If initial loading is complete AND user is logged in AND verified, show redirecting
  if (initialLoadingComplete && !loading && isLoggedIn && profile?.isVerified === true) {
    return (
      <div className="relative min-h-screen">
        {/* Background image */}
        <div
          className="bg-white"
        />

        {/* Redirecting content */}
        <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white sm:px-13 px-6 py-14">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  className="h-10 object-contain"
                />
              </div>

              {/* Spinner */}
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#35c8dc]"></div>
              </div>

              {/* Redirecting text */}
              <div className="text-center">
                <p className="text-gray-600">Redirecting to your dashboard...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // If still loading auth data after initial loading, show auth loading
  if (loading) {
    return (
      <div className="relative min-h-screen">
        {/* Background image */}
        <div
          className="bg-white"
        />

        {/* Auth loading content */}
        <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
          <div className="relative z-10 w-full max-w-md rounded-2xl bg-white sm:px-13 px-6 py-14">
            <div className="sm:mx-auto sm:w-full sm:max-w-sm">
              {/* Logo */}
              <div className="flex justify-center mb-8">
                <img
                  src="/logo.png"
                  alt="Company Logo"
                  className="h-10 object-contain"
                />
              </div>

              {/* Spinner */}
              <div className="flex justify-center mb-4">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#35c8dc]"></div>
              </div>

              {/* Loading text */}
              <div className="text-center">
                <p className="text-gray-600">Checking authentication...</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Normal login form (only shown if user is not logged in)
  const validateForm = () => {
    const newErrors = {
      email: "",
      password: "",
    };

    let isValid = true;

    // Only validate email and password
    if (!email.trim()) {
      newErrors.email = "E-mail Address is required";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  console.log(profile);

  const signin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);
    const startTime = Date.now();

    if (!validateForm()) {
      toast.error("Please fill in all required fields");
      return;
    }

    setLoading(true);
    const trimmedEmail = email.trim().toLowerCase();

    console.log('🔍 Debug - Login attempt for:', trimmedEmail);

    try {
      // 1. Try normal login first
      console.log('🔄 Attempting normal Supabase auth...');

      const { data: normalAuthData, error: normalAuthError } = await supabase.auth.signInWithPassword({
        email: trimmedEmail,
        password,
      });

      if (!normalAuthError && normalAuthData?.user) {
        console.log('✅ Normal auth successful');
        await handleSuccessfulLogin(normalAuthData.user.id, trimmedEmail, startTime, false);
        return;
      }

      console.log('❌ Normal auth failed:', normalAuthError?.message);

      // 2. Use the existing Next.js API route instead of Edge Function
      console.log('🔄 Falling back to Next.js API route...');

      try {
        const verifyResponse = await fetch('/api/user-verification', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ email: trimmedEmail, password }),
        });

        console.log('📡 API Response status:', verifyResponse.status);

        if (!verifyResponse.ok) {
          const errorText = await verifyResponse.text();

          // Try to parse as JSON
          try {
            const errorData = JSON.parse(errorText);
            toast.error(errorData.error || "Invalid credentials");
          } catch {
            toast.error("Authentication failed. Please try again.");
          }
          setLoading(false);
          return;
        }

        const verifyData = await verifyResponse.json();
        console.log('✅ API Response data:', verifyData);

        if (!verifyData.success) {
          toast.error(verifyData.error || "Invalid credentials");
          setLoading(false);
          return;
        }

        // 3. Handle API response
        if (verifyData.existsInAuth) {
          console.log('🔄 User exists in Auth, trying login again...');

          // Try login again with Supabase
          const { data: newAuthData, error: newAuthError } = await supabase.auth.signInWithPassword({
            email: trimmedEmail,
            password,
          });

          if (newAuthError) {

            if (verifyData.needsPasswordUpdate) {
              toast.error(
                <div>
                  Account needs password update. <br />
                  <Link href="/password-reset" className="underline">Reset your password</Link>
                </div>,
                { duration: 8000 }
              );
            } else {
              toast.error("Invalid email or password");
            }
            setLoading(false);
          } else {
            console.log('✅ Login successful after API migration');
            await handleSuccessfulLogin(newAuthData.user.id, trimmedEmail, startTime, true);
          }
        } else {
          toast.error("Account not found or not migrated");
          setLoading(false);
        }

      } catch (apiError) {
        toast.error("Authentication service unavailable");
        setLoading(false);
      }

    } catch (error) {
      toast.error("Authentication error. Please try again.");
      setLoading(false);
    }
  };

  // ✅ Helper function for successful login
  const handleSuccessfulLogin = async (
    userId: string,
    userEmail: string,
    startTime: number,
    isLegacyMigration: boolean
  ) => {
    const executionTime = Date.now() - startTime;

    if (!userId) {
      await logError('auth', 'user_id_missing', 'No user ID returned after successful login',
        { email: userEmail, isLegacyMigration }, '', source);
      setLoading(false);
      return;
    }

    // 🔍 CHECK isVerified
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("isVerified, firstName, lastName, email, login_count, password, userId")
      .eq("email", email)
      .single();


    if (userData?.userId != null) {
      const { error: uErr } = await supabase
        .from('users')
        .update({
          userId: user?.id,
          password: null
        })
        .eq('email', email)


      const { error: delErr } = await supabase
        .from('wp_pass')
        .delete()
        .eq('email', email)
    }

    if (userError) {
      await logError('db', 'user_fetch_failed', `Failed to fetch user data: ${userError.message}`,
        userError, userId, source);
      toast.error("Unable to verify account status", {
        style: { background: "black", color: "white" },
      });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // ❌ NOT APPROVED
    if (!userData?.isVerified) {
      await logger.warning('auth', 'account_not_approved',
        `Login attempt for unapproved account: ${userEmail}`,
        { email: userEmail, userId, isLegacyMigration }, userId, source);

      toast.error("Your account is not approved yet.", {
        style: { background: "black", color: "white" },
      });

      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // Update login stats
    if (userId) {
      const { data: userRow } = await supabase
        .from("users")
        .select("login_count")
        .eq("userId", userId)
        .single();

      if (userRow) {
        const previousCount = parseInt(userRow?.login_count || "0", 10);

        await supabase.from("users").update({
          login_at: new Date().toISOString().split("T")[0],
          login_count: String(previousCount + 1),
        }).eq("userId", userId);

        await logger.info('auth', 'login_stats_updated', `Login stats updated for user: ${userEmail}`, {
          email: userEmail,
          userId,
          previousCount,
          executionTime,
          isLegacyMigration
        }, userId, source);
      }
    }

    // Log success
    await logSuccess('auth', 'login_successful',
      `User logged in ${isLegacyMigration ? 'via legacy migration' : 'normally'}: ${userEmail}`, {
      email: userEmail,
      userId,
      executionTime,
      isLegacyMigration,
      userData: {
        firstName: userData?.firstName,
        lastName: userData?.lastName,
        isVerified: userData?.isVerified,
        loginCount: userData?.login_count
      }
    }, userId, source);

    console.log(userData);


    const { error: uErr } = await supabase
      .from('users')
      .update({
        userId: user?.id,
        password: null
      })
      .eq('email', email)


    const { error: delErr } = await supabase
      .from('wp_pass')
      .delete()
      .eq('email', email)

    toast.success("Login successful!", {
      style: { background: "black", color: "white" },
    });
    // Send welcome email
    const userName = userData?.firstName || "User";
    await sendLoginEmail(userName, userEmail, userId);

    // Reset form
    setEmail("");
    setPassword("");

    // Redirect
    const redirectTo = searchParams.get("redirect_to");
    const redirectPath = redirectTo ? `/${redirectTo}` : "/";

    await logger.info('auth', 'redirecting_after_login',
      `Redirecting user to: ${redirectPath}`, {
      email: userEmail,
      userId,
      redirectPath,
      isLegacyMigration
    }, userId, source);

    router.push(redirectPath);
  };

  const sendLoginEmail = async (name: string, userEmail: string, userId?: string) => {
    try {
      const template = emailTemplates.welcomeEmail(name, userEmail);

      const result = await sendEmail({
        to: userEmail,
        subject: template.subject,
        text: template.text,
        html: template.html,
      });

      if (result.success) {
        await logger.success('email', 'welcome_email_sent', `Welcome email sent to: ${userEmail}`, {
          to: userEmail,
          subject: template.subject
        }, userId, source);
      } else {
        await logger.warning('email', 'welcome_email_failed', `Failed to send welcome email to: ${userEmail}`, {
          to: userEmail,
          error: result.error
        }, userId, source);
      }
    } catch (emailError) {
      await logError('email', 'email_send_exception', `Exception while sending welcome email`, emailError, userId, source);
    }
  };

  return (
    <div className="relative min-h-screen">
      {/* Background image */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/computer-mouse-object-background.jpg')",
        }}
      />

      {/* White overlay for entire content area */}
      <div className="absolute inset-0 top-0 bg-white/92"></div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
        <div className="relative z-10 w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white sm:px-13 px-6 py-14">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="text-center text-2xl font-normal text-black">
              Login
            </h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form onSubmit={signin} className="space-y-4">
              <div className="my-3">
                <label htmlFor="" className="font-semibold text-gray-700 text-sm">
                  Email
                </label>
                <input
                  type="text"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.email ? "border-red-500" : "border-gray-300"
                    }`}
                />
                {submitted && errors.email && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.email}
                  </div>
                )}
              </div>

              <div className="my-3">
                <label htmlFor="" className="font-semibold text-gray-700 text-sm">
                  Password
                </label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                />
                {submitted && errors.password && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.password}
                  </div>
                )}
              </div>
              <div className="flex w-full gap-4 mt-6">
                <div className="flex-1">
                  <button
                    type="submit"
                    disabled={isloading}
                    className="w-full rounded-md bg-[#3ba1da] px-6 py-3 cursor-pointer font-semibold text-white transition-all hover:bg-[#41abd6] hover:shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {isloading ? "Please wait..." : "Login"}
                  </button>
                </div>

                <div className="flex-1">
                  <Link
                    href={"/account-registration"}
                    className="flex items-center justify-center w-full rounded-md bg-white px-6 py-3 font-semibold text-gray-700 transition-all hover:bg-gray-50 hover:shadow-md border border-gray-300"
                  >
                    Register
                  </Link>
                </div>
              </div>

              <Link
                href={"/password-reset"}
                className="flex justify-center font-normal text-[#7c7c7c] hover:text-[#3ba1da] transition-colors"
              >
                <h4>Forgot your password?</h4>
              </Link>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}