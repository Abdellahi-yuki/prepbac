import React, { useState, useRef, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import {
  Send, Sparkles, BookOpen, GitBranch, Brain, Zap, Trash2, Maximize2,
  FileText, Menu, Plus, MessageSquare, Clock, X, MoreVertical
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import remarkMath from 'remark-math';
import rehypeKatex from 'rehype-katex';
import 'katex/dist/katex.min.css';
import { API_BASE_URL } from '../apiConfig';

const initialMessages = [
  {
    id: 1,
    role: 'assistant',
    text: "Bonjour ! Je suis votre assistant académique IA 🎓\n\nJe suis disponible 24h/24 pour vous aider à comprendre vos cours, résoudre des exercices ou générer des fiches de révision. Comment puis-je vous aider aujourd'hui ?",
    time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
  },
];

const quickSuggestions = [
  { label: 'Expliquer la loi d\'Ohm', icon: Zap },
  { label: 'Quiz sur les dérivées', icon: GitBranch },
  { label: 'Fiche sur la Génétique', icon: BookOpen },
  { label: 'Plan de révision Maths', icon: Brain },
];

// Enhanced Markdown Renderer with Math support
const MarkdownContent = ({ content, isUser }) => {
  if (isUser) return <div style={{ whiteSpace: 'pre-wrap' }}>{content}</div>;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm, remarkMath]}
      rehypePlugins={[rehypeKatex]}
      components={{
        p: ({ node, ...props }) => <p style={{ margin: '0 0 0.75rem 0' }} {...props} />,
        li: ({ node, ...props }) => <li style={{ marginBottom: '0.4rem' }} {...props} />,
        ul: ({ node, ...props }) => <ul style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }} {...props} />,
        ol: ({ node, ...props }) => <ol style={{ paddingLeft: '1.25rem', marginBottom: '0.75rem' }} {...props} />,
        h3: ({ node, ...props }) => <h3 style={{ fontSize: '1.1rem', fontWeight: 700, margin: '1rem 0 0.5rem 0' }} {...props} />,
        code: ({ node, inline, ...props }) => (
          <code
            style={{
              background: 'rgba(0,0,0,0.05)',
              padding: '0.1rem 0.3rem',
              borderRadius: '4px',
              fontSize: '0.85em',
              fontFamily: 'monospace'
            }}
            {...props}
          />
        )
      }}
    >
      {content}
    </ReactMarkdown>
  );
};

