"use client";

import { useState, type FormEvent } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, type Variants } from "framer-motion";
import { Mail, Lock, ArrowRight } from "lucide-react";
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

export default function LoginPage() {
  const router = useRouter();
  const { signIn } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errors, setErrors] = useState<{ email?: string; password?: string; general?: string }>({});
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const next: typeof errors = {};
    if (!email) next.email = "Email is required";
    else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) next.email = "Enter a valid email";
    if (!password) next.password = "Password is required";
    else if (password.length < 6) next.password = "Password must be at least 6 characters";
    setErrors(next);
    return Object.keys(next).length === 0;
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!validate()) return;

    setLoading(true);
    setErrors({});

    const { error } = await signIn(email, password);

    if (error) {
      setErrors({ general: error.message });
      setLoading(false);
      return;
    }

    router.push("/dashboard");
  }

  return (
    <motion.div variants={container} initial="hidden" animate="show">
      <motion.div variants={item}>
        <h2 className="text-2xl font-bold text-gray-900 dark:text-white">
          Welcome back
        </h2>
        <p className="mt-1.5 text-sm text-gray-500 dark:text-gray-400">
          Sign in to continue to StudyAI
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
            placeholder="Enter your password"
            icon={<Lock className="h-4 w-4" />}
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            error={errors.password}
            autoComplete="current-password"
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
            Sign In
          </Button>
        </motion.div>
      </form>

      <motion.p variants={item} className="mt-8 text-center text-sm text-gray-500 dark:text-gray-400">
        Don&apos;t have an account?{" "}
        <Link
          href="/signup"
          className="font-medium text-blue-600 hover:text-blue-500 dark:text-blue-400 dark:hover:text-blue-300 transition-colors"
        >
          Create one
        </Link>
      </motion.p>
    </motion.div>
  );
}
