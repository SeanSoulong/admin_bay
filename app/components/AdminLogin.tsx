"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import { adminSignIn, ADMIN_EMAILS } from "../lib/firebase";
import {
  ShieldCheck,
  Mail,
  Lock,
  AlertTriangle,
  ChevronRight,
  Eye,
  EyeOff,
} from "lucide-react";
import { motion } from "framer-motion";

export default function AdminLogin() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const router = useRouter();

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      if (!ADMIN_EMAILS.includes(email)) {
        throw new Error("Access denied. Only admin emails are allowed.");
      }

      await adminSignIn(email, password);
      router.push("/admin/dashboard");

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } catch (err: any) {
      console.error("Login error:", err);
      setError(
        err.code === "auth/invalid-credential"
          ? "Invalid email or password"
          : err.message || "Login failed. Please try again."
      );
    } finally {
      setLoading(false);
    }
  };

  const togglePasswordVisibility = () => {
    setShowPassword(!showPassword);
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4 sm:p-6 lg:p-8 font-[Kantumruy_Pro]">
      <div className="max-w-7xl mx-auto w-full">
        <div className="flex flex-col lg:flex-row items-center justify-center gap-12 lg:gap-20">
          {/* LEFT SIDE - BRAND & INFO */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="w-full hidden lg:block sm:max-w-lg flex-col items-start sm:items-center lg:items-start"
          >
            <div className="mb-8">
              {/* Logo/Brand */}
              <div className="inline-flex items-center gap-2 rounded-lg bg-[#0A817F] px-4 py-2 text-sm font-semibold text-white shadow-sm">
                <ShieldCheck className="h-4 w-4" />
                Admin Portal
              </div>

              <h1 className="mt-6 text-3xl sm:text-4xl font-bold text-[#0D1B2A]">
                Bay - Admin Dashboard
              </h1>

              <p className="mt-3 text-[#4B5563] text-sm sm:text-base max-w-lg">
                Manage products, reviews, and learning content...... <br />
                Complete control over all platform operations.
              </p>
            </div>

            {/* Features List */}
            <div className="space-y-6">
              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0A817F]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#0A817F]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[#0D1B2A] font-medium text-sm sm:text-base">
                    Product Management
                  </h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm mt-1">
                    Add, edit, or remove marketplace products
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0A817F]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#0A817F]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[#0D1B2A] font-medium text-sm sm:text-base">
                    Review Moderation
                  </h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm mt-1">
                    Monitor and manage user reviews and ratings
                  </p>
                </div>
              </div>

              <div className="flex items-start gap-4">
                <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-[#0A817F]/10 flex items-center justify-center">
                  <svg
                    className="w-5 h-5 text-[#0A817F]"
                    fill="none"
                    stroke="currentColor"
                    viewBox="0 0 24 24"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth="2"
                      d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253"
                    />
                  </svg>
                </div>
                <div>
                  <h3 className="text-[#0D1B2A] font-medium text-sm sm:text-base">
                    Learning Hub
                  </h3>
                  <p className="text-[#4B5563] text-xs sm:text-sm mt-1">
                    Create and manage educational content
                  </p>
                </div>
              </div>
            </div>

            {/* Security Info */}
            <div className="mt-8 p-4 rounded-lg border border-[#EBECF0] bg-white">
              <div className="flex items-center gap-2 text-sm text-[#0A817F]">
                <ShieldCheck className="w-4 h-4" />
                <span className="font-medium">Secure & Encrypted</span>
              </div>
              <p className="mt-2 text-xs text-[#4B5563]">
                All data is encrypted and access is strictly limited to
                authorized administrators only.
              </p>
            </div>
          </motion.div>

          {/* RIGHT SIDE - LOGIN FORM */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="w-full lg:w-1/2 max-w-md"
          >
            <div
              className="
              bg-white 
              rounded-lg border border-[#EBECF0] 
              shadow-sm 
              p-6 sm:p-8
            "
            >
              {/* Form Header */}
              <div className="text-center mb-8">
                <div
                  className="
                  mx-auto w-16 h-16 
                  bg-[#0A817F] 
                  rounded-full 
                  flex items-center justify-center 
                  mb-4
                "
                >
                  <ShieldCheck className="w-8 h-8 text-white" />
                </div>
                <h2
                  className="
                  text-[#0D1B2A] font-medium 
                  text-[18px] sm:text-[20px]
                "
                >
                  Admin Login
                </h2>
                <p
                  className="
                  text-[#4B5563] 
                  text-[13px] sm:text-sm 
                  mt-2
                "
                >
                  Enter your credentials to continue
                </p>
              </div>

              {/* Login Form */}
              <form className="space-y-6" onSubmit={handleSubmit}>
                {/* Email Field */}
                <div>
                  <label
                    className="
                    block text-[#0D1B2A] 
                    text-[13px] sm:text-[14px] font-medium 
                    mb-2
                  "
                  >
                    Email Address
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="w-5 h-5 text-[#6B7280]" />
                    </div>
                    <input
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      className="
                      text-[#0D1B2A]
                        w-full 
                        pl-10 pr-4 py-3 
                        border border-[#D1D5DB] 
                        rounded-lg 
                        text-[13px] sm:text-[14px]
                        placeholder-[#9CA3AF]
                        focus:outline-none focus:ring-2 focus:ring-[#0A817F]/20 focus:border-[#0A817F]
                        transition-all duration-200
                      "
                      placeholder="admin@example.com"
                      disabled={loading}
                    />
                  </div>
                </div>

                {/* Password Field */}
                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label
                      className="
                      block text-[#0D1B2A] 
                      text-[13px] sm:text-[14px] font-medium 
                    "
                    >
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="
                        text-[11px] sm:text-[12px] 
                        text-[#0A817F] 
                        hover:text-[#08706E]
                        flex items-center gap-1
                        transition-colors
                      "
                    >
                      {showPassword ? (
                        <>
                          <EyeOff className="w-3 h-3" />
                          Hide
                        </>
                      ) : (
                        <>
                          <Eye className="w-3 h-3" />
                          Show
                        </>
                      )}
                    </button>
                  </div>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="w-5 h-5 text-[#6B7280]" />
                    </div>
                    <input
                      type={showPassword ? "text" : "password"}
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      className="
                      text-[#0D1B2A]
                        w-full 
                        pl-10 pr-11 py-3 
                        border border-[#D1D5DB] 
                        rounded-lg 
                        text-[13px] sm:text-[14px]
                        placeholder-[#9CA3AF]
                        focus:outline-none focus:ring-2 focus:ring-[#0A817F]/20 focus:border-[#0A817F]
                        transition-all duration-200
                      "
                      placeholder="••••••••"
                      disabled={loading}
                    />
                    <button
                      type="button"
                      onClick={togglePasswordVisibility}
                      className="
                        absolute inset-y-0 right-0 
                        pr-3 flex items-center 
                        text-[#6B7280] hover:text-[#0A817F]
                        transition-colors
                      "
                    >
                      {showPassword ? (
                        <EyeOff className="w-5 h-5" />
                      ) : (
                        <Eye className="w-5 h-5" />
                      )}
                    </button>
                  </div>
                </div>

                {/* Error Message */}
                {error && (
                  <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="
                      rounded-lg 
                      border border-red-200 
                      bg-red-50 
                      p-4
                    "
                  >
                    <div className="flex items-start gap-3">
                      <AlertTriangle className="w-5 h-5 text-red-400 mt-0.5 flex-shrink-0" />
                      <div>
                        <p className="text-[13px] sm:text-[14px] font-medium text-red-800">
                          {error}
                        </p>
                        <p className="mt-1 text-xs text-red-600">
                          Please check your credentials and try again
                        </p>
                      </div>
                    </div>
                  </motion.div>
                )}

                {/* Submit Button */}
                <button
                  type="submit"
                  disabled={loading}
                  className="
                    w-full 
                    flex items-center justify-center gap-2
                    py-3.5 px-4 
                    bg-[#0A817F] 
                    text-white font-medium 
                    rounded-lg 
                    hover:bg-[#08706E] 
                    disabled:opacity-70 disabled:cursor-not-allowed
                    transition-all duration-200 
                    text-[13px] sm:text-[14px]
                    shadow-sm
                  "
                >
                  {loading ? (
                    <>
                      <svg
                        className="animate-spin h-5 w-5 text-white"
                        xmlns="http://www.w3.org/2000/svg"
                        fill="none"
                        viewBox="0 0 24 24"
                      >
                        <circle
                          className="opacity-25"
                          cx="12"
                          cy="12"
                          r="10"
                          stroke="currentColor"
                          strokeWidth="4"
                        ></circle>
                        <path
                          className="opacity-75"
                          fill="currentColor"
                          d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                        ></path>
                      </svg>
                      Signing in...
                    </>
                  ) : (
                    <>
                      Sign In
                      <ChevronRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>

              {/* Security Notice */}
              {/* <div
                className="
                mt-8 pt-6 
                border-t border-[#EBECF0] 
                text-center
              "
              >
                <p
                  className="
                  text-xs 
                  text-[#4B5563]
                "
                >
                  <ShieldCheck className="inline-block w-3 h-3 mr-1 mb-0.5" />
                  This is a secure admin portal. Access is restricted to
                  authorized personnel only.
                </p>
              </div> */}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
}
