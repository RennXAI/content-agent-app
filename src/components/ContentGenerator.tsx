'use client';

import { useState } from 'react';
import { Sparkles, Copy, Check, Loader2, AlertCircle } from 'lucide-react';

const CONTENT_TYPES = [
  { value: 'blog post', label: 'Blog Post' },
  { value: 'social media post', label: 'Social Media Post' },
  { value: 'email newsletter', label: 'Email Newsletter' },
  { value: 'product description', label: 'Product Description' },
  { value: 'ad copy', label: 'Ad Copy' },
];

const TONES = [
  { value: 'professional', label: 'Professional' },
  { value: 'casual and friendly', label: 'Casual' },
  { value: 'persuasive', label: 'Persuasive' },
  { value: 'informational', label: 'Informational' },
  { value: 'witty and humorous', label: 'Witty' },
];

export default function ContentGenerator() {
  const [contentType, setContentType] = useState('blog post');
  const [tone, setTone] = useState('professional');
  const [topic, setTopic] = useState('');
  const [generatedContent, setGeneratedContent] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [copied, setCopied] = useState(false);
  const [error, setError] = useState('');

  async function handleGenerate() {
    if (!topic.trim()) {
      setError('Please enter a topic or description');
      return;
    }
    setError('');
    setGeneratedContent('');
    setIsGenerating(true);

    try {
      const response = await fetch('/api/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ contentType, tone, topic }),
      });

      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || 'Failed to generate content');
      }

      const reader = response.body!.getReader();
      const decoder = new TextDecoder();

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        setGeneratedContent((prev) => prev + decoder.decode(value, { stream: true }));
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setIsGenerating(false);
    }
  }

  async function handleCopy() {
    await navigator.clipboard.writeText(generatedContent);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      <header className="border-b border-gray-100 bg-white/80 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-sm">
            <Sparkles className="w-4 h-4 text-white" />
          </div>
          <h1 className="text-xl font-semibold text-gray-900">Content Agent</h1>
          <span className="text-sm text-gray-400 ml-auto">Powered by Claude</span>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12">
        <div className="text-center mb-10">
          <h2 className="text-4xl font-bold text-gray-900 mb-3">
            Generate{' '}
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-500 to-purple-600">
              compelling content
            </span>
          </h2>
          <p className="text-lg text-gray-500">
            Describe what you need and let AI do the writing
          </p>
        </div>

        <div className="grid lg:grid-cols-2 gap-8 items-start">
          {/* Input Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 space-y-5">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Content Type
              </label>
              <select
                value={contentType}
                onChange={(e) => setContentType(e.target.value)}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none bg-gray-50 transition-colors"
              >
                {CONTENT_TYPES.map((t) => (
                  <option key={t.value} value={t.value}>
                    {t.label}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Tone
              </label>
              <div className="grid grid-cols-3 gap-2">
                {TONES.map((t) => (
                  <button
                    key={t.value}
                    onClick={() => setTone(t.value)}
                    className={`px-3 py-2 rounded-lg text-sm font-medium transition-all ${
                      tone === t.value
                        ? 'bg-indigo-600 text-white shadow-sm'
                        : 'bg-gray-50 text-gray-600 hover:bg-gray-100 border border-gray-200'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Topic / Description
              </label>
              <textarea
                value={topic}
                onChange={(e) => {
                  setTopic(e.target.value);
                  if (error) setError('');
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleGenerate();
                }}
                placeholder="e.g., The benefits of remote work for software developers..."
                rows={5}
                className="w-full px-3 py-2.5 border border-gray-200 rounded-xl text-gray-900 placeholder-gray-400 focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none resize-none bg-gray-50 transition-colors"
              />
              {error && (
                <p className="mt-1.5 text-sm text-red-500 flex items-center gap-1">
                  <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                  {error}
                </p>
              )}
            </div>

            <button
              onClick={handleGenerate}
              disabled={isGenerating}
              className="w-full py-3 px-6 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-xl hover:opacity-90 disabled:opacity-50 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 shadow-sm"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Generate Content
                </>
              )}
            </button>

            <p className="text-xs text-center text-gray-400">
              Tip: Press <kbd className="px-1.5 py-0.5 bg-gray-100 rounded text-gray-500 font-mono">⌘ Enter</kbd> to generate
            </p>
          </div>

          {/* Output Panel */}
          <div className="bg-white rounded-2xl shadow-sm border border-gray-100 p-6 flex flex-col min-h-96">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-medium text-gray-700">Generated Content</h3>
              {generatedContent && (
                <button
                  onClick={handleCopy}
                  className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-700 transition-colors"
                >
                  {copied ? (
                    <>
                      <Check className="w-4 h-4 text-green-500" />
                      <span className="text-green-500">Copied!</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      Copy
                    </>
                  )}
                </button>
              )}
            </div>

            <div className="flex-1 relative">
              {!generatedContent && !isGenerating && (
                <div className="absolute inset-0 flex flex-col items-center justify-center text-gray-400 gap-3">
                  <div className="w-12 h-12 rounded-xl bg-gray-50 flex items-center justify-center">
                    <Sparkles className="w-6 h-6 text-gray-300" />
                  </div>
                  <p className="text-sm">Your generated content will appear here</p>
                </div>
              )}
              {(generatedContent || isGenerating) && (
                <div className="text-gray-800 whitespace-pre-wrap leading-relaxed text-sm">
                  {generatedContent}
                  {isGenerating && (
                    <span className="inline-block w-0.5 h-4 bg-indigo-500 ml-0.5 align-middle animate-pulse" />
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
