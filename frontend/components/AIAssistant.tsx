
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, Loader2, Sparkles, AlertCircle } from 'lucide-react';
import { askAssistant } from '../services/geminiService';

const AIAssistant: React.FC = () => {
    const [messages, setMessages] = useState<{role: 'user' | 'bot', content: string}[]>([
        { role: 'bot', content: "Hello! I'm your FormosaStay assistant. I can help you with tenancy laws in Taiwan, calculating proration, or drafting Line messages to tenants. What's on your mind?" }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const handleSend = async () => {
        if (!input.trim() || isLoading) return;

        const userMsg = input;
        setInput('');
        setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
        setIsLoading(true);

        const response = await askAssistant(userMsg);
        
        setMessages(prev => [...prev, { role: 'bot', content: response }]);
        setIsLoading(false);
    };

    const suggestedPrompts = [
        "How do I terminate a contract early in Taiwan?",
        "Draft a rent increase notice for Line.",
        "How should I deploy this app on AWS?"
    ];

    if (!process.env.API_KEY) {
        return (
             <div className="flex flex-col items-center justify-center h-full text-center p-8">
                 <div className="bg-amber-100 p-4 rounded-full mb-4">
                    <AlertCircle className="text-amber-600" size={32} />
                 </div>
                 <h3 className="text-xl font-bold text-slate-800">API Key Missing</h3>
                 <p className="text-slate-500 mt-2 max-w-md">
                     To use the AI Assistant, please ensure the Google Gemini API Key is configured in your environment.
                 </p>
             </div>
        );
    }

    return (
        <div className="flex flex-col h-[calc(100vh-140px)] bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
            <div className="p-4 border-b border-slate-200 bg-slate-50 flex items-center gap-3">
                <div className="bg-gradient-to-br from-indigo-500 to-purple-600 p-2 rounded-lg text-white">
                    <Sparkles size={20} />
                </div>
                <div>
                    <h3 className="font-bold text-slate-800">AI Property Consultant</h3>
                    {/* Updated model label in UI */}
                    <p className="text-xs text-slate-500">Powered by Gemini 3 Pro</p>
                </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.map((msg, idx) => (
                    <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                        <div className={`flex gap-3 max-w-[80%] ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center shrink-0 ${msg.role === 'user' ? 'bg-slate-200' : 'bg-indigo-100 text-indigo-600'}`}>
                                {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                            </div>
                            <div className={`p-3 rounded-2xl text-sm whitespace-pre-wrap ${
                                msg.role === 'user' 
                                ? 'bg-slate-800 text-white rounded-tr-none' 
                                : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200'
                            }`}>
                                {msg.content}
                            </div>
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className="flex justify-start">
                        <div className="flex gap-3 bg-slate-100 p-3 rounded-2xl rounded-tl-none border border-slate-200">
                             <Loader2 size={16} className="animate-spin text-slate-500" />
                             <span className="text-xs text-slate-500">Reasoning...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            <div className="p-4 border-t border-slate-200 space-y-3">
                {messages.length === 1 && (
                    <div className="flex gap-2 overflow-x-auto pb-2">
                        {suggestedPrompts.map((p, i) => (
                            <button 
                                key={i}
                                onClick={() => { setInput(p); }} 
                                className="whitespace-nowrap px-3 py-1 text-xs border border-indigo-200 text-indigo-600 bg-indigo-50 rounded-full hover:bg-indigo-100 transition-colors"
                            >
                                {p}
                            </button>
                        ))}
                    </div>
                )}
                <div className="flex gap-2">
                    <input 
                        className="flex-1 border border-slate-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        placeholder="Ask about contracts, laws, or AWS..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                    />
                    <button 
                        disabled={isLoading}
                        onClick={handleSend}
                        className="bg-indigo-600 text-white p-2 rounded-lg hover:bg-indigo-700 disabled:opacity-50 transition-colors"
                    >
                        <Send size={20} />
                    </button>
                </div>
            </div>
        </div>
    );
};

export default AIAssistant;