export default function Assistant() {
  const [messages, setMessages] = useState(initialMessages);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [conversationId, setConversationId] = useState(null);
  const location = useLocation();
  const hasProcessedState = useRef(false);
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  useEffect(() => {
    fetchConversations();
    if (location.state?.prompt && !hasProcessedState.current) {
      hasProcessedState.current = true;
      handleSend(location.state.prompt);
    }
  }, [location.state]);

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/ai/conversations`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();
      if (Array.isArray(data)) setConversations(data);
    } catch (err) {
      console.error("Failed to fetch history:", err);
    }
  };

  const handleSelectConversation = async (id) => {
    try {
      setLoading(true);
      setSidebarOpen(false);
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/ai/conversations/${id}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      const data = await res.json();

      const syncedMessages = (data.messages?.body || []).map((m, i) => ({
        id: `sync-${i}`,
        role: m.role,
        text: m.content,
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
      }));
      setMessages(syncedMessages.length > 0 ? syncedMessages : initialMessages);
      setConversationId(id);
    } catch (err) {
      console.error("Failed to load conversation:", err);
    } finally {
      setLoading(false);
    }
  };

  const handleNewChat = () => {
    setMessages(initialMessages);
    setConversationId(null);
    setSidebarOpen(false);
    setSelectedTool(null);
  };

  const handleDeleteConversation = async (e, id) => {
    e.stopPropagation();
    if (!window.confirm("Supprimer cette discussion ?")) return;
    try {
      const token = localStorage.getItem('bac_token');
      await fetch(`${API_BASE_URL}/ai/conversations/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      setConversations(prev => prev.filter(c => c.id !== id));
      if (conversationId === id) handleNewChat();
    } catch (err) {
      console.error("Failed to delete:", err);
    }
  };

  // Tools popup state
  const [showTools, setShowTools] = useState(false);
  const [selectedTool, setSelectedTool] = useState(null);

  const [isMobile, setIsMobile] = useState(window.innerWidth <= 768);
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth <= 768);
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const handleSend = async (text) => {
    const msg = text !== undefined ? text : input;
    if (!msg.trim() || loading) return;
    const now = new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });

    const userMsg = { id: Date.now(), role: 'user', text: msg, time: now, tool: selectedTool };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);
    const toolToUse = selectedTool;
    setSelectedTool(null); // Clear after send

    try {
      const token = localStorage.getItem('bac_token');
      const res = await fetch(`${API_BASE_URL}/ai/chat`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${token}` },
        body: JSON.stringify({
          message: msg,
          tool: toolToUse,
          conversation_id: conversationId
        })
      });
      const data = await res.json();

      if (data.error) throw new Error(data.error);

      if (data.conversation_id && !conversationId) {
        setConversationId(data.conversation_id);
        fetchConversations(); // Refresh list on first message of a new chat
      }

      const replyText = data.reply || 'Je n\'ai pas pu générer de réponse.';
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        text: replyText,
      }]);
    } catch (err) {
      console.error("AI Chat error:", err);
      setMessages(prev => [...prev, {
        id: Date.now() + 1,
        role: 'assistant',
        time: new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }),
        text: `❌ Erreur: ${err.message || 'La connexion a échoué. Réessayez.'}`,
      }]);
    } finally {
      setLoading(false);
    }
  };

  const clearChatLocal = () => {
    if (window.confirm('Voulez-vous effacer toute la conversation ?')) {
      handleNewChat();
    }
  };

  const toolOptions = [
    { id: 'exam', label: 'Analyser un examen', icon: FileText, color: '#6366f1' },
    { id: 'lesson', label: 'Étudier une leçon', icon: BookOpen, color: '#10b981' },
    { id: 'exercise', label: 'Aide exercice PDF', icon: Zap, color: '#f59e0b' },
  ];

  return (
    <div className="assistant-page-container" style={{
      display: 'flex',
      height: isMobile ? 'calc(100dvh - 80px)' : 'calc(100dvh - 120px)',
      width: '100%',
      maxWidth: isMobile ? '100dvw' : '1200px',
      margin: '0 auto',
      position: 'relative',
      overflow: 'hidden'
    }}>
      {/* Sidebar Overlay (Mobile) */}
      <AnimatePresence>
        {sidebarOpen && isMobile && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={() => setSidebarOpen(false)}
            style={{
              position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.3)',
              backdropFilter: 'blur(4px)', zIndex: 1000
            }}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <motion.div
        initial={isMobile ? { x: '-100%' } : { width: 0, opacity: 0 }}
        animate={isMobile ? { x: sidebarOpen ? 0 : '-100%' } : { width: sidebarOpen ? 280 : 0, opacity: sidebarOpen ? 1 : 0 }}
        transition={{ type: 'spring', damping: 25, stiffness: 200 }}
        style={{
          position: isMobile ? 'fixed' : 'relative',
          top: 0, left: 0, bottom: 0,
          background: 'white',
          borderRight: '1px solid var(--border-soft)',
          zIndex: 1001,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          boxShadow: isMobile ? '20px 0 50px rgba(0,0,0,0.1)' : 'none'
        }}
      >
        <div style={{ padding: '1.25rem', borderBottom: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 800 }}>Historique</h2>
          <button
            onClick={() => setSidebarOpen(false)}
            className="btn btn-icon"
            style={{
              display: isMobile ? 'flex' : 'none',
              width: 40, height: 40, borderRadius: '50%', background: 'var(--bg-glass-white)',
              border: '1px solid var(--border-soft)'
            }}
          >
            <X size={22} color="var(--text-primary)" />
          </button>
        </div>

        <div style={{ padding: '1rem' }}>
          <button
            onClick={handleNewChat}
            className="btn btn-primary w-100"
            style={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '0.5rem',
              borderRadius: '12px',
              padding: isMobile ? '1rem' : '0.75rem',
              fontSize: isMobile ? '0.95rem' : '0.85rem'
            }}
          >
            <Plus size={isMobile ? 22 : 18} /> Nouvelle discussion
          </button>
        </div>

        <div style={{ flex: 1, overflowY: 'auto', padding: '0 0.75rem' }}>
          <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0.5rem', textTransform: 'uppercase' }}>Discussions récentes</div>
          {conversations.map(c => (
            <div
              key={c.id}
              onClick={() => handleSelectConversation(c.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: '0.75rem', padding: '0.75rem',
                borderRadius: '10px', cursor: 'pointer', marginBottom: '0.25rem',
                background: conversationId === c.id ? 'var(--primary-light)' : 'transparent',
                transition: '0.2s', position: 'relative'
              }}
              onMouseOver={e => conversationId !== c.id && (e.currentTarget.style.background = '#f1f5f9')}
              onMouseOut={e => conversationId !== c.id && (e.currentTarget.style.background = 'transparent')}
            >
              <MessageSquare size={16} color={conversationId === c.id ? 'var(--primary)' : 'var(--text-muted)'} />
              <div style={{ flex: 1, overflow: 'hidden' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-primary)', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                  {c.title || 'Discussion'}
                </div>
                <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                  <Clock size={10} /> {new Date(c.updated_at).toLocaleDateString()}
                </div>
              </div>
              <button
                className="delete-hover-btn"
                onClick={(e) => handleDeleteConversation(e, c.id)}
                style={{
                  padding: isMobile ? '8px' : '4px',
                  background: isMobile ? 'rgba(239, 68, 68, 0.08)' : 'transparent',
                  border: 'none',
                  color: '#ef4444',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  transition: '0.2s',
                  marginLeft: '0.5rem'
                }}
              >
                <Trash2 size={isMobile ? 18 : 14} />
              </button>
            </div>
          ))}
        </div>
      </motion.div>

      {/* Main Chat Area */}
      <div style={{
        flex: 1,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        minWidth: 0 // Crucial for flexbox truncation
      }}>
        {/* Header */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: isMobile ? '0.75rem 1rem' : '0.5rem 1rem',
          flexShrink: 0,
          background: 'white',
          borderBottom: isMobile ? '1px solid var(--border-soft)' : 'none',
          boxShadow: isMobile ? '0 1px 2px rgba(0,0,0,0.05)' : 'none'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="btn btn-icon"
              style={{
                width: isMobile ? 42 : 40, height: isMobile ? 42 : 40, borderRadius: 'var(--r-md)',
                background: 'linear-gradient(135deg, #6366f1, #a855f7)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                boxShadow: '0 4px 12px -2px rgba(99, 102, 241, 0.3)',
                border: 'none', cursor: 'pointer', transition: '0.2s', flexShrink: 0
              }}
            >
              <Sparkles size={isMobile ? 22 : 20} color="white" />
            </button>

            <div>
              <h1 style={{ fontSize: isMobile ? '1rem' : '1.2rem', fontWeight: 900, letterSpacing: '-0.02em', color: 'var(--text-primary)' }}>Assistant Bac Pro</h1>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
                <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#22c55e' }} />
                <span style={{ fontSize: '0.7rem', color: 'var(--text-muted)', fontWeight: 600 }}>Tuteur Llama</span>
              </div>
            </div>
          </div>

          <div style={{ width: 42 }}>{/* Spacer to center title if needed */}</div>
        </div>

        {/* Chat Container */}
        <div className={isMobile ? "" : "card"} style={{
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          padding: 0,
          background: isMobile ? 'transparent' : 'rgba(255, 255, 255, 0.7)',
          backdropFilter: isMobile ? 'none' : 'blur(20px)',
          border: isMobile ? 'none' : '1px solid var(--border-soft)',
          boxShadow: isMobile ? 'none' : '0 10px 30px -15px rgba(0,0,0,0.1)'
        }}>

          {/* Messages area */}
          <div style={{
            flex: 1,
            overflowY: 'auto',
            padding: '1.25rem 1rem', // Smaller padding for mobile
            display: 'flex',
            flexDirection: 'column',
            gap: '1.25rem'
          }}>
            <AnimatePresence initial={false}>
              {messages.filter(msg => msg.role !== 'system').map((msg, idx) => (
                <motion.div
                  key={msg.id}
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  transition={{ duration: 0.3 }}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                    width: '100%'
                  }}
                >
                  <div style={{
                    display: 'flex',
                    gap: '0.5rem',
                    maxWidth: '92%', // Use more width on small screens
                    flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                  }}>
                    {/* Avatar (hide on small screens maybe, but for now just smaller) */}
                    <div style={{
                      width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
                      background: msg.role === 'user' ? 'var(--primary)' : 'var(--bg-glass-white)',
                      border: '1px solid var(--border-soft)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      fontSize: '0.7rem', fontWeight: 800, color: msg.role === 'user' ? 'white' : 'var(--primary)'
                    }}>
                      {msg.role === 'user' ? 'U' : <Sparkles size={12} />}
                    </div>

                    {/* Content */}
                    <div style={{
                      padding: '0.75rem 1rem',
                      borderRadius: msg.role === 'user' ? '1rem 0.25rem 1rem 1rem' : '0.25rem 1rem 1rem 1rem',
                      background: msg.role === 'user' ? 'var(--primary)' : 'white',
                      color: msg.role === 'user' ? 'white' : 'var(--text-primary)',
                      boxShadow: msg.role === 'user' ? '0 4px 12px -2px rgba(var(--primary-rgb), 0.2)' : '0 1px 2px rgba(0,0,0,0.05)',
                      fontSize: '0.9rem',
                      lineHeight: 1.6,
                      border: msg.role === 'user' ? 'none' : '1px solid var(--border-soft)',
                      wordBreak: 'break-word',
                      overflowX: 'auto'
                    }}>
                      <MarkdownContent content={msg.text} isUser={msg.role === 'user'} />
                      {msg.tool && <div style={{ fontSize: '0.7rem', opacity: 0.8, marginTop: '0.5rem', fontStyle: 'italic' }}>🔍 Analysé avec l'outil {toolOptions.find(t => t.id === msg.tool)?.label}</div>}
                    </div>
                  </div>
                  <span style={{
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    marginTop: '0.3rem',
                    marginInline: '2.5rem'
                  }}>
                    {msg.time}
                  </span>
                </motion.div>
              ))}
            </AnimatePresence>

            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                style={{ display: 'flex', gap: '0.5rem', flexDirection: 'column' }}
              >
                <div style={{ display: 'flex', gap: '0.5rem' }}>
                  <div style={{ width: 28, height: 28, borderRadius: '8px', background: 'var(--bg-glass-white)', border: '1px solid var(--border-soft)', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <Sparkles size={12} color="var(--primary)" />
                  </div>
                  <div style={{ padding: '0.75rem', borderRadius: '0.25rem 1rem 1rem 1rem', background: 'white', border: '1px solid var(--border-soft)', display: 'flex', gap: '3px' }}>
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.2 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
                    <motion.div animate={{ opacity: [0.4, 1, 0.4] }} transition={{ repeat: Infinity, duration: 1.2, delay: 0.4 }} style={{ width: 5, height: 5, borderRadius: '50%', background: 'var(--primary)' }} />
                  </div>
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginLeft: '2.5rem', fontWeight: 600 }}>
                  L'IA analyse le document (cela peut prendre un moment)...
                </div>
              </motion.div>
            )}
            <div ref={bottomRef} />
          </div>

          {/* Input area */}
          <div style={{
            padding: '1rem',
            background: 'white',
            borderTop: '1px solid var(--border-soft)'
          }}>
            {/* Quick suggestions above input - now horizontally scrollable */}
            <div style={{
              display: 'flex',
              gap: '0.4rem',
              marginBottom: '0.75rem',
              overflowX: 'auto',
              paddingBottom: '0.5rem',
              msOverflowStyle: 'none',
              scrollbarWidth: 'none',
              WebkitOverflowScrolling: 'touch'
            }}>
              {quickSuggestions.map((s, i) => {
                const Icon = s.icon;
                return (
                  <button
                    key={i}
                    className="btn btn-sm"
                    onClick={() => handleSend(s.label)}
                    style={{
                      whiteSpace: 'nowrap',
                      fontSize: '0.7rem',
                      background: 'var(--bg-glass-white)',
                      border: '1px solid var(--border-soft)',
                      borderRadius: '8px',
                      padding: '0.3rem 0.6rem',
                      flexShrink: 0
                    }}
                  >
                    <Icon size={11} style={{ color: 'var(--primary)' }} />
                    {s.label}
                  </button>
                );
              })}
            </div>

            <form
              onSubmit={(e) => { e.preventDefault(); handleSend(); }}
              style={{ position: 'relative', display: 'flex', gap: '0.5rem', alignItems: 'center' }}
            >
              {/* Tools Button */}
              <div style={{ position: 'relative' }}>
                <button
                  type="button"
                  onClick={() => setShowTools(!showTools)}
                  className={`btn btn-icon ${selectedTool ? 'btn-primary' : 'btn-glass'}`}
                  style={{ width: 42, height: 42, borderRadius: 'var(--r-md)', border: '1px solid var(--border-soft)' }}
                >
                  <Zap size={18} fill={selectedTool ? 'white' : 'transparent'} />
                </button>

                <AnimatePresence>
                  {showTools && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.9 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.9 }}
                      style={{
                        position: 'absolute', bottom: '120%', left: 0, width: 220,
                        background: 'white', borderRadius: '12px', padding: '0.5rem',
                        boxShadow: '0 10px 25px -5px rgba(0,0,0,0.1)',
                        border: '1px solid var(--border-soft)', zIndex: 100
                      }}
                    >
                      <div style={{ fontSize: '0.7rem', fontWeight: 800, color: 'var(--text-muted)', padding: '0.4rem 0.6rem', textTransform: 'uppercase' }}>Outils IA</div>
                      {toolOptions.map(t => (
                        <button
                          key={t.id}
                          type="button"
                          onClick={() => { setSelectedTool(t.id); setShowTools(false); }}
                          style={{
                            width: '100%', display: 'flex', alignItems: 'center', gap: '0.75rem',
                            padding: '0.6rem', borderRadius: '8px', border: 'none', background: 'transparent',
                            cursor: 'pointer', textAlign: 'left', transition: '0.2s'
                          }}
                          onMouseOver={e => e.currentTarget.style.background = '#f8fafc'}
                          onMouseOut={e => e.currentTarget.style.background = 'transparent'}
                        >
                          <div style={{ width: 30, height: 30, borderRadius: '6px', background: `${t.color}20`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <t.icon size={14} color={t.color} />
                          </div>
                          <span style={{ fontSize: '0.8rem', fontWeight: 600, color: 'var(--text-primary)' }}>{t.label}</span>
                        </button>
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              <div style={{ flex: 1, position: 'relative' }}>
                {selectedTool && (
                  <div style={{ position: 'absolute', left: 10, top: -18, fontSize: '0.6rem', fontWeight: 800, color: 'var(--primary)', background: 'white', padding: '0 4px' }}>
                    MODE : {toolOptions.find(o => o.id === selectedTool)?.label.toUpperCase()}
                  </div>
                )}
                <input
                  style={{
                    width: '100%',
                    padding: '0.75rem 1rem',
                    borderRadius: '1rem',
                    border: `1px solid ${selectedTool ? 'var(--primary)' : 'var(--border-soft)'}`,
                    background: 'var(--bg-glass-white)',
                    fontSize: '0.9rem',
                    outline: 'none',
                    transition: '0.2s',
                    minWidth: 0
                  }}
                  onFocus={(e) => e.target.style.borderColor = 'var(--primary)'}
                  onBlur={(e) => e.target.style.borderColor = selectedTool ? 'var(--primary)' : 'var(--border-soft)'}
                  type="text"
                  value={input}
                  onChange={e => setInput(e.target.value)}
                  placeholder="Question..."
                />
              </div>
              <button
                type="submit"
                className="btn btn-primary btn-icon"
                disabled={!input.trim() || loading}
                style={{ width: 42, height: 42, borderRadius: '50%', flexShrink: 0 }}
              >
                <Send size={16} />
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: '0.5rem', fontSize: '0.65rem', color: 'var(--text-muted)' }}>
              L'IA peut faire des erreurs.
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
