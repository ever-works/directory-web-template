"use client";

import { useState } from "react";
import { useTranslations } from 'next-intl';
import { Button } from "@/components/ui/button";

interface SupportChannel {
  id: string;
  name: string;
  description: string;
  icon: string;
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
      icon: "📚",
      color: "text-blue-600 dark:text-blue-400",
      gradient: "from-blue-500 to-cyan-500",
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
      icon: "👥",
      color: "text-purple-600 dark:text-purple-400",
      gradient: "from-purple-500 to-pink-500",
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
      icon: "✉️",
      color: "text-green-600 dark:text-green-400",
      gradient: "from-green-500 to-emerald-500",
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
      icon: "💬",
      color: "text-orange-600 dark:text-orange-400",
      gradient: "from-orange-500 to-red-500",
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
      case "online": return "bg-green-500";
      case "busy": return "bg-yellow-500";
      case "offline": return "bg-red-500";
      default: return "bg-gray-500";
    }
  };

  return (
    <div className="py-20 bg-linear-to-br from-slate-50 via-white to-slate-100 dark:from-slate-900 dark:via-slate-800 dark:to-black">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        {/* Header */}
        <div className="text-center mb-16">
          <div className="inline-flex items-center gap-2 px-4 py-2 bg-red-100 dark:bg-red-900/30 rounded-full text-red-700 dark:text-red-300 text-sm font-medium mb-6">
            <span>🆘</span>
            Support Center
          </div>
          <h2 className="text-4xl md:text-5xl font-bold mb-6 text-slate-900 dark:text-white">
            {t("NEED_HELP")}
          </h2>
          <p className="text-slate-600 dark:text-slate-400 text-lg max-w-3xl mx-auto leading-relaxed">
            {t("NEED_HELP_DESC")}
          </p>
        </div>

        {/* Support Dashboard */}
        <div className="bg-white/90 dark:bg-slate-800/90 backdrop-blur-xs rounded-2xl border border-slate-200 dark:border-slate-700 shadow-2xl overflow-hidden">
          {/* Dashboard Header */}
          <div className="bg-slate-100 dark:bg-slate-900 px-6 py-4 border-b border-slate-200 dark:border-slate-700">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="w-8 h-8 bg-red-500 rounded-lg flex items-center justify-center">
                  <span className="text-white text-sm">🆘</span>
                </div>
                <h3 className="text-lg font-semibold text-slate-900 dark:text-white">
                  Support Dashboard
                </h3>
              </div>
              
              {/* Tabs */}
              <div className="flex bg-slate-200 dark:bg-slate-700 rounded-lg p-1">
                {[
                  { id: 'channels', label: 'Support Channels', icon: '📞' },
                  { id: 'faq', label: 'FAQ', icon: '❓' },
                  { id: 'chat', label: 'Live Chat', icon: '💬' }
                ].map((tab) => (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id as any)}
                    className={`flex items-center gap-2 px-4 py-2 text-sm font-medium rounded-md transition-all duration-300 ${
                      activeTab === tab.id
                        ? "bg-white dark:bg-slate-800 text-slate-900 dark:text-white shadow-xs"
                        : "text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
                    }`}
                  >
                    <span>{tab.icon}</span>
                    {tab.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Tab Content */}
          <div className="p-6">
            {activeTab === 'channels' && (
              <div className="space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {supportChannels.map((channel) => (
                    <div
                      key={channel.id}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300 hover:transform hover:scale-105"
                    >
                      {/* Header */}
                      <div className="flex items-start justify-between mb-4">
                        <div className="flex items-center gap-3">
                          <div className={`w-12 h-12 rounded-xl bg-linear-to-r ${channel.gradient} flex items-center justify-center text-white text-xl shadow-lg`}>
                            {channel.icon}
                          </div>
                          <div>
                            <h4 className={`font-bold text-lg ${channel.color}`}>
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
                      <p className="text-slate-600 dark:text-slate-400 text-sm mb-4">
                        {channel.description}
                      </p>

                      {/* Stats */}
                      <div className="grid grid-cols-2 gap-4 mb-4">
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
                      <div className="mb-4">
                        <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 mb-2 uppercase tracking-wider">
                          Features
                        </h5>
                        <div className="flex flex-wrap gap-1">
                          {channel.features.map((feature, index) => (
                            <span
                              key={index}
                              className="px-2 py-1 text-xs bg-white dark:bg-slate-700 rounded-md border border-slate-200 dark:border-slate-600 text-slate-600 dark:text-slate-400"
                            >
                              {feature}
                            </span>
                          ))}
                        </div>
                      </div>

                      {/* Action Button */}
                      <Button
                        onClick={() => channel.id === 'live-chat' ? setChatOpen(true) : window.open(channel.link, '_blank')}
                        className={`w-full bg-linear-to-r ${channel.gradient} hover:opacity-90 text-white font-semibold py-2 rounded-lg shadow-lg hover:shadow-xl transition-all duration-300`}
                      >
                        {channel.id === 'live-chat' ? 'Start Chat' : 'Get Help'}
                      </Button>
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
                      className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all duration-300 ${
                        selectedCategory === category.id
                          ? "bg-indigo-600 text-white shadow-lg shadow-indigo-500/25"
                          : "bg-slate-100 dark:bg-slate-700 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-600"
                      }`}
                    >
                      {category.label}
                      <span className="text-xs opacity-75">({category.count})</span>
                    </button>
                  ))}
                </div>

                {/* FAQ Items */}
                <div className="space-y-4">
                  {filteredFAQ.map((item, index) => (
                    <div
                      key={index}
                      className="bg-slate-50 dark:bg-slate-800/50 rounded-xl p-6 border border-slate-200 dark:border-slate-700 hover:border-slate-300 dark:hover:border-slate-600 transition-all duration-300"
                    >
                      <h4 className="font-semibold text-slate-900 dark:text-white mb-3">
                        {item.question}
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 text-sm leading-relaxed mb-3">
                        {item.answer}
                      </p>
                      <div className="flex flex-wrap gap-1">
                        {item.tags.map((tag, tagIndex) => (
                          <span
                            key={tagIndex}
                            className="px-2 py-1 text-xs bg-indigo-100 dark:bg-indigo-900/30 text-indigo-700 dark:text-indigo-300 rounded-md"
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
                <div className="flex items-center justify-between mb-4 p-4 bg-slate-100 dark:bg-slate-700 rounded-lg">
                  <div className="flex items-center gap-3">
                    <div className="w-8 h-8 bg-green-500 rounded-full flex items-center justify-center">
                      <span className="text-white text-sm">💬</span>
                    </div>
                    <div>
                      <h4 className="font-semibold text-slate-900 dark:text-white">Live Chat</h4>
                      <p className="text-xs text-slate-500 dark:text-slate-400">Online • Responds in 1-2 minutes</p>
                    </div>
                  </div>
                  <Button
                    onClick={() => setChatOpen(!chatOpen)}
                    className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg"
                  >
                    {chatOpen ? 'Close Chat' : 'Start Chat'}
                  </Button>
                </div>

                {chatOpen ? (
                  <div className="flex-1 flex flex-col bg-slate-50 dark:bg-slate-800/50 rounded-lg border border-slate-200 dark:border-slate-700">
                    {/* Messages */}
                    <div className="flex-1 p-4 space-y-4 overflow-y-auto">
                      {chatMessages.map((message) => (
                        <div
                          key={message.id}
                          className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}
                        >
                          <div className={`max-w-xs px-4 py-2 rounded-lg ${
                            message.type === 'user'
                              ? 'bg-indigo-600 text-white'
                              : 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white border border-slate-200 dark:border-slate-600'
                          }`}>
                            <p className="text-sm">{message.message}</p>
                            <p className="text-xs opacity-75 mt-1">{message.time}</p>
                          </div>
                        </div>
                      ))}
                    </div>

                    {/* Input */}
                    <div className="p-4 border-t border-slate-200 dark:border-slate-700">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          value={inputMessage}
                          onChange={(e) => setInputMessage(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && sendMessage()}
                          placeholder="Type your message..."
                          className="flex-1 px-3 py-2 bg-white dark:bg-slate-700 border border-slate-200 dark:border-slate-600 rounded-lg text-slate-900 dark:text-white placeholder-slate-500 dark:placeholder-slate-400 focus:outline-hidden focus:ring-2 focus:ring-indigo-500"
                        />
                        <Button
                          onClick={sendMessage}
                          className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg"
                        >
                          Send
                        </Button>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex-1 flex items-center justify-center">
                    <div className="text-center">
                      <div className="text-6xl mb-4">💬</div>
                      <h4 className="text-xl font-semibold text-slate-900 dark:text-white mb-2">
                        Start a conversation
                      </h4>
                      <p className="text-slate-600 dark:text-slate-400 mb-4">
                        Get instant help from our support team
                      </p>
                      <Button
                        onClick={() => setChatOpen(true)}
                        className="bg-green-600 hover:bg-green-700 text-white px-6 py-3 rounded-lg"
                      >
                        Start Chat
                      </Button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <div className="bg-linear-to-r from-red-50 to-orange-50 dark:from-red-900/30 dark:to-orange-900/30 rounded-2xl p-8 border border-red-200 dark:border-red-800">
            <h3 className="text-2xl font-bold mb-4 text-slate-900 dark:text-white">
              Still Need Help?
            </h3>
            <p className="text-slate-600 dark:text-slate-400 mb-6 max-w-2xl mx-auto">
              Our support team is here to help you succeed with your project
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Button className="bg-linear-to-r from-red-600 to-orange-600 hover:from-red-700 hover:to-orange-700 text-white font-semibold px-8 py-3 rounded-xl shadow-lg hover:shadow-xl transition-all duration-300 transform hover:scale-105">
                Contact Support
              </Button>
              <Button variant="outline" className="border-2 border-slate-300 dark:border-slate-600 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-800 font-semibold px-8 py-3 rounded-xl transition-all duration-300">
                View Documentation
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}