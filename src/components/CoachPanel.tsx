"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import MarkdownIt from "markdown-it";
import type { Message } from "@/types";

const md = new MarkdownIt({ html: false, linkify: true });

interface Props {
  messages: Message[];
  currentStreamingContent: string;
  followUpQuestion: string;
  onFollowUpChange: (value: string) => void;
  onFollowUpSubmit: () => void;
  isLoading: boolean;
  hasSubmitted: boolean;
  suggestedQuestions: string[];
  onSuggestedQuestionClick: (question: string) => void;
  conversationId?: number | null;
}

function renderMarkdown(text: string) {
  return md.render(text);
}

export default function CoachPanel({
  messages,
  currentStreamingContent,
  followUpQuestion,
  onFollowUpChange,
  onFollowUpSubmit,
  isLoading,
  hasSubmitted,
  suggestedQuestions,
  onSuggestedQuestionClick,
  conversationId,
}: Props) {
  const responseRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const [feedbackGiven, setFeedbackGiven] = useState<Record<number, "helpful" | "unhelpful" | null>>({});
  const [copiedMsgIdx, setCopiedMsgIdx] = useState<number | null>(null);

  useEffect(() => {
    if (responseRef.current) {
      responseRef.current.scrollTop = responseRef.current.scrollHeight;
    }
  }, [messages, currentStreamingContent]);

  useEffect(() => {
    if (hasSubmitted && inputRef.current) {
      inputRef.current.focus();
    }
  }, [hasSubmitted]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      onFollowUpSubmit();
    }
  };

  const handleCopy = useCallback(async (content: string, idx: number) => {
    try {
      await navigator.clipboard.writeText(content);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    } catch {
      const ta = document.createElement("textarea");
      ta.value = content;
      document.body.appendChild(ta);
      ta.select();
      document.execCommand("copy");
      document.body.removeChild(ta);
      setCopiedMsgIdx(idx);
      setTimeout(() => setCopiedMsgIdx(null), 2000);
    }
  }, []);

  const handleFeedback = (ts: number, type: "helpful" | "unhelpful") => {
    const newState = feedbackGiven[ts] === type ? null : type;
    setFeedbackGiven((prev) => ({ ...prev, [ts]: newState }));
    if (newState) {
      fetch("/api/feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ conversationId: conversationId ?? null, messageIdx: ts, rating: type }),
      }).catch(() => {});
    }
  };

  return (
    <div className="h-full bg-white rounded-2xl border border-gray-100 shadow-sm overflow-hidden flex flex-col">
      {/* 标题栏 */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100 bg-gray-50/50 shrink-0">
        <div className="flex items-center gap-2">
          <div className="w-7 h-7 bg-brand-gradient rounded-lg flex items-center justify-center shadow-sm">
            <svg className="w-3.5 h-3.5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
          </div>
          <h2 className="text-sm font-semibold text-gray-800">教练指导区</h2>
        </div>
        {hasSubmitted && (
          <span className="text-[11px] text-gray-400 bg-white px-2 py-0.5 rounded-full border border-gray-200">
            {messages.filter(m => m.role === "coach").length} 条回复
          </span>
        )}
      </div>

      {/* 对话内容区 */}
      <div ref={responseRef} className="flex-1 overflow-y-auto">
        {!hasSubmitted ? (
          <div className="h-full flex items-center justify-center p-8">
            <div className="text-center">
              <div className="w-16 h-16 bg-gray-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <svg className="w-8 h-8 text-gray-300" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
                    d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                </svg>
              </div>
              <p className="text-sm font-medium text-gray-400">请填写客户信息并提交</p>
              <p className="text-xs text-gray-300 mt-1.5">教练将在此生成诊断和推演方案</p>
            </div>
          </div>
        ) : (
          <div className="px-4 py-4 space-y-4">
            {messages.map((message, idx) => (
              <div key={message.timestamp} className="animate-fade-in">
                {/* 用户消息 - 右对齐气泡 */}
                {message.role === "user" ? (
                  <div className="flex justify-end">
                    <div className="max-w-[85%] bg-brand-50 text-gray-800 rounded-2xl rounded-br-md px-4 py-2.5">
                      <div className="flex items-center gap-1.5 mb-1">
                        <span className="text-[11px] font-semibold text-brand-600">代理人</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm whitespace-pre-wrap">{message.content}</div>
                    </div>
                  </div>
                ) : (
                  /* AI 消息 - 左对齐气泡 */
                  <div>
                    <div className="max-w-[95%] bg-white border border-gray-100 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                      <div className="flex items-center gap-1.5 mb-2">
                        <span className="text-[11px] font-semibold text-green-600">AI 教练</span>
                        <span className="text-[10px] text-gray-300">{new Date(message.timestamp).toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}</span>
                      </div>
                      <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(message.content) }} />

                      {/* 操作按钮 */}
                      <div className="flex items-center gap-3 mt-3 pt-2.5 border-t border-gray-50">
                        <button
                          onClick={() => handleCopy(message.content, idx)}
                          className="text-[11px] text-gray-400 hover:text-gray-600 transition-colors"
                        >
                          {copiedMsgIdx === idx ? "已复制 ✓" : "复制文本"}
                        </button>
                        <button
                          onClick={() => handleFeedback(message.timestamp, "helpful")}
                          className={`text-[11px] transition-colors ${feedbackGiven[message.timestamp] === "helpful" ? "text-green-600 font-medium" : "text-gray-400 hover:text-green-600"}`}
                        >
                          {feedbackGiven[message.timestamp] === "helpful" ? "有帮助 ✓" : "有帮助"}
                        </button>
                        <button
                          onClick={() => handleFeedback(message.timestamp, "unhelpful")}
                          className={`text-[11px] transition-colors ${feedbackGiven[message.timestamp] === "unhelpful" ? "text-red-500 font-medium" : "text-gray-400 hover:text-red-500"}`}
                        >
                          {feedbackGiven[message.timestamp] === "unhelpful" ? "没帮助 ✗" : "没帮助"}
                        </button>
                      </div>
                    </div>

                    {/* 引导式追问按钮 */}
                    {idx === messages.length - 1 && suggestedQuestions.length > 0 && !currentStreamingContent && (
                      <div className="mt-3 space-y-1.5">
                        <p className="text-[11px] font-medium text-gray-400 flex items-center gap-1">
                          <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 7l5 5m0 0l-5 5m5-5H6" />
                          </svg>
                          建议追问
                        </p>
                        {suggestedQuestions.map((q, qi) => (
                          <button
                            key={qi}
                            onClick={() => onSuggestedQuestionClick(q)}
                            disabled={isLoading}
                            className="block w-full text-left text-xs text-brand-600 hover:text-brand-700 bg-brand-50/60 hover:bg-brand-100 rounded-xl px-3.5 py-2 transition-colors disabled:opacity-50 border border-brand-100/50"
                          >
                            {q}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}

            {/* 流式输出中 */}
            {currentStreamingContent && (
              <div className="animate-fade-in">
                <div className="max-w-[95%] bg-white border border-brand-100 rounded-2xl rounded-bl-md shadow-sm px-4 py-3">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-[11px] font-semibold text-green-600">AI 教练</span>
                    <span className="flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" style={{ animationDelay: "0.2s" }} />
                      <span className="w-1.5 h-1.5 rounded-full bg-green-400 animate-pulse-dot" style={{ animationDelay: "0.4s" }} />
                    </span>
                  </div>
                  <div className="prose prose-sm max-w-none text-sm" dangerouslySetInnerHTML={{ __html: renderMarkdown(currentStreamingContent) }} />
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 输入区 */}
      {hasSubmitted && (
        <div className="border-t border-gray-100 p-3 bg-gray-50/50 shrink-0">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              className="flex-1 px-4 py-2.5 border border-gray-200 rounded-xl focus:ring-2 focus:ring-brand-500/30 focus:border-brand-500 bg-white resize-none text-sm"
              placeholder="输入追问内容，Enter 发送..."
              rows={2}
              value={followUpQuestion}
              onChange={(e) => onFollowUpChange(e.target.value)}
              onKeyDown={handleKeyDown}
              disabled={isLoading}
            />
            <button
              onClick={onFollowUpSubmit}
              disabled={!followUpQuestion.trim() || isLoading}
              className="px-5 py-2.5 bg-brand-gradient text-white rounded-xl transition-all hover:shadow-md active:scale-[0.98] disabled:opacity-40 text-sm font-medium shrink-0"
            >
              发送
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
