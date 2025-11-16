"use client";
import { getCompetitorAnswer } from "@/lib/AIUtils";
import { useState } from "react";
import ReactMarkdown from "react-markdown";
import { useEffect, useMemo } from "react";
import { Send, Sparkles, Loader2, X } from "lucide-react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function Chatbot() {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [rawMode, setRawMode] = useState(false);
  const [remarkPlugins, setRemarkPlugins] = useState<any[]>([]);
  const [rehypePlugins, setRehypePlugins] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isOpen, setIsOpen] = useState(true);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const [{ default: remarkGfm }, { default: rehypeSanitize }] =
          await Promise.all([import("remark-gfm"), import("rehype-sanitize")]);
        if (!mounted) return;
        setRemarkPlugins([remarkGfm]);
        setRehypePlugins([rehypeSanitize]);
      } catch (e) {
        console.warn("Optional markdown plugins not available:", e);
      }
    })();

    return () => {
      mounted = false;
    };
  }, []);

  const ask = async () => {
    if (!input.trim()) return;

    const userMessage: Message = { role: "user", content: input };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setError(null);
    setLoading(true);

    try {
      const res = await getCompetitorAnswer(input);
      const assistantMessage: Message = {
        role: "assistant",
        content: res || "No answer returned",
      };
      setMessages((prev) => [...prev, assistantMessage]);
    } catch (err: any) {
      setError(err.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  const processAnswer = (answer: string) => {
    if (!answer) return "";
    let out = String(answer).trim();

    if (
      (out.startsWith('"') && out.endsWith('"')) ||
      (out.startsWith("'") && out.endsWith("'"))
    ) {
      try {
        out = JSON.parse(out);
      } catch (e) {
        // ignore
      }
    }

    if (out.includes("\\n")) {
      out = out.replace(/\\n/g, "\n");
    }
    if (out.includes("\\t")) {
      out = out.replace(/\\t/g, "\t");
    }

    const fenceMatch = out.match(/^```(?:[a-zA-Z0-9_-]+)?\n([\s\S]*)\n```$/);
    if (fenceMatch) {
      out = fenceMatch[1];
    }

    out = out.replace(/^\s+|\s+$/g, "");
    return out;
  };

  return (
    <>
      {!isOpen && (
        <div className="fixed bottom-4 right-4 z-50">
          <button
            onClick={() => setIsOpen(true)}
            className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white rounded-full shadow-lg hover:shadow-xl transition-all"
          >
            <Sparkles className="w-4 h-4" />
            <span>Open Chat</span>
          </button>
        </div>
      )}

      {isOpen && (
        <div className="fixed bottom-4 right-4 z-50 w-96 h-[600px] flex flex-col bg-gradient-to-br from-purple-50 via-white to-blue-50 dark:from-zinc-950 dark:via-zinc-900 dark:to-zinc-950 rounded-2xl shadow-2xl border border-purple-200/50 dark:border-zinc-700/50">
          {/* Header */}
          <div className="flex items-center justify-between gap-3 px-6 py-4 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-b border-purple-100 dark:border-zinc-800">
            <div className="flex items-center gap-3">
              <div className="relative">
                <div className="w-10 h-10 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center">
                  <Sparkles className="w-5 h-5 text-white" />
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white dark:border-zinc-900" />
              </div>
              <div>
                <h1 className="font-semibold text-zinc-900 dark:text-white">
                  Competitor Insights AI
                </h1>
                <p className="text-sm text-zinc-500 dark:text-zinc-400">
                  Ask me anything about your competitors
                </p>
              </div>
            </div>
            <button
              onClick={() => setIsOpen(false)}
              className="p-2 hover:bg-zinc-100 dark:hover:bg-zinc-800 rounded-lg transition-colors text-zinc-600 dark:text-zinc-400 hover:text-zinc-900 dark:hover:text-white"
              title="Close chatbot"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Messages Area */}
          <div className="flex-1 overflow-y-auto px-4 py-6 space-y-6">
            {messages.length === 0 && (
              <div className="flex flex-col items-center justify-center h-full text-center px-4">
                <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center mb-4 shadow-lg shadow-purple-500/20">
                  <Sparkles className="w-8 h-8 text-white" />
                </div>
                <h2 className="text-2xl font-bold text-zinc-900 dark:text-white mb-2">
                  Welcome to Competitor Insights
                </h2>
                <p className="text-zinc-600 dark:text-zinc-400 max-w-md">
                  Get instant answers about your competitors' strategies,
                  features, and market positioning. Just ask your question
                  below.
                </p>
              </div>
            )}

            {messages.map((message, index) => (
              <div
                key={index}
                className={`flex gap-3 animate-fade-in ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                {message.role === "assistant" && (
                  <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                    <Sparkles className="w-4 h-4 text-white" />
                  </div>
                )}
                <div
                  className={`max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 shadow-sm ${
                    message.role === "user"
                      ? "bg-gradient-to-br from-purple-600 to-blue-600 text-white"
                      : "bg-white dark:bg-zinc-800 text-zinc-900 dark:text-white border border-purple-100 dark:border-zinc-700"
                  }`}
                >
                  {message.role === "assistant" ? (
                    <div className="prose prose-sm dark:prose-invert max-w-none prose-p:leading-relaxed prose-pre:bg-zinc-100 dark:prose-pre:bg-zinc-900 prose-pre:text-zinc-900 dark:prose-pre:text-zinc-100">
                      <ReactMarkdown
                        remarkPlugins={remarkPlugins}
                        rehypePlugins={rehypePlugins}
                      >
                        {processAnswer(message.content)}
                      </ReactMarkdown>
                    </div>
                  ) : (
                    <p className="text-sm leading-relaxed">{message.content}</p>
                  )}
                </div>
                {message.role === "user" && (
                  <div className="w-8 h-8 rounded-full bg-zinc-200 dark:bg-zinc-700 flex items-center justify-center flex-shrink-0 text-xs font-semibold text-zinc-600 dark:text-zinc-300">
                    You
                  </div>
                )}
              </div>
            ))}

            {loading && (
              <div className="flex gap-3 animate-fade-in">
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-purple-500 to-blue-500 flex items-center justify-center flex-shrink-0 shadow-md">
                  <Sparkles className="w-4 h-4 text-white" />
                </div>
                <div className="max-w-[75%] md:max-w-[60%] rounded-2xl px-4 py-3 bg-white dark:bg-zinc-800 border border-purple-100 dark:border-zinc-700 shadow-sm">
                  <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span className="text-sm">Thinking...</span>
                  </div>
                </div>
              </div>
            )}

            {error && (
              <div className="flex justify-center">
                <div className="max-w-md px-4 py-3 rounded-xl bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 text-red-600 dark:text-red-400 text-sm">
                  {error}
                </div>
              </div>
            )}
          </div>

          {/* Input Area */}
          <div className="px-4 pb-4 pt-2 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-xl border-t border-purple-100 dark:border-zinc-800">
            <div className="max-w-4xl mx-auto">
              <div className="flex items-center gap-2 mb-2">
                <button
                  className="text-xs px-3 py-1.5 rounded-full border border-purple-200 dark:border-zinc-700 hover:bg-purple-50 dark:hover:bg-zinc-800 transition-colors text-zinc-700 dark:text-zinc-300"
                  onClick={() => setRawMode((s) => !s)}
                >
                  {rawMode ? "Preview Mode" : "Raw Mode"}
                </button>
              </div>
              <div className="flex items-end gap-2 bg-white dark:bg-zinc-800 rounded-2xl border border-purple-200 dark:border-zinc-700 shadow-lg p-2 focus-within:ring-2 focus-within:ring-purple-500/20 transition-all">
                <textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      ask();
                    }
                  }}
                  className="flex-1 bg-transparent px-3 py-2 text-zinc-900 dark:text-white placeholder:text-zinc-400 dark:placeholder:text-zinc-500 focus:outline-none resize-none max-h-32 leading-relaxed"
                  placeholder="Ask about competitor strategies, features, pricing..."
                  rows={1}
                />
                <button
                  onClick={ask}
                  disabled={loading || !input.trim()}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center text-white transition-all shadow-md hover:shadow-lg disabled:hover:shadow-md flex-shrink-0"
                >
                  <Send className="w-4 h-4" />
                </button>
              </div>
              <p className="text-xs text-zinc-500 dark:text-zinc-400 mt-2 text-center">
                Press Enter to send • Shift+Enter for new line
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
