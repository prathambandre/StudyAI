"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import {
  ArrowRight,
  BookOpen,
  Brain,
  FileText,
  Lightbulb,
  MessageSquare,
  Sparkles,
  Zap,
} from "lucide-react";

const containerVariants = {
  hidden: {},
  show: {
    transition: {
      staggerChildren: 0.12,
      delayChildren: 0.2,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 24 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const featureVariants = {
  hidden: { opacity: 0, y: 32, scale: 0.96 },
  show: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.7,
      ease: [0.16, 1, 0.3, 1] as const,
    },
  },
};

const features = [
  {
    icon: MessageSquare,
    title: "AI Chat",
    description:
      "Ask questions about your PDFs and get instant, context-aware answers with source citations.",
    accent: "text-apple-blue",
    glow: "bg-apple-blue/20",
  },
  {
    icon: Brain,
    title: "Smart Quizzes",
    description:
      "Test your knowledge automatically with quizzes generated from your study material.",
    accent: "text-apple-purple",
    glow: "bg-apple-purple/20",
  },
  {
    icon: BookOpen,
    title: "Flashcards",
    description:
      "Memorize key concepts faster with adaptive flashcards built from your documents.",
    accent: "text-apple-green",
    glow: "bg-apple-green/20",
  },
];

const floatingIcons = [
  { icon: BookOpen, className: "left-[10%] top-[22%]", delay: 0 },
  { icon: Lightbulb, className: "right-[12%] top-[28%]", delay: 1.2 },
  { icon: Brain, className: "left-[20%] bottom-[16%]", delay: 2.4 },
  { icon: Zap, className: "right-[22%] bottom-[22%]", delay: 0.6 },
];

export default function Home() {
  const scrollToFeatures = () => {
    document.getElementById("features")?.scrollIntoView({ behavior: "smooth" });
  };

  return (
    <div className="relative flex min-h-screen flex-col overflow-hidden bg-gray-50 dark:bg-gray-950">
      {/* Animated gradient background */}
      <div className="pointer-events-none absolute inset-0 -z-10">
        <div className="absolute -top-40 -left-40 h-[36rem] w-[36rem] rounded-full bg-apple-blue/20 blur-[120px] dark:bg-apple-blue/15" />
        <div className="absolute -top-20 -right-40 h-[32rem] w-[32rem] rounded-full bg-apple-purple/20 blur-[120px] dark:bg-apple-purple/15" />
        <div className="absolute bottom-[-12rem] left-1/3 h-[30rem] w-[30rem] rounded-full bg-apple-green/15 blur-[120px] dark:bg-apple-green/10" />
        <div className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05] [background-image:radial-gradient(circle_at_1px_1px,currentColor_1px,transparent_0)] [background-size:32px_32px]" />
      </div>

      {/* Floating icons */}
      {floatingIcons.map(({ icon: Icon, className, delay }) => (
        <motion.div
          key={className}
          className={`pointer-events-none absolute hidden h-14 w-14 items-center justify-center rounded-2xl glass text-gray-700 dark:text-gray-200 md:flex ${className}`}
          animate={{ y: [0, -14, 0] }}
          transition={{
            duration: 5,
            repeat: Infinity,
            repeatType: "mirror",
            ease: "easeInOut",
            delay,
          }}
        >
          <Icon className="h-6 w-6" />
        </motion.div>
      ))}

      <motion.main
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-1 flex-col items-center"
      >
        {/* Hero */}
        <section className="relative flex w-full flex-col items-center px-6 pt-32 pb-24 text-center md:pt-44 md:pb-32">
          <motion.div variants={itemVariants}>
            <span className="glass inline-flex items-center gap-2 rounded-full px-4 py-1.5 text-sm font-medium text-gray-700 dark:text-gray-200">
              <Sparkles className="h-4 w-4 text-apple-blue" />
              AI-powered Study Companion
            </span>
          </motion.div>

          <motion.h1
            variants={itemVariants}
            className="mt-8 max-w-4xl text-5xl font-extrabold tracking-tight text-gray-900 dark:text-white sm:text-6xl md:text-7xl"
          >
            Learn Smarter with{" "}
            <span className="bg-gradient-to-r from-apple-blue via-apple-purple to-apple-orange bg-clip-text text-transparent">
              AI
            </span>
          </motion.h1>

          <motion.p
            variants={itemVariants}
            className="mt-6 max-w-2xl text-lg leading-relaxed text-gray-600 dark:text-gray-400 md:text-xl"
          >
            Upload your PDFs and let AI transform them into your ultimate study
            hub — chat with your documents, generate smart quizzes, and memorize
            key concepts with adaptive flashcards.
          </motion.p>

          <motion.div
            variants={itemVariants}
            className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
          >
            <Link
              href="/signup"
              className="group inline-flex h-13 items-center gap-2 rounded-full bg-gray-900 px-8 py-3.5 text-base font-semibold text-white shadow-lg shadow-gray-900/20 transition-all hover:scale-[1.03] hover:bg-gray-800 hover:shadow-xl dark:bg-white dark:text-gray-900 dark:shadow-white/10 dark:hover:bg-gray-100"
            >
              Get Started
              <ArrowRight className="h-5 w-5 transition-transform group-hover:translate-x-1" />
            </Link>
            <button
              onClick={scrollToFeatures}
              className="inline-flex h-13 items-center gap-2 rounded-full border border-gray-200 bg-white/60 px-8 py-3.5 text-base font-semibold text-gray-800 backdrop-blur-xl transition-all hover:scale-[1.03] hover:border-gray-300 hover:bg-white dark:border-gray-700/60 dark:bg-white/5 dark:text-gray-100 dark:hover:bg-white/10"
            >
              Learn More
            </button>
          </motion.div>

          {/* Trust hint */}
          <motion.p
            variants={itemVariants}
            className="mt-10 flex items-center gap-2 text-sm text-gray-500 dark:text-gray-500"
          >
            <FileText className="h-4 w-4" />
            No credit card required · Works with any PDF
          </motion.p>
        </section>

        {/* Features */}
        <section
          id="features"
          className="relative z-10 w-full max-w-6xl px-6 pb-28"
        >
          <motion.div
            variants={itemVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="text-center"
          >
            <h2 className="text-4xl font-bold tracking-tight text-gray-900 dark:text-white md:text-5xl">
              Everything you need to{" "}
              <span className="bg-gradient-to-r from-apple-purple to-apple-blue bg-clip-text text-transparent">
                ace your exams
              </span>
            </h2>
            <p className="mx-auto mt-4 max-w-xl text-lg text-gray-600 dark:text-gray-400">
              A complete AI study toolkit that turns documents into knowledge.
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="show"
            viewport={{ once: true, margin: "-80px" }}
            className="mt-16 grid gap-6 md:grid-cols-3"
          >
            {features.map(({ icon: Icon, title, description, accent, glow }) => (
              <motion.div
                key={title}
                variants={featureVariants}
                className="group relative overflow-hidden rounded-3xl p-8 glass transition-all duration-300 hover:-translate-y-1.5 hover:shadow-2xl hover:shadow-gray-900/10 dark:hover:shadow-black/40"
              >
                <div
                  className={`absolute -top-16 -right-16 h-40 w-40 rounded-full transition-transform duration-500 group-hover:scale-150 ${glow}`}
                />
                <div className="relative">
                  <div
                    className={`inline-flex h-12 w-12 items-center justify-center rounded-2xl ${glow} ${accent}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <h3 className="mt-6 text-xl font-semibold text-gray-900 dark:text-white">
                    {title}
                  </h3>
                  <p className="mt-3 leading-relaxed text-gray-600 dark:text-gray-400">
                    {description}
                  </p>
                </div>
              </motion.div>
            ))}
          </motion.div>
        </section>
      </motion.main>

      {/* Footer */}
      <footer className="border-t border-gray-200/60 py-10 dark:border-gray-800/60">
        <div className="flex flex-col items-center justify-between gap-4 px-6 md:flex-row">
          <p className="flex items-center gap-2 text-sm font-medium text-gray-700 dark:text-gray-300">
            <Brain className="h-4 w-4 text-apple-purple" />
            StudyAI
          </p>
          <p className="text-sm text-gray-500 dark:text-gray-500">
            Learn smarter with AI. © {new Date().getFullYear()} StudyAI.
          </p>
        </div>
      </footer>
    </div>
  );
}