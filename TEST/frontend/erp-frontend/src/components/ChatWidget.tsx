import React, {
  useCallback,
  useEffect,
  useRef,
  useState,
  useMemo,
} from 'react';
import {
  MessageCircle,
  X,
  Send,
  Paperclip,
  FileText,
  Download,
  Loader2,
  ChevronDown,
  Users,
  Maximize2,
  Minimize2,
  MoreVertical,
  Edit3,
  Trash2,
  Check,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import {
  fetchMessages,
  uploadChatFile,
  buildWsUrl,
  chatFileUrl,
  updateMessage,
  deleteMessage,
  ChatMessage,
} from '../api/chat';

// ─── helpers ──────────────────────────────────────────────────────────────────

function formatTime(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function formatDate(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString([], { day: 'numeric', month: 'short', year: 'numeric' });
}

function getInitials(name: string) {
  return name
    .split(' ')
    .slice(0, 2)
    .map((n) => n[0])
    .join('')
    .toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'from-orange-400 to-rose-500',
    'from-violet-500 to-purple-600',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
    'from-amber-400 to-orange-500',
    'from-pink-400 to-rose-500',
    'from-indigo-400 to-violet-500',
    'from-cyan-400 to-sky-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

// ─── Message bubble sub-components ────────────────────────────────────────────

interface BubbleProps {
  msg: ChatMessage;
  isMine: boolean;
  showAvatar: boolean;
  onEdit: (id: string, text: string) => void;
  onDelete: (id: string) => void;
}

const FileBadge: React.FC<{ msg: ChatMessage; isMine: boolean }> = ({ msg, isMine }) => {
  if (!msg.file_url) return null;
  const url = chatFileUrl(msg.file_url);

  if (msg.file_type === 'image') {
    return (
      <div className="block mt-2 group/img relative max-w-full overflow-hidden rounded-xl border border-black/5 shadow-sm">
        <img
          src={url}
          alt={msg.file_name || 'image'}
          className="w-full max-h-[300px] object-cover hover:scale-[1.02] transition-transform duration-300"
        />
        <a 
          href={url} 
          target="_blank" 
          rel="noreferrer"
          className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity"
        >
          <span className="bg-white/90 text-neutral-800 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg border border-white/20 uppercase tracking-widest">View Full Size</span>
        </a>
      </div>
    );
  }
  
  if (msg.file_type === 'video') {
    return (
      <video
        src={url}
        controls
        className="max-w-full max-h-[250px] rounded-xl shadow-sm border border-black/5 mt-2 overflow-hidden bg-black"
      />
    );
  }
  
  return (
    <a
      href={url}
      download={msg.file_name}
      className={`flex items-center gap-3 mt-2 px-4 py-3 rounded-xl transition-all text-sm border ${
        isMine
          ? 'bg-white/10 hover:bg-white/20 border-white/10 text-white'
          : 'bg-neutral-50 hover:bg-neutral-100 border-neutral-200/50 text-neutral-700'
      }`}
    >
      <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${isMine ? 'bg-white/20' : 'bg-orange-50 text-orange-600'}`}>
        <FileText size={20} className="shrink-0" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="truncate font-bold text-xs">{msg.file_name || 'Download file'}</p>
        <p className={`text-[10px] uppercase tracking-widest mt-0.5 ${isMine ? 'text-white/60' : 'text-neutral-400'}`}>Institutional Doc</p>
      </div>
      <Download size={16} className={`shrink-0 ml-auto ${isMine ? 'opacity-80' : 'text-neutral-400'}`} />
    </a>
  );
};

const MessageBubble: React.FC<BubbleProps> = ({ msg, isMine, showAvatar, onEdit, onDelete }) => {
  const [isEditing, setIsEditing] = useState(false);
  const [editValue, setEditValue] = useState(msg.message || '');
  const [showActions, setShowActions] = useState(false);
  const actionRef = useRef<HTMLDivElement>(null);

  const gradient = getAvatarColor(msg.sender_name);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (actionRef.current && !actionRef.current.contains(e.target as Node)) {
        setShowActions(false);
      }
    };
    if (showActions) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showActions]);

  const handleEditSubmit = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== msg.message) {
      onEdit(msg.id, trimmed);
    }
    setIsEditing(false);
  };

  return (
    <div className={`flex items-end gap-3 ${isMine ? 'flex-row-reverse' : 'flex-row'} group/bubble relative`}>
      {/* Avatar */}
      {!isMine ? (
        <div
          className={`w-8 h-8 rounded-full bg-gradient-to-br ${gradient} flex items-center justify-center text-[10px] font-black text-white shadow-md border-2 border-white shrink-0 mb-1 transition-opacity duration-300 ${showAvatar ? 'opacity-100' : 'opacity-0'}`}
        >
          {getInitials(msg.sender_name)}
        </div>
      ) : (
        <div className="w-8 shrink-0" />
      )}

      {/* Bubble Container */}
      <div className={`max-w-[80%] flex flex-col ${isMine ? 'items-end' : 'items-start'} group`}>
        {showAvatar && !isMine && (
          <span className="text-[10px] font-black text-neutral-400 mb-1.5 ml-2 uppercase tracking-[0.1em]">
            {msg.sender_name}
          </span>
        )}
        
        <div className="relative group/content flex items-center gap-2">
          {/* Action Menu (Mine only) */}
          {isMine && !isEditing && (
            <div className="relative" ref={actionRef}>
              <button 
                onClick={() => setShowActions(!showActions)}
                className="opacity-0 group-hover/bubble:opacity-100 p-1.5 hover:bg-neutral-100 rounded-lg text-neutral-400 transition-all active:scale-90"
              >
                <MoreVertical size={14} />
              </button>
              
              {showActions && (
                <div className="absolute right-0 bottom-full mb-2 bg-white rounded-xl shadow-2xl border border-neutral-100 py-1.5 min-w-[120px] z-20 animate-in fade-in slide-in-from-bottom-2 duration-200">
                  <button 
                    onClick={() => { setIsEditing(true); setShowActions(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-neutral-600 hover:bg-neutral-50 flex items-center gap-2 transition-colors"
                  >
                    <Edit3 size={12} /> Edit
                  </button>
                  <button 
                    onClick={() => { onDelete(msg.id); setShowActions(false); }}
                    className="w-full text-left px-4 py-2 text-xs font-bold text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
                  >
                    <Trash2 size={12} /> Delete
                  </button>
                </div>
              )}
            </div>
          )}

          <div
            className={`px-4 py-3 rounded-2xl text-[13.5px] leading-relaxed shadow-sm transition-all duration-300 ${
              isMine
                ? 'bg-gradient-to-br from-orange-500 to-orange-600 text-white rounded-br-sm shadow-orange-500/10'
                : 'bg-white text-neutral-800 border border-neutral-200/50 rounded-bl-sm shadow-neutral-200/10'
            }`}
          >
            {isEditing ? (
              <div className="flex flex-col gap-2 min-w-[200px]">
                <textarea
                  autoFocus
                  value={editValue}
                  onChange={(e) => setEditValue(e.target.value)}
                  className="bg-white/10 text-white border-white/20 rounded-lg p-2 text-sm outline-none w-full resize-none min-h-[60px]"
                />
                <div className="flex justify-end gap-2">
                  <button onClick={() => setIsEditing(false)} className="text-[10px] font-black uppercase text-white/70 hover:text-white">Cancel</button>
                  <button onClick={handleEditSubmit} className="bg-white text-orange-600 px-3 py-1 rounded-lg text-[10px] font-black uppercase shadow-lg">Save</button>
                </div>
              </div>
            ) : (
              <>
                {msg.message && <p className="whitespace-pre-wrap break-words">{msg.message}</p>}
                <FileBadge msg={msg} isMine={isMine} />
                <div className={`flex items-center gap-2 mt-2 justify-end ${isMine ? 'text-white/60' : 'text-neutral-400'}`}>
                  {msg.updated_at && (
                    <span className="text-[9px] font-black uppercase tracking-widest italic opacity-80">Edited</span>
                  )}
                  <span className="text-[10px] font-black uppercase tracking-tighter">
                    {formatTime(msg.created_at)}
                  </span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Date divider ──────────────────────────────────────────────────────────────

const DateDivider: React.FC<{ label: string }> = ({ label }) => (
  <div className="flex items-center gap-4 my-8">
    <div className="flex-1 h-px bg-neutral-100" />
    <span className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em] px-2">{label}</span>
    <div className="flex-1 h-px bg-neutral-100" />
  </div>
);

// ─── Unread count badge ────────────────────────────────────────────────────────

const UnreadBadge: React.FC<{ count: number }> = ({ count }) =>
  count > 0 ? (
    <span className="absolute -top-1.5 -right-1.5 min-w-[20px] h-[20px] rounded-full bg-red-500 text-white text-[10px] font-black flex items-center justify-center px-1 shadow-lg border-2 border-white animate-bounce">
      {count > 99 ? '99+' : count}
    </span>
  ) : null;

// ─── Main ChatWidget ───────────────────────────────────────────────────────────

const ChatWidget: React.FC = () => {
  const { user } = useAuth();
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [unread, setUnread] = useState(0);
  const [showScrollBtn, setShowScrollBtn] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const isAtBottomRef = useRef(true);

  // ── Load history ──
  useEffect(() => {
    if (!user) return;
    fetchMessages(100)
      .then(setMessages)
      .catch(() => {/* silent fail */});
  }, [user]);

  // ── WebSocket ──
  useEffect(() => {
    if (!user) return;

    const token = localStorage.getItem('erp_token');
    if (!token) return;

    const ws = new WebSocket(buildWsUrl());
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onerror = () => setWsConnected(false);

    ws.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data);
        if (raw.error) return;

        const { type, data } = raw;

        if (type === 'new') {
          setMessages((prev) => {
            if (prev.some((m) => m.id === data.id)) return prev;
            return [...prev, data];
          });
          if (!open || !isAtBottomRef.current) {
            setUnread((n) => n + 1);
          }
        } else if (type === 'edit') {
          setMessages((prev) => prev.map(m => m.id === data.id ? { ...m, ...data } : m));
        } else if (type === 'delete') {
          setMessages((prev) => prev.filter(m => m.id !== data.id));
        }
      } catch {/* ignore */}
    };

    return () => ws.close();
  }, [user, open]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (isAtBottomRef.current) {
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 50);
    }
  }, [messages]);

  // ── Reset unread when opening ──
  useEffect(() => {
    if (open) {
      setUnread(0);
      setTimeout(() => bottomRef.current?.scrollIntoView({ behavior: 'smooth' }), 100);
    }
  }, [open]);

  // ── Scroll detection ──
  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    const atBottom = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
    isAtBottomRef.current = atBottom;
    setShowScrollBtn(!atBottom);
  };

  const scrollToBottom = () => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    setShowScrollBtn(false);
    setUnread(0);
  };

  // ── Message CRUD ──
  const sendMessage = (text: string, fileUrl?: string, fileType?: string, fileName?: string) => {
    const token = localStorage.getItem('erp_token');
    if (!token || !wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) return;
    wsRef.current.send(
      JSON.stringify({ token, message: text, file_url: fileUrl, file_type: fileType, file_name: fileName })
    );
  };

  const handleEdit = async (id: string, text: string) => {
    try {
      await updateMessage(id, text);
    } catch (err) {
      alert("Failed to edit message.");
    }
  };

  const handleDelete = async (id: string) => {
    if (!window.confirm("Delete this message?")) return;
    try {
      await deleteMessage(id);
    } catch (err) {
      alert("Failed to delete message.");
    }
  };

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    sendMessage(text);
    setInput('');
    if (inputRef.current) {
        inputRef.current.style.height = 'auto';
        inputRef.current.focus();
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    e.target.value = '';
    setUploading(true);
    try {
      const result = await uploadChatFile(file);
      sendMessage('', result.file_url, result.file_type, result.file_name);
    } catch (err: any) {
      alert(err?.response?.data?.detail || 'File upload failed.');
    } finally {
      setUploading(false);
    }
  };

  // ── Group messages ──
  const grouped = useMemo(() => {
    const res: any[] = [];
    let lastDate = '';
    let lastSndId = '';

    messages.forEach((msg) => {
      const dLabel = formatDate(msg.created_at);
      if (dLabel !== lastDate) {
        res.push({ type: 'date', label: dLabel });
        lastDate = dLabel;
        lastSndId = '';
      }
      const showAvatar = msg.sender_id !== lastSndId;
      res.push({
        type: 'msg',
        msg,
        isMine: msg.sender_id === user?.id,
        showAvatar,
      });
      lastSndId = msg.sender_id;
    });
    return res;
  }, [messages, user]);

  if (!user) return null;

  return (
    <>
      {/* ── Trigger Button ── */}
      {!open && (
        <button
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-[60] w-16 h-16 rounded-full bg-gradient-to-br from-orange-500 to-orange-600 shadow-2xl flex items-center justify-center text-white hover:scale-110 active:scale-95 transition-all duration-300 group"
        >
          <MessageCircle size={28} className="group-hover:rotate-12 transition-transform" />
          <UnreadBadge count={unread} />
        </button>
      )}

      {/* ── Chat Container ── */}
      <div 
        className={`fixed z-[60] flex flex-col bg-white transition-all duration-500 ease-out border-neutral-100 ${
          open 
            ? isExpanded 
              ? 'top-0 right-0 w-[420px] h-full shadow-[-20px_0_60px_rgba(0,0,0,0.08)]' 
              : 'bottom-24 right-6 w-[380px] h-[650px] max-h-[80vh] rounded-[40px] shadow-[0_25px_80px_rgba(0,0,0,0.15)] border' 
            : 'bottom-24 right-6 w-[380px] h-[0px] opacity-0 pointer-events-none overflow-hidden'
        }`}
      >
        {/* Header */}
        <div className={`px-6 py-5 flex items-center justify-between border-b border-neutral-50 ${isExpanded ? 'mt-4' : ''}`}>
          <div className="flex items-center gap-3">
             <div className="w-10 h-10 bg-orange-50 rounded-2xl flex items-center justify-center text-orange-600">
                <MessageCircle size={22} />
             </div>
             <div>
                <h3 className="text-lg font-black text-neutral-900 tracking-tight">Company Chat</h3>
                <div className="flex items-center gap-1.5">
                   <div className={`w-1.5 h-1.5 rounded-full ${wsConnected ? 'bg-green-500 shadow-[0_0_8px_#22c55e]' : 'bg-red-500'} animate-pulse`} />
                   <span className="text-[10px] font-black uppercase text-neutral-400 tracking-widest">{wsConnected ? 'Real-time Active' : 'Connecting...'}</span>
                </div>
             </div>
          </div>
          <div className="flex items-center gap-1">
             <button
               onClick={() => setIsExpanded(!isExpanded)}
               className="p-2.5 rounded-xl hover:bg-neutral-50 text-neutral-400 hover:text-neutral-900 transition-all"
               title={isExpanded ? "Collapse to widget" : "Expand to sidebar"}
             >
               {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
             </button>
             <button
               onClick={() => setOpen(false)}
               className="p-2.5 rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all"
             >
               <X size={18} />
             </button>
          </div>
        </div>

        {/* 7-Day Retention Banner */}
        <div className="flex items-center gap-2 px-5 py-2 bg-orange-50/60 border-b border-orange-100/70">
          <div className="w-1.5 h-1.5 rounded-full bg-orange-400 shrink-0" />
          <p className="text-[10px] font-black uppercase tracking-[0.14em] text-orange-500/90">
            Messages are retained for 7 days
          </p>
        </div>

        {/* Messaging Logic Panel */}
        <div 
          ref={messagesRef}
          onScroll={handleScroll}
          className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-neutral-50/30 scroll-smooth"
        >
          {grouped.length === 0 ? (
            <div className="h-full flex flex-col items-center justify-center text-center px-10">
               <div className="w-20 h-20 bg-white rounded-[32px] border border-neutral-100 shadow-sm flex items-center justify-center mb-6">
                  <span className="text-3xl">👋</span>
               </div>
               <h4 className="text-neutral-900 font-black tracking-tight">Welcome to Chat</h4>
               <p className="text-neutral-400 text-xs mt-2 leading-relaxed">Connect and collaborate with your team in real-time.</p>
            </div>
          ) : (
            grouped.map((item, idx) => 
               item.type === 'date' ? (
                 <DateDivider key={`date-${idx}`} label={item.label} />
               ) : (
                 <MessageBubble 
                   key={item.msg.id}
                   msg={item.msg}
                   isMine={item.isMine}
                   showAvatar={item.showAvatar}
                   onEdit={handleEdit}
                   onDelete={handleDelete}
                 />
               )
            )
          )}
          <div ref={bottomRef} />
        </div>

        {/* Scroll To Bottom Fab */}
        {showScrollBtn && (
          <button 
            onClick={scrollToBottom}
            className="absolute bottom-28 right-8 w-10 h-10 bg-white border border-neutral-100 shadow-xl rounded-2xl flex items-center justify-center text-orange-500 hover:scale-110 active:scale-95 transition-all z-20"
          >
            <ChevronDown size={20} strokeWidth={3} />
            {unread > 0 && <span className="absolute -top-1 -right-1 w-5 h-5 bg-orange-600 text-white text-[9px] font-black rounded-full flex items-center justify-center border-2 border-white">{unread}</span>}
          </button>
        )}

        {/* Input Dock */}
        <div className="px-6 py-5 border-t border-neutral-50 bg-white shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
          <div className="relative flex items-end gap-3">
             <input 
               ref={fileInputRef}
               type="file"
               className="hidden"
               onChange={handleFileChange}
             />
             <button 
               onClick={() => fileInputRef.current?.click()}
               disabled={uploading}
               className="w-11 h-11 bg-neutral-50 hover:bg-orange-50 text-neutral-400 hover:text-orange-600 rounded-xl flex items-center justify-center transition-all border border-neutral-100 active:scale-90 disabled:opacity-50"
             >
                {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
             </button>
             
             <div className="flex-1 relative">
                <textarea 
                  ref={inputRef}
                  placeholder="Draft your message..."
                  className="w-full bg-neutral-50 border border-neutral-100 rounded-[20px] px-5 py-3.5 pr-14 text-sm font-medium focus:outline-none focus:ring-4 focus:ring-orange-500/10 focus:border-orange-500 transition-all resize-none max-h-[140px] leading-relaxed"
                  rows={1}
                  value={input}
                  onChange={(e) => {
                    setInput(e.target.value);
                    e.target.style.height = 'auto';
                    e.target.style.height = Math.min(e.target.scrollHeight, 140) + 'px';
                  }}
                  onKeyDown={handleKeyDown}
                />
                <button 
                  onClick={handleSend}
                  disabled={!input.trim() || uploading}
                  className="absolute right-2 bottom-2 w-9 h-9 bg-orange-500 text-white rounded-lg flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-90 transition-all disabled:opacity-40 disabled:scale-95"
                >
                   <Send size={16} />
                </button>
             </div>
          </div>
          <p className="text-[9px] font-bold text-neutral-300 uppercase tracking-[0.2em] mt-3 text-center">Professional Team Collaboration</p>
        </div>
      </div>
    </>
  );
};

export default ChatWidget;
