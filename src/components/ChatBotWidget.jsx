// src/components/ChatBotWidget.jsx
import React, { useState } from 'react';
import './ChatBotWidget.css';

const ChatBotWidget = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMsg = { role: 'user', content: inputMessage };
    setMessages((prev) => [...prev, userMsg]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_BASE_URL}/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ message: inputMessage }),
      });

      const data = await response.json();

      if (response.ok && data.reply) {
        setMessages((prev) => [...prev, { role: 'assistant', content: data.reply }]);
      } else {
        throw new Error(data.error || 'Không thể kết nối AI lúc này.');
      }
    } catch (err) {
      console.error('Lỗi khi gọi chatbot:', err);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: '❌ Không thể kết nối trợ lý AI. Vui lòng thử lại sau!',
        },
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        className="floating-chat-btn"
        onClick={() => setIsChatOpen(true)}
        aria-label="Hỗ trợ AI"
      >
        💬
      </button>

      {isChatOpen && (
        <div className="chat-overlay" onClick={() => setIsChatOpen(false)}>
          <div className="chat-container" onClick={(e) => e.stopPropagation()}>
            <div className="chat-header">
              <h4>🤖 Trợ lý SweetLens AI</h4>
              <button className="chat-close" onClick={() => setIsChatOpen(false)}>
                ×
              </button>
            </div>
            <div className="chat-messages">
              {messages.length === 0 ? (
                <div className="chat-welcome">
                  Xin chào! Mình có thể giúp gì cho bạn về SweetLens Photo Booth? 😊
                </div>
              ) : (
                messages.map((msg, idx) => (
                  <div key={idx} className={`message ${msg.role}`}>
                    {msg.content}
                  </div>
                ))
              )}
              {isLoading && (
                <div className="message assistant">
                  <span className="typing-indicator">Đang suy nghĩ...</span>
                </div>
              )}
            </div>
            <div className="chat-input-area">
              <input
                type="text"
                value={inputMessage}
                onChange={(e) => setInputMessage(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder="Nhập câu hỏi..."
                disabled={isLoading}
                className="chat-input"
              />
              <button
                onClick={handleSendMessage}
                disabled={!inputMessage.trim() || isLoading}
                className="chat-send-btn"
              >
                ↵
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default ChatBotWidget;