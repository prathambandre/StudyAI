"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Mail, Lock, User, ArrowRight, CheckCircle2 } from "lucide-react";
import Input from "@/components/ui/Input";
import Button from "@/components/ui/Button";
import { useAuth } from "@/context/AuthContext";

const container: Variants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const item: Variants = {
  hidden: { opacity: 0, y: 12 },
  show: { opacity: 1, y: 0, transition: { duration: 0.4, ease: "easeOut" } },
};

export default function SignupPage() {
  const { signUp } = useAuth();

  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [errors, setErrors] = useState<{
    fullName?: string;
    email?: string;
    password?: string;
    confirmPassword?: string;
    general?: string;
  }>({});
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!fullName.trim()) next.fullName = "Full name is required";
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    else if (password.length < 8) next.password = "Password must be at least 8 characters";
    if (!confirmPassword) next.confirmPassword = "Please confirm your password";
    else if (password !== confirmPassword) next.confirmPassword = "Passwords do not match";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { error } = await signUp(email, password, fullName.trim());

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
      return;
    }

    setSuccess(true);
  }

  if (success) {
    return (
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.5 }}
        className="text-center"
      >
        <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-green-100 dark:bg-green-900/30">
          <CheckCircle2 className="h-8 w-8 text-green-600 dark:text-green-400" />
        </div>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Check your email
        </h2>
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400 leading-relaxed">
          We&apos;ve sent a confirmation link to{" "}
          <span className="font-medium text-gray-700 dark:text-gray-300">{email}</span>.
          Please verify your email to get started.
        </p>
        <Link
          href="/login"
          className="mt-6 inline-block text-sm font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Back to sign in
        </Link>
      </motion.div>
    );
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Create your account
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Start learning smarter with StudyAI
        </p>
      </motion.div>

      {errors.general && (
        <motion.div
          variants={item}
          className="mt-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600 dark:border-red-800 dark:bg-red-950/50 dark:text-red-400"
        >
          {errors.general}
        </motion.div>
      )}

      <form onSubmit={handleSubmit} className="mt-8 space-y-5">
        <motion.div variants={item}>
          <Input
            label="Full Name"
            type="text"
            placeholder="John Doe"
            icon={<User className="h-4 w-4" />}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            error={errors.fullName}
            autoComplete="name"
          />
        </motion.div>

        <motion.div variants={item}>
          <Input
            label="Email"
            type="email"
            placeholder="you@example.com"
            icon={<Mail className="h-4 w-4" />}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            error={errors.email}
            autoComplete="email"
          />
        </motion.div>

        <motion.div variants={item}>
          <Input
            label="Password"
            type="password"
            placeholder="Min. 8 characters"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="new-password"
          />
        </motion.div>

        <motion.div variants={item}>
          <Input
            label="Confirm Password"
            type="password"
            placeholder="Re-enter password"
            icon={<Lock className="h-4 w-4" />}
            value={confirmPassword}
            onChange={(e) => setConfirmPassword(e.target.value)}
            error={errors.confirmPassword}
            autoComplete="new-password"
          />
        </motion.div>

        <motion.div variants={item}>
          <Button
            type="submit"
            size="lg"
            isLoading={loading}
            icon={<ArrowRight className="h-4 w-4" />}
            className="w-full"
          >
            Create Account
          </Button>
        </motion.div>
      </form>

      <motion.p variants={item} className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Already have an account?{" "}
        <Link
          href="/login"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Sign in
        </Link>
      </motion.p>
    </motion.div>
  );
}
