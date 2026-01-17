"use client";

import { supabase } from "@/lib/supabase/client";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useAuth } from "../context/AuthContext";

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
  const [authChecked, setAuthChecked] = useState(false);
  const [authInitialized, setAuthInitialized] = useState(false);
  const [isRedirecting, setIsRedirecting] = useState(false);

  // Handle auth check for logged-in users - FIXED VERSION
  useEffect(() => {
    // Don't do anything if still loading
    if (loading) {
      return;
    }

    // Mark auth as initialized
    setAuthInitialized(true);

    // Check if user is already logged in and verified
    if (isLoggedIn && profile?.isVerified === true) {
      console.log("User is already logged in and verified");

      // Prevent multiple redirects
      if (!isRedirecting) {
        setIsRedirecting(true);
        const redirectTo = searchParams.get("redirect_to");
        const redirectPath = redirectTo ? `/${redirectTo}` : "/";
        console.log("Redirecting to:", redirectPath);

        // Use setTimeout to ensure redirect happens in next tick
        setTimeout(() => {
          router.push(redirectPath);
        }, 100);
      }
    } else {
      console.log("User not logged in or not verified, staying on login page");
      setAuthChecked(true);
    }
  }, [loading, isLoggedIn, profile, router, searchParams, isRedirecting]);

  // Optional: prevent UI flicker - MUST BE AFTER ALL HOOKS
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ba1da] mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    );
  }

  // If already logged in and redirecting, show loading
  if (isLoggedIn && profile?.isVerified === true && !authChecked) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-[#3ba1da] mx-auto"></div>
          <p className="mt-4 text-gray-600">Redirecting...</p>
        </div>
      </div>
    );
  }

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

  const signin = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) {
      toast.error("Please fill in all required fields", {
        style: { background: "black", color: "white" },
      });
      return;
    }

    setLoading(true);

    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      if (error.message === "Email not confirmed") {
        toast.error(
          "Your email address has not been confirmed yet. Please check your inbox and confirm your email to continue.",
          { style: { background: "black", color: "white" } }
        );
      } else {
        toast.error(error.message, {
          style: { background: "black", color: "white" },
        });
      }
      setLoading(false);
      return;
    }

    // ✅ USER LOGIN SUCCESS
    const userId = data.user?.id;


    if (!userId) return;

    // 🔍 CHECK isVerified
    const { data: userData, error: userError } = await supabase
      .from("users")
      .select("isVerified")
      .eq("userId", userId)
      .single();

    if (userError) {
      toast.error("Unable to verify account status", {
        style: { background: "black", color: "white" },
      });
      await supabase.auth.signOut();
      setLoading(false);
      return;
    }

    // ❌ NOT APPROVED
    if (!userData?.isVerified) {
      toast.error("Your account is not approved yet.", {
        style: { background: "black", color: "white" },
      });

      await supabase.auth.signOut(); // 🔴 force logout
      setLoading(false);
      return;
    }

    if (userId) {
      // 1️⃣ Get previous login_count
      const { data: userRow, error: fetchError } = await supabase
        .from("users")
        .select("login_count")
        .eq("userId", userId)
        .single();

      if (!fetchError) {
        const previousCount = parseInt(userRow?.login_count || "0", 10);

        // 2️⃣ Update login_at & login_count
        await supabase.from("users").update({
          login_at: new Date().toISOString().split("T")[0], // today
          login_count: String(previousCount + 1), // varchar +1
        }).eq("userId", userId);
      }
    }

    toast.success("Login successful!", {
      style: { background: "black", color: "white" },
    });

    setEmail("");
    setPassword("");
    const redirectTo = searchParams.get("redirect_to");
    router.push(redirectTo ? `/${redirectTo}` : "/");
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
                  placeholder="Enter work email"
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

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={isloading}
                  className="w-full rounded-md bg-[#3ba1da] px-6 py-3 cursor-pointer font-semibold text-white transition-colors hover:bg-[#41abd6] disabled:opacity-50"
                >
                  {isloading ? "Please wait..." : "Login"}
                </button>
              </div>

              <div className="flex justify-center">
                <Link
                  href={"/account-registration"}
                  className="w-full rounded-md text-center bg-[#eeeeee] px-6 py-3 font-normal text-gray-600 transition-colors hover:bg-[#e6e6e6] shadow-lg"
                >
                  Register
                </Link>
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