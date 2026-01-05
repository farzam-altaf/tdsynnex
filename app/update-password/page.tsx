"use client";

import { supabase } from "@/lib/supabase/client";
import { useState } from "react";
import { toast } from "sonner";

export default function Page() {
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [loading, setLoading] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitted(true);

    if (!password || password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    if (password !== confirm) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    const { error } = await supabase.auth.updateUser({
      password,
    });

    if (error) {
      toast.error(error.message, {
        style: { background: "black", color: "white" },
      });
    } else {
      toast.success("Password updated successfully", {
        style: { background: "black", color: "white" },
      });

      setTimeout(() => {
        window.location.href = "/login";
      }, 1500);
    }

    setLoading(false);
  };

  return (
    <div className="relative min-h-screen">
      {/* Background */}
      <div
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{
          backgroundImage: "url('/computer-mouse-object-background.jpg')",
        }}
      />
      <div className="absolute inset-0 bg-white/92"></div>

      {/* Content */}
      <div className="relative flex items-center justify-center min-h-screen px-3 lg:px-8">
        <div className="w-full max-w-md rounded-2xl border-8 border-gray-100 bg-white px-6 py-14 sm:px-10">
          <div className="text-center mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold text-gray-800">
              Set New Password
            </h1>
            <p className="text-gray-600 mt-2">
              Please enter your new password below
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-6">
            <div>
              <label className="block font-semibold text-gray-700 text-sm mb-2">
                New Password
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  setError("");
                }}
                className={`w-full rounded-md border px-4 py-3 text-black focus:ring-2 ${
                  submitted && error ? "border-red-500" : "border-gray-300"
                }`}
              />
            </div>

            <div>
              <label className="block font-semibold text-gray-700 text-sm mb-2">
                Confirm Password
              </label>
              <input
                type="password"
                value={confirm}
                onChange={(e) => {
                  setConfirm(e.target.value);
                  setError("");
                }}
                className={`w-full rounded-md border px-4 py-3 text-black focus:ring-2 ${
                  submitted && error ? "border-red-500" : "border-gray-300"
                }`}
              />
              {submitted && error && (
                <div className="bg-[#c74a4a] text-white px-3 py-2 text-sm rounded mt-2">
                  {error}
                </div>
              )}
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full rounded-md bg-[#3ba1da] px-6 py-3 cursor-pointer font-semibold text-white hover:bg-[#41abd6] disabled:opacity-50"
            >
              {loading ? "Updating..." : "Update Password"}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
