"use client";

import { emailTemplates, sendEmail } from "@/lib/email";
import { UserRegCC, UserRegisterEmail } from "@/lib/emailconst";
import { logAuth, logError, logger } from "@/lib/logger";
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

    const startTime = Date.now();
    const source = `${process.env.NEXT_PUBLIC_APP_URL}/account-registration`;

    if (!validateForm()) return;

    setLoading(true);

    try {
      // 1️⃣ Check if email already exists in users table
      const { data: existingUsers, error: selectError } = await supabase
        .from("users")
        .select("userId")
        .eq("email", email);

      if (selectError && selectError.code !== "PGRST116") {
        await logError(
          'auth',
          'user_check',
          `Error checking existing user: ${selectError.message}`,
          selectError,
          ``, // FIXED
          source
        );

        toast.error("Error checking existing users: " + selectError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      if (existingUsers?.length != 0) {
        await logger.warning(
          'auth',
          'duplicate_registration',
          `Duplicate registration attempt: ${email}`,
          { email },
          ``, // FIXED
          source
        );
        toast.error("User already exists with this email", {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      await logAuth(
        'registration_start',
        `Registration attempt: ${email}`,
        ``, // FIXED
        { email, firstName: FirstName, lastName: LastName },
        `completed`,
        source,
      );

      // 2️⃣ Sign up with Supabase Auth
      const { data: authData, error: authError } = await supabase.auth.signUp({
        email,
        password,
      });

      if (authError) {
        await logError(
          'auth',
          'supabase_auth',
          `Auth error: ${authError.message}`,
          authError,
          ``, // FIXED
          source
        );
        toast.error(authError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      const userId = authData.user?.id;

      if (!userId) {
        await logError(
          'auth',
          'user_id_missing',
          'No user ID returned',
          { email, authData },
          ``, // FIXED
          source
        );
        toast.error("Signup failed: No user ID returned.", {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      const today = new Date().toISOString().split("T")[0];
      const registrationDate = formatRegistrationDate();

      // 3️⃣ Insert user details into users table
      const { error: dbError } = await supabase.from("users").insert({
        userId,
        firstName: FirstName,
        lastName: LastName,
        email,
        role: process.env.NEXT_PUBLIC_SUBSCRIBER,
        reseller,
        registered_at: today,
        login_at: today,
        login_count: 1,
        isVerified: false
      });

      if (dbError) {
        await logError(
          'db',
          'user_insert',
          `Database insert error: ${dbError.message}`,
          dbError,
          userId,
          source
        );
        toast.error("Error saving user data: " + dbError.message, {
          style: { background: "black", color: "white" }
        });
        setLoading(false);
        return;
      }

      await logger.success(
        'auth',
        'user_created',
        `User created: ${email}`,
        { userId, email, firstName: FirstName, lastName: LastName, reseller },
        userId,
        source
      );

      // 4️⃣ Sign out the user immediately after signup
      await supabase.auth.signOut();

      await logAuth('auto_signout', 'Auto-signed out after registration', userId);

      // 5️⃣ Send emails (non-blocking - don't await)
      sendRegistrationEmails(FirstName, LastName, email, reseller, registrationDate);

      const executionTime = Date.now() - startTime;
      await logger.success(
        'auth',
        'registration_complete',
        `Registration completed: ${email}`,
        {
          email,
          firstName: FirstName,
          lastName: LastName,
          reseller,
          execution_time_ms: executionTime
        },
        userId,
        source
      );

      // 6️⃣ Clear form
      setEmail("");
      setFirstName("");
      setLastName("");
      setPassword("");
      setConfirmPassword("");
      setReseller("");

      toast.success("Registration successful! Please wait for admin approval.", {
        style: { background: "black", color: "white" }
      });

      router.push("/login");
    } catch (err: any) {
      const executionTime = Date.now() - startTime;
      await logError(
        'system',
        'unexpected_error',
        `Unexpected error: ${err.message}`,
        {
          error: err.message,
          stack: err.stack,
          execution_time_ms: executionTime
        },
        ``, // FIXED
        source
      );
      toast.error("An unexpected error occurred", {
        style: { background: "black", color: "white" }
      });
    } finally {
      setLoading(false);
    }
  };

  // Add this function to handle email sending
  const sendRegistrationEmails = async (
    firstName: string,
    lastName: string,
    userEmail: string,
    reseller: string,
    registrationDate: string
  ) => {
    try {
      // Get admin emails from database
      const adminEmails = await getAdminEmails();

      if (adminEmails.length === 0) {
        adminEmails.push("admin@tdsynnex.com");
      }

      // Merge DB + static emails
      const mergedAdminEmails = [
        ...new Set([
          ...adminEmails,
          ...UserRegisterEmail
        ])
      ];

      // Fallback if still empty
      if (mergedAdminEmails.length === 0) {
        mergedAdminEmails.push("admin@tdsynnex.com");
      }

      // Prepare user data
      const userEmailData = {
        firstName,
        lastName,
        email: userEmail,
        reseller,
        registrationDate
      };

      // 1️⃣ Send email to all admins
      const adminTemplate = emailTemplates.registrationAdminNotification(userEmailData);

      const adminEmailResult = await sendEmail({
        to: process.env.NODE_ENV === "development"
          ? ["farzam.altaf@works360.com", "farzamaltaf888@gmail.com"]
          : mergedAdminEmails,
        cc: UserRegCC,
        subject: adminTemplate.subject,
        text: adminTemplate.text,
        html: adminTemplate.html,
      });

      // 2️⃣ Send waiting email to user
      const userTemplate = emailTemplates.registrationUserWaiting(userEmailData);

      const userEmailResult = await sendEmail({
        to: userEmailData.email,
        cc: "",
        subject: userTemplate.subject,
        text: userTemplate.text,
        html: userTemplate.html,
      });

      if (userEmailResult.success) {

        // Log user email sent
        try {
          // Get user ID for logging
          const { data: user } = await supabase
            .from("users")
            .select("userId")
            .eq("email", userEmail)
            .single();
        } catch (logError) {
        }
      }
    } catch (error) {
    }
  };

  // Add this function at the top of your component
  const formatRegistrationDate = () => {
    const now = new Date();
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric' as const,
      month: 'long' as const,
      day: 'numeric' as const,
      hour: '2-digit' as const,
      minute: '2-digit' as const,
      hour12: true
    };
    return now.toLocaleDateString('en-US', options);
  };

  // Add this function to fetch admin emails
  const getAdminEmails = async () => {
    try {
      const adminRole = process.env.NEXT_PUBLIC_ADMINISTRATOR;

      const { data: admins, error } = await supabase
        .from("users")
        .select("email")
        .eq("role", adminRole)
        .not("email", "is", null); // Exclude null emails

      if (error) {
        return [];
      }

      // Extract emails and filter out any null/undefined
      const adminEmails = admins
        .map(admin => admin.email)
        .filter(email => email && email.trim() !== "");

      return adminEmails;

    } catch (error) {
      return [];
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
