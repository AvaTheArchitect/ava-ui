'use client';

import React from 'react';
import { useContact } from '@/hooks/ui/useContact';

interface ContactProps {
  className?: string;
  children?: React.ReactNode;
}

const Contact: React.FC<ContactProps> = ({
  className = '',
  children
}) => {
  const {
    isLoaded,
    isActive,
    handleToggle,
    handleSubmit
  } = useContact();

  if (!isLoaded) {
    return (
      <div className="flex justify-center items-center min-h-[50vh] bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900">
        <div className="text-white text-xl">Loading contact...</div>
      </div>
    );
  }

  return (
    <div className={`max-w-6xl mx-auto p-8 min-h-screen bg-gradient-to-br from-gray-900 via-purple-900 to-gray-900 text-white ${className}`}>
      {/* Header */}
      <div className="text-center mb-12">
        <h1 className="text-5xl font-bold mb-4 text-orange-500 font-bold tracking-wide">
          📧 Contact
        </h1>
        <p className="text-blue-200/80 mb-0">
          Music Development Component - Created by Cipher.ai
        </p>
      </div>

      {/* Content Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">

        {/* Contact Form Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4 text-cyan-400">
            📝 Send Message
          </h3>
          <p className="text-blue-200 mb-6">
            Get in touch with the Maestro.ai development team
          </p>

          {/* Contact Form */}
          <form onSubmit={handleSubmit} className="flex flex-col gap-6">
            <div className="flex flex-col gap-2">
              <label className="font-semibold text-cyan-400 text-sm">
                Name
              </label>
              <input
                type="text"
                placeholder="Your name"
                className="bg-white/10 border border-white/30 rounded-lg p-3 text-white text-base transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.2)] placeholder-gray-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-cyan-400 text-sm">
                Email
              </label>
              <input
                type="email"
                placeholder="your.email@example.com"
                className="bg-white/10 border border-white/30 rounded-lg p-3 text-white text-base transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.2)] placeholder-gray-400"
              />
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-cyan-400 text-sm">
                Subject
              </label>
              <select className="bg-white/10 border border-white/30 rounded-lg p-3 text-white text-base transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.2)]">
                <option value="" className="bg-gray-800 text-white">Select a topic</option>
                <option value="general" className="bg-gray-800 text-white">General Inquiry</option>
                <option value="support" className="bg-gray-800 text-white">Technical Support</option>
                <option value="feature" className="bg-gray-800 text-white">Feature Request</option>
                <option value="bug" className="bg-gray-800 text-white">Bug Report</option>
              </select>
            </div>

            <div className="flex flex-col gap-2">
              <label className="font-semibold text-cyan-400 text-sm">
                Message
              </label>
              <textarea
                rows={4}
                placeholder="Tell us about your inquiry..."
                className="bg-white/10 border border-white/30 rounded-lg p-3 text-white text-base transition-all duration-300 focus:outline-none focus:border-cyan-400 focus:shadow-[0_0_0_2px_rgba(0,245,255,0.2)] placeholder-gray-400 resize-none"
              />
            </div>

            <button
              type="submit"
              className="bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-8 rounded-lg font-bold text-lg cursor-pointer transition-all duration-300 mt-4 hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/30"
            >
              📤 Send Message
            </button>
          </form>
        </div>

        {/* Contact Information Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4 text-cyan-400">
            📞 Contact Information
          </h3>
          <p className="text-blue-200 mb-6">
            Multiple ways to reach our team
          </p>

          {/* Contact Info List */}
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg transition-colors duration-300 hover:bg-white/10">
              <div className="text-2xl w-8 text-center">📧</div>
              <div>
                <div className="font-semibold text-white">Email</div>
                <div className="text-gray-300">support@maestro.ai</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg transition-colors duration-300 hover:bg-white/10">
              <div className="text-2xl w-8 text-center">💬</div>
              <div>
                <div className="font-semibold text-white">Discord</div>
                <div className="text-gray-300">Join our community</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg transition-colors duration-300 hover:bg-white/10">
              <div className="text-2xl w-8 text-center">🐙</div>
              <div>
                <div className="font-semibold text-white">GitHub</div>
                <div className="text-gray-300">Report issues & contribute</div>
              </div>
            </div>

            <div className="flex items-center gap-4 p-3 bg-white/5 rounded-lg transition-colors duration-300 hover:bg-white/10">
              <div className="text-2xl w-8 text-center">📱</div>
              <div>
                <div className="font-semibold text-white">Social Media</div>
                <div className="text-gray-300">Follow @MaestroAI</div>
              </div>
            </div>
          </div>
        </div>

        {/* Team Info Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4 text-cyan-400">
            👥 Development Team
          </h3>
          <p className="text-blue-200 mb-6">
            Meet the minds behind Maestro.ai
          </p>
          <button
            onClick={handleToggle}
            className={`w-full bg-gradient-to-r text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg ${isActive
              ? 'from-orange-500 to-red-500 hover:shadow-orange-400/40 animate-pulse'
              : 'from-cyan-400 to-blue-500 hover:shadow-cyan-400/40'
              }`}
            type="button"
          >
            {isActive ? '⏹️ Stop' : '▶️ Start'} Contact
          </button>
        </div>

        {/* FAQ Card */}
        <div className="bg-blue-500/5 backdrop-blur-lg border border-blue-300/20 shadow-lg shadow-purple-900/20 text-blue-200 hover:bg-blue-500/10 hover:border-blue-400/30 transition-all duration-300 rounded-2xl p-8">
          <h3 className="text-2xl font-bold mb-4 text-cyan-400">
            ❓ Quick Help
          </h3>
          <p className="text-blue-200 mb-6">
            Common questions and resources
          </p>
          <button className="w-full bg-gradient-to-r from-cyan-400 to-blue-500 text-white border-none py-4 px-6 rounded-xl font-bold cursor-pointer transition-all duration-300 text-base hover:-translate-y-1 hover:shadow-lg hover:shadow-cyan-400/40">
            📚 View FAQ
          </button>
        </div>
      </div>

      {/* Children */}
      {children && (
        <div className="bg-white/5 rounded-2xl p-8 border border-white/10 mt-8">
          {children}
        </div>
      )}

      {/* Footer */}
      <div className="text-center pt-8 border-t border-white/20 text-gray-400 text-sm">
        🔧 Created by Cipher  | {new Date().toLocaleDateString()}
      </div>
    </div>
  );
};

export default Contact;