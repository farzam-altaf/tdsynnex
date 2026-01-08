"use client";

import { supabase } from "@/lib/supabase/client";
import { register } from "module";
import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const [email, setEmail] = useState("");
  const [FirstName, setFirstName] = useState("");
  const [LastName, setLastName] = useState("");
  const [password, setPassword] = useState("");
  const [ConfirmPassword, setConfirmPassword] = useState("");
  const [reseller, setReseller] = useState("");
  const [loading, setLoading] = useState(false);
  const [isLoggedIn, setIsLoggedIn] = useState(false);
  const router = useRouter();

  useEffect(() => {
    // Check current session on mount
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) {
        setIsLoggedIn(true);
        router.replace("/");
      }
    });

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      if (session) {
        setIsLoggedIn(true);
        router.replace("/");
      } else {
        setIsLoggedIn(false);
      }
    });

    return () => subscription.unsubscribe();
  }, [router]);

  const [errors, setErrors] = useState({ email: "", password: "" });
  const [submitted, setSubmitted] = useState(false);

  const validateForm = () => {
    const newErrors = { email: "", password: "" };
    let isValid = true;

    if (!email.trim()) {
      newErrors.email = "E-mail Address is required";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    }

    if (password && ConfirmPassword && password !== ConfirmPassword) {
      newErrors.password = "Passwords do not match";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const signup = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1️⃣ Check if email already exists in users table
      const { data: existingUsers, error: selectError } = await supabase
        .from("users")
        .select("userId")
        .eq("email", email);

      if (selectError && selectError.code !== "PGRST116") {
        // PGRST116 = no rows found, safe to ignore
        toast.error("Error checking existing users: " + selectError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      if (existingUsers?.length != 0) {
        toast.error("User already exists with this email", {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      // 2️⃣ Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        toast.error(authError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;
      
      if (!userId) {
        toast.error("Signup failed: No user ID returned.", {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];

      // 3️⃣ Insert user details into users table
      const { error: dbError } = await supabase.from("users").insert({
        userId,
        firstName: FirstName,
        lastName: LastName,
        email,
        role: "subscriber",
        reseller,
        registered_at: today,
        login_at: today,
        login_count: 1,
      });

      if (dbError) {
        toast.error("Error saving user data: " + dbError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      // 4️⃣ Sign out the user immediately after signup
      await supabase.auth.signOut();

      // 5️⃣ Clear form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setConfirmPassword("");
      setReseller("");

      toast.success("Signup successful! Please login.", {
        style: { background: "black", color: "white" }
      });
      router.push("/login");
    } catch (err: any) {
      console.error(err);
      toast.error("An unexpected error occurred", {
        style: { background: "black", color: "white" }
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen">
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: "url('/computer-mouse-object-background.jpg')" }}
      />
      <div className="absolute inset-0 top-0 bg-white/92"></div>

      <div className="relative flex items-center justify-center min-h-screen px-3 py-22 lg:px-8">
        <div className="relative z-10 w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white sm:px-10 px-6 py-14">
          <div className="sm:mx-auto sm:w-full sm:max-w-sm">
            <h2 className="text-center text-2xl font-normal text-black">Registration</h2>
          </div>

          <div className="mt-10 sm:mx-auto sm:w-full sm:max-w-sm">
            <form onSubmit={signup} className="space-y-4">
              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Email (Username)</label>
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
                <label className="font-semibold text-gray-700 text-sm">First Name</label>
                <input
                  type="text"
                  value={FirstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Last Name</label>
                <input
                  type="text"
                  value={LastName}
                  onChange={(e) => setLastName(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Password</label>
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                />
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Confirm Password</label>
                <input
                  type="password"
                  value={ConfirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  className={`my-2 w-full rounded-md border px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition ${submitted && errors.password ? "border-red-500" : "border-gray-300"
                    }`}
                />
                {submitted && errors.password && (
                  <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-1">
                    {errors.password}
                  </div>
                )}
              </div>

              <div className="my-3">
                <label className="font-semibold text-gray-700 text-sm">Reseller</label>
                <input
                  type="text"
                  value={reseller}
                  onChange={(e) => setReseller(e.target.value)}
                  className="my-2 w-full rounded-md border border-gray-300 px-3 py-2 text-black focus:outline-none focus:ring-2 focus:ring-gray-200 focus:border-gray ring-gray-200 transition"
                />
              </div>

              <div className="flex justify-center pt-4">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-56 rounded-md bg-[#3ba1da] px-6 py-3 font-semibold cursor-pointer text-white transition-colors hover:bg-[#41abd6] disabled:opacity-50"
                >
                  {loading ? "Signing up..." : "Sign up"}
                </button>
              </div>
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
