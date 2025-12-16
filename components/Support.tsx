
import React, { useState, useRef, useEffect } from 'react';
import { Send, Bot, User, HelpCircle, Mail, Phone } from 'lucide-react';
import { ChatMessage } from '../types';
import { getSupportResponse } from '../services/geminiService';

export const Support: React.FC = () => {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: '1', role: 'model', text: 'Hello! I am AutoMateSystem AI, your business buddy. How can I help you today?', timestamp: new Date() }
  ]);
  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      text: input,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsTyping(true);

    const replyText = await getSupportResponse(userMsg.text);

    const botMsg: ChatMessage = {
      id: (Date.now() + 1).toString(),
      role: 'model',
      text: replyText,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, botMsg]);
    setIsTyping(false);
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Contact Info */}
      <div className="lg:col-span-1 space-y-6">
        <div>
          <h2 className="text-2xl font-bold text-white">Support Center</h2>
          <p className="text-zinc-400">We are here to help 24/7.</p>
        </div>

        <div className="bg-[#18181b] border border-[#27272a] rounded-xl p-6 space-y-4 shadow-lg">
          <h3 className="font-bold text-white flex items-center gap-2">
            <HelpCircle className="text-amber-500" size={20} />
            Contact Us
          </h3>
          <div className="space-y-4 text-sm">
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="p-2 bg-[#09090b] rounded-lg text-amber-500 border border-[#27272a]"><Mail size={16} /></div>
              <span>support@automatesystem.net</span>
            </div>
            <div className="flex items-center gap-3 text-zinc-300">
              <div className="p-2 bg-[#09090b] rounded-lg text-amber-500 border border-[#27272a]"><Phone size={16} /></div>
              <span>+63 917 123 4567</span>
            </div>
            <hr className="border-[#27272a]" />
            <div className="bg-[#09090b] p-3 rounded-lg border border-[#27272a]">
              <h4 className="font-medium text-white mb-1">FAQs</h4>
              <ul className="list-disc list-inside text-zinc-400 space-y-1">
                <li>How to reset system data?</li>
                <li>Commission payment dates</li>
                <li>Setting up receipt printer</li>
              </ul>
            </div>
          </div>
        </div>
      </div>

      {/* AI Chat */}
      <div className="lg:col-span-2 bg-[#18181b] border border-[#27272a] rounded-xl shadow-lg flex flex-col overflow-hidden">
        <div className="p-4 bg-[#09090b] border-b border-[#27272a] flex justify-between items-center">
          <h3 className="font-bold text-white flex items-center gap-2">
            <Bot className="text-amber-500" size={20} />
            AutoMate AI Assistant
          </h3>
          <span className="text-xs text-emerald-500 flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
            Online
          </span>
        </div>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-[#09090b]">
          {messages.map((msg) => (
            <div key={msg.id} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`flex max-w-[80%] gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : 'flex-row'}`}>
                <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-amber-500 text-black' : 'bg-[#27272a] text-zinc-400'}`}>
                  {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                </div>
                <div className={`p-3 rounded-2xl text-sm leading-relaxed ${
                  msg.role === 'user' 
                    ? 'bg-amber-500 text-black rounded-tr-none font-medium' 
                    : 'bg-[#27272a] text-zinc-200 rounded-tl-none border border-[#3f3f46]'
                }`}>
                  {msg.text}
                </div>
              </div>
            </div>
          ))}
          {isTyping && (
            <div className="flex justify-start">
              <div className="flex items-center gap-2 text-zinc-500 text-xs ml-12">
                <span className="animate-bounce">•</span>
                <span className="animate-bounce delay-100">•</span>
                <span className="animate-bounce delay-200">•</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSend} className="p-4 bg-[#18181b] border-t border-[#27272a] flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Type your question..."
            className="flex-1 bg-[#09090b] border border-[#27272a] rounded-lg px-4 py-3 text-white focus:ring-2 focus:ring-amber-500/50 outline-none placeholder-zinc-600"
          />
          <button 
            type="submit" 
            disabled={!input.trim() || isTyping}
            className="bg-amber-500 hover:bg-amber-400 disabled:opacity-50 disabled:cursor-not-allowed text-black p-3 rounded-lg transition-colors font-bold"
          >
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};
