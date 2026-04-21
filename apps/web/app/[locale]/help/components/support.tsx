"use client";

import { useState, type ComponentType } from "react";
import { useTranslations } from 'next-intl';
import { BookOpen, Users, Mail, MessageSquare, LifeBuoy, Phone, HelpCircle } from "lucide-react";
interface SupportChannel {
  id: string;
  name: string;
  description: string;
  Icon: ComponentType<{ className?: string }>;
  color: string;
  gradient: string;
  responseTime: string;
  availability: string;
  features: string[];
  link: string;
  status: "online" | "busy" | "offline";
}

interface FAQItem {
  question: string;
  answer: string;
  category: string;
  tags: string[];
}

export function Support() {
  const t = useTranslations("help");
  const [activeTab, setActiveTab] = useState<'channels' | 'faq' | 'chat'>('channels');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [chatOpen, setChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([
    { id: 1, type: 'bot', message: 'Hello! How can I help you today?', time: 'Just now' }
  ]);
  const [inputMessage, setInputMessage] = useState('');

  const supportChannels: SupportChannel[] = [
    {
      id: "documentation",
      name: t("DOCUMENTATION"),
      description: t("DOCUMENTATION_DESC"),
      Icon: BookOpen,
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
      responseTime: "Instant",
      availability: "24/7",
      features: [
        "Comprehensive guides",
        "API documentation",
        "Code examples",
        "Video tutorials"
      ],
      link: "/docs",
      status: "online"
    },
    {
      id: "community",
      name: t("COMMUNITY"),
      description: t("COMMUNITY_DESC"),
      Icon: Users,
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
      responseTime: "2-4 hours",
      availability: "24/7",
      features: [
        "Discord server",
        "Community forums",
        "Peer support",
        "Knowledge sharing"
      ],
      link: "https://discord.gg/ever-works",
      status: "online"
    },
    {
      id: "email",
      name: t("CONTACT_SUPPORT"),
      description: t("CONTACT_SUPPORT_DESC"),
      Icon: Mail,
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
      responseTime: "4-8 hours",
      availability: "Business hours",
      features: [
        "Priority support",
        "Technical assistance",
        "Bug reports",
        "Feature requests"
      ],
      link: "mailto:support@ever.works",
      status: "online"
    },
    {
      id: "live-chat",
      name: "Live Chat",
      description: "Get instant help from our support team",
      Icon: MessageSquare,
      color: "text-neutral-900 dark:text-white",
      gradient: "from-neutral-700 to-neutral-900",
      responseTime: "1-2 minutes",
      availability: "9 AM - 6 PM EST",
      features: [
        "Real-time chat",
        "Screen sharing",
        "File uploads",
        "Instant responses"
      ],
      link: "#",
      status: "online"
    }
  ];

  const faqItems: FAQItem[] = [
    {
      question: t("FAQ_SETUP_TIME"),
      answer: t("FAQ_SETUP_TIME_ANSWER"),
      category: "setup",
      tags: ["installation", "time", "beginner"]
    },
    {
      question: t("FAQ_CODING_EXPERIENCE"),
      answer: t("FAQ_CODING_EXPERIENCE_ANSWER"),
      category: "requirements",
      tags: ["experience", "skills", "beginner"]
    },
    {
      question: t("FAQ_CUSTOMIZE_DESIGN"),
      answer: t("FAQ_CUSTOMIZE_DESIGN_ANSWER"),
      category: "customization",
      tags: ["design", "theming", "branding"]
    },
    {
      question: t("FAQ_HOSTING"),
      answer: t("FAQ_HOSTING_ANSWER"),
      category: "deployment",
      tags: ["hosting", "deployment", "production"]
    },
    {
      question: t("FAQ_PAYMENT_INTEGRATION"),
      answer: t("FAQ_PAYMENT_INTEGRATION_ANSWER"),
      category: "payments",
      tags: ["stripe", "payments", "integration"]
    },
    {
      question: t("FAQ_CUSTOM_DOMAIN"),
      answer: t("FAQ_CUSTOM_DOMAIN_ANSWER"),
      category: "deployment",
      tags: ["domain", "custom", "configuration"]
    }
  ];

  const categories = [
    { id: "all", label: "All Questions", count: faqItems.length },
    { id: "setup", label: "Setup & Installation", count: faqItems.filter(f => f.category === "setup").length },
    { id: "requirements", label: "Requirements", count: faqItems.filter(f => f.category === "requirements").length },
    { id: "customization", label: "Customization", count: faqItems.filter(f => f.category === "customization").length },
    { id: "deployment", label: "Deployment", count: faqItems.filter(f => f.category === "deployment").length },
    { id: "payments", label: "Payments", count: faqItems.filter(f => f.category === "payments").length }
  ];

  const filteredFAQ = selectedCategory === 'all' 
    ? faqItems 
    : faqItems.filter(item => item.category === selectedCategory);

  const sendMessage = () => {
    if (!inputMessage.trim()) return;
    
    const userMessage = {
      id: chatMessages.length + 1,
      type: 'user' as const,
      message: inputMessage,
      time: 'Just now'
    };
    
    setChatMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    
    // Simulate bot response
    setTimeout(() => {
      const botResponse = {
        id: chatMessages.length + 2,
        type: 'bot' as const,
        message: "Thanks for your message! Our support team will get back to you shortly. In the meantime, you can check our documentation for quick answers.",
        time: 'Just now'
      };
      setChatMessages(prev => [...prev, botResponse]);
    }, 1000);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case "online": return "bg-neutral-400 dark:bg-neutral-500";
      case "busy": return "bg-neutral-400 dark:bg-neutral-500";
      case "offline": return "bg-neutral-300 dark:bg-neutral-600";
      default: return "bg-neutral-300 dark:bg-neutral-600";
    }
  };

  return (
    <div>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs font-medium uppercase tracking-widest text-neutral-400 dark:text-neutral-500 mb-2">Support Center</p>
          <h2 className="text-base font-semibold tracking-tight mb-2 text-neutral-900 dark:text-white">
            {t("NEED_HELP")}
          </h2>
          <p className="text-neutral-500 dark:text-neutral-400 text-xs max-w-2xl leading-relaxed">
            {t("NEED_HELP_DESC")}
          </p>
        </div>

        {/* Support Dashboard */}
        <div className="bg-white dark:bg-white/3 rounded-xl border border-slate-200 dark:border-white/6 shadow-sm overflow-hidden">
          {/* Dashboard Header */}
          <div className="bg-slate-100 dark:bg-[#0a0a0a] px-6 py-4 border-b border-slate-200 dark:border-white/6">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-neutral-900 dark:bg-white/10 rounded-lg flex items-center justify-center">
                  <LifeBuoy className="w-4 h-4 text-white dark:text-neutral-400" />
                </div>
                <h3 className="text-sm font-semibold text-slate-900 dark:text-white">
                  Support Dashboard
                </h3>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-slate-200 dark:bg-white/8 rounded-lg p-1">
                {[
                  { id: 'channels', label: 'Support Channels', Icon: Phone },
                  { id: 'faq', label: 'FAQ', Icon: HelpCircle },
                  { id: 'chat', label: 'Live Chat', Icon: MessageSquare }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as 'channels' | 'faq' | 'chat')}
                    className={`flex items-center gap-2 px-3 py-1.5 text-xs font-medium rounded-md transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-white/5 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <tab.Icon className="w-3.5 h-3.5" />
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-4">
            {activeTab === 'channels' && (
              <div className="space-y-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {supportChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="bg-slate-50 dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-colors duration-200"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <div className={`w-8 h-8 rounded-md bg-neutral-900 dark:bg-white/10 flex items-center justify-center`}>
                            <channel.Icon className="w-4 h-4 text-white dark:text-neutral-400" />
                          </div>
                          <div>
                            <h4 className={`font-semibold text-sm text-neutral-900 dark:text-white`}>
                              {channel.name}
                            </h4>
                            <div className="flex items-center gap-2 mt-1">
                              <div className={`w-2 h-2 rounded-full ${getStatusColor(channel.status)}`}></div>
                              <span className="text-xs text-slate-500 dark:text-slate-400 capitalize">
                                {channel.status}
                              </span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Description */}
                      <p className="text-slate-600 dark:text-slate-400 text-xs mb-3">
                        {channel.description}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-3 mb-3">
                        <div className="text-center">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {channel.responseTime}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Response Time
                          </div>
                        </div>
                        <div className="text-center">
                          <div className="text-sm font-semibold text-slate-900 dark:text-white">
                            {channel.availability}
                          </div>
                          <div className="text-xs text-slate-500 dark:text-slate-400">
                            Availability
                          </div>
                        </div>
                      </div>

                      {/* Features */}
                      <div className="mb-3">
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                          Features
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {channel.features.map((feature, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-white dark:bg-white/8 rounded-md border border-slate-200 dark:border-white/8 text-slate-600 dark:text-slate-400"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <button
                        onClick={() => channel.id === 'live-chat' ? setChatOpen(true) : window.open(channel.link, '_blank')}
                        className="w-full h-8 px-3 text-xs font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors"
                      >
                        {channel.id === 'live-chat' ? 'Start Chat' : 'Get Help'}
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'faq' && (
              <div className="space-y-6">
                {/* Category Filter */}
                <div className="flex flex-wrap gap-2">
                  {categories.map((category) => (
                    <button
                      key={category.id}
                      onClick={() => setSelectedCategory(category.id)}
                      className={`flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                        selectedCategory === category.id
                          ? "bg-gray-900 dark:bg-white text-white dark:text-gray-900"
                          : "bg-slate-100 dark:bg-white/8 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-white/8"
                      }`}
                    >
                      {category.label}
                      <span className="text-xs opacity-75">({category.count})</span>
                    </button>
                  ))}
                </div>

                {/* FAQ Items */}
                <div className="space-y-3">
                  {filteredFAQ.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 dark:bg-white/3 rounded-lg p-4 border border-slate-200 dark:border-white/6 hover:border-slate-300 dark:hover:border-white/8 transition-all duration-300"
                    >
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        {item.question}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                        {item.answer}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 text-xs bg-neutral-100 dark:bg-white/8 text-neutral-600 dark:text-neutral-400 rounded-md"
                          >
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {activeTab === 'chat' && (
              <div className="h-96 flex flex-col">
                {/* Chat Header */}
                <div className="flex items-center justify-between mb-4 p-4 bg-slate-100 dark:bg-white/8 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-neutral-900 dark:bg-white/10 rounded-full flex items-center justify-center">
                      <MessageSquare className="w-4 h-4 text-white dark:text-neutral-400" />
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Live Chat</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Online • Responds in 1-2 minutes</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="h-8 px-3 text-xs font-medium bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg transition-colors"
                  >
                    {chatOpen ? 'Close Chat' : 'Start Chat'}
                  </button>
                </div>

                {chatOpen ? (
                  <div className="flex-1 flex flex-col bg-slate-50 dark:bg-white/3 rounded-lg border border-slate-200 dark:border-white/6">
                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-neutral-900 dark:bg-white/80 text-white dark:text-neutral-900'
                              : 'bg-white dark:bg-white/8 text-slate-900 dark:text-white border border-slate-200 dark:border-white/8'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs opacity-75 mt-1">{message.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200 dark:border-white/6">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-white/8 border border-slate-200 dark:border-white/8 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-neutral-900 dark:focus:ring-white/40"
                        />
                        <button
                          onClick={sendMessage}
                          className="h-9 px-3 text-sm font-medium bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg transition-colors"
                        >
                          Send
                        </button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-4xl mb-3">💬</div>
                      <h4 className="text-sm font-semibold text-slate-900 dark:text-white mb-2">
                        Start a conversation
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Get instant help from our support team
                      </p>
                      <button
                        onClick={() => setChatOpen(true)}
                        className="h-9 px-4 text-sm font-medium bg-neutral-900 hover:bg-neutral-700 dark:bg-white dark:hover:bg-neutral-100 text-white dark:text-neutral-900 rounded-lg transition-colors"
                      >
                        Start Chat
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-8 text-center">
          <div className="bg-gray-50 dark:bg-white/3 rounded-xl p-6 border border-gray-100 dark:border-white/6">
            <h3 className="text-base font-semibold mb-2 text-slate-900 dark:text-white">
              Still Need Help?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 text-xs mb-4 max-w-2xl mx-auto">
              Our support team is here to help you succeed with your project
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <button className="h-9 px-4 text-sm font-medium bg-gray-900 dark:bg-white text-white dark:text-gray-900 rounded-lg hover:bg-gray-700 dark:hover:bg-gray-100 transition-colors">
                Contact Support
              </button>
              <button className="h-9 px-4 text-sm font-medium border border-gray-200 dark:border-white/10 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-white/6 transition-colors">
                View Documentation
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}