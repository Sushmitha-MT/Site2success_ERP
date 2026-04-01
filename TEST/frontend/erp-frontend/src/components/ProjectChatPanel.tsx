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
  Maximize2,
  Minimize2,
  Image as ImageIcon,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { projectsApi } from '../api/projects';
import toast from 'react-hot-toast';

// ─── types ────────────────────────────────────────────────────────────────────

interface ProjectMessage {
  id: string;
  sender_id: string;
  sender_name: string;
  message: string | null;
  file_url: string | null;
  file_type: string | null;
  file_name: string | null;
  created_at: string;
}

interface ProjectChatPanelProps {
  projectId: string;
  projectName: string;
  isOpen: boolean;
  onClose: () => void;
}

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
  return name.split(' ').slice(0, 2).map(n => n[0]).join('').toUpperCase();
}

function getAvatarColor(name: string) {
  const colors = [
    'from-orange-400 to-rose-500',
    'from-violet-500 to-purple-600',
    'from-emerald-400 to-teal-500',
    'from-sky-400 to-blue-500',
  ];
  let hash = 0;
  for (let i = 0; i < name.length; i++) hash = name.charCodeAt(i) + ((hash << 5) - hash);
  return colors[Math.abs(hash) % colors.length];
}

const FileBadge: React.FC<{ msg: ProjectMessage; isMine: boolean }> = ({ msg, isMine }) => {
  if (!msg.file_url) return null;
  const url = msg.file_url; // Backend returns full relative path like /api/v1/...

  if (msg.file_type === 'image') {
    return (
      <div className="block mt-2 group/img relative max-w-full overflow-hidden rounded-xl border border-black/5 shadow-sm">
        <img src={url} alt={msg.file_name || ''} className="w-full h-auto max-h-[300px] object-cover" />
        <a href={url} target="_blank" rel="noreferrer" className="absolute inset-0 bg-black/5 opacity-0 group-hover/img:opacity-100 flex items-center justify-center transition-opacity">
          <span className="bg-white/90 text-neutral-800 text-[10px] font-black px-3 py-1.5 rounded-full shadow-lg uppercase tracking-widest">View Full Size</span>
        </a>
      </div>
    );
  }
  
  return (
    <a href={url} download={msg.file_name} className={`flex items-center gap-3 mt-2 px-4 py-3 rounded-xl transition-all text-sm border ${isMine ? 'bg-white/10 text-white' : 'bg-neutral-50 text-neutral-700'}`}>
      <FileText size={20} className="shrink-0" />
      <div className="flex-1 min-w-0">
        <p className="truncate font-bold text-xs">{msg.file_name || 'Download file'}</p>
      </div>
      <Download size={16} className="shrink-0 ml-auto" />
    </a>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────

const ProjectChatPanel: React.FC<ProjectChatPanelProps> = ({ projectId, projectName, isOpen, onClose }) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<ProjectMessage[]>([]);
  const [input, setInput] = useState('');
  const [uploading, setUploading] = useState(false);
  const [wsConnected, setWsConnected] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);

  const bottomRef = useRef<HTMLDivElement>(null);
  const messagesRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const isAtBottomRef = useRef(true);

  // ── Load History ──
  useEffect(() => {
    if (!projectId || !isOpen) return;
    projectsApi.getProjectMessages(projectId)
      .then(setMessages)
      .catch((err) => {
        if (err.response?.status === 403) toast.error("Access Denied: Private Channel");
      });
  }, [projectId, isOpen]);

  // ── WebSocket ──
  useEffect(() => {
    if (!projectId || !isOpen || !user) return;

    const token = localStorage.getItem('erp_token');
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.hostname === 'localhost' ? 'localhost:8000' : window.location.host;
    const wsUrl = `${protocol}//${host}/api/v1/project-chat/ws/${projectId}`;

    const ws = new WebSocket(wsUrl);
    wsRef.current = ws;

    ws.onopen = () => setWsConnected(true);
    ws.onclose = () => setWsConnected(false);
    ws.onmessage = (e) => {
      try {
        const raw = JSON.parse(e.data);
        if (raw.error) {
            toast.error(raw.error);
            return;
        }
        if (raw.type === 'message') {
          setMessages(prev => {
            if (prev.find(m => m.id === raw.data.id)) return prev;
            return [...prev, raw.data];
          });
        }
      } catch (err) { /* ignore */ }
    };

    return () => ws.close();
  }, [projectId, isOpen, user]);

  // ── Auto-scroll ──
  useEffect(() => {
    if (isAtBottomRef.current) {
      bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const handleScroll = () => {
    const el = messagesRef.current;
    if (!el) return;
    isAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 100;
  };

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !projectId) return;

    try {
      // Prioritize REST for reliability (WhatsApp-style)
      const res = await projectsApi.sendProjectMessage(projectId, text);
      
      // If WS is not open, we append it manually since we won't get a broadcast
      if (!wsRef.current || wsRef.current.readyState !== WebSocket.OPEN) {
        setMessages(prev => [...prev, res]);
      }
      
      setInput('');
      if (inputRef.current) inputRef.current.style.height = 'auto';
    } catch (err: any) {
      console.error("ProjectChat: send error", err);
      toast.error(err.response?.data?.detail || err.message || "Failed to send");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !projectId) return;
    setUploading(true);
    try {
      const res = await projectsApi.uploadProjectChatFile(projectId, file);
      const token = localStorage.getItem('erp_token');
      if (wsRef.current?.readyState === WebSocket.OPEN) {
        wsRef.current.send(JSON.stringify({ 
          token, 
          message: "", 
          file_url: res.file_url, 
          file_type: res.file_type, 
          file_name: res.file_name 
        }));
      }
    } catch (err: any) {
      toast.error(err.response?.data?.detail || "Upload failed");
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  // ── Group Messages ──
  const groupedMessages = useMemo(() => {
    const res: any[] = [];
    let lastDate = '';
    let lastSenderId = '';

    messages.forEach((msg) => {
      const dLabel = formatDate(msg.created_at);
      if (dLabel !== lastDate) {
        res.push({ type: 'date', label: dLabel });
        lastDate = dLabel;
        lastSenderId = '';
      }
      res.push({ 
        type: 'msg', 
        msg, 
        isMine: msg.sender_id === user?.id,
        showAvatar: msg.sender_id !== lastSenderId
      });
      lastSenderId = msg.sender_id;
    });
    return res;
  }, [messages, user]);

  return (
    <div 
      className={`fixed right-0 top-0 h-full bg-white transition-all duration-500 ease-out z-[60] border-l border-neutral-100 flex flex-col shadow-[-20px_0_60px_rgba(0,0,0,0.08)] ${
        isOpen ? (isExpanded ? 'w-[500px]' : 'w-[400px]') : 'w-0 opacity-0 pointer-events-none'
      }`}
    >
      {/* Header */}
      <div className="px-6 py-8 flex items-center justify-between border-b border-neutral-50 bg-neutral-50/30">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 bg-gradient-to-br from-orange-500 to-orange-600 rounded-2xl flex items-center justify-center text-white shadow-lg shadow-orange-500/20">
            <MessageCircle size={24} />
          </div>
          <div>
            <h3 className="text-lg font-black text-neutral-900 tracking-tight truncate max-w-[200px]">{projectName}</h3>
            <div className="flex items-center gap-1.5 mt-1">
              <div className={`w-2 h-2 rounded-full ${wsConnected ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.4)]' : 'bg-neutral-300'}`} />
              <span className="text-[9px] font-black uppercase text-neutral-400 tracking-widest">{wsConnected ? 'Direct' : 'Restoring sync...'}</span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2">
            <button onClick={() => setIsExpanded(!isExpanded)} className="p-2.5 rounded-xl hover:bg-white text-neutral-400 transition-all">
                {isExpanded ? <Minimize2 size={18} /> : <Maximize2 size={18} />}
            </button>
            <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-red-50 text-neutral-400 hover:text-red-500 transition-all"><X size={20} /></button>
        </div>
      </div>

      {/* Message Area */}
      <div 
        ref={messagesRef}
        onScroll={handleScroll}
        className="flex-1 overflow-y-auto px-6 py-6 space-y-4 bg-neutral-50/30"
      >
        {groupedMessages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center px-10">
            <span className="text-4xl mb-4">🤐</span>
            <h4 className="text-neutral-900 font-black tracking-tight">Project Private Chat</h4>
            <p className="text-neutral-400 text-xs mt-2 leading-relaxed">No messages yet. Start conversation!</p>
          </div>
        ) : (
          groupedMessages.map((item, idx) => (
            item.type === 'date' ? (
              <div key={`date-${idx}`} className="flex items-center gap-4 my-8">
                <div className="flex-1 h-px bg-neutral-100" />
                <span className="text-[10px] text-neutral-400 font-black uppercase tracking-[0.2em]">{item.label}</span>
                <div className="flex-1 h-px bg-neutral-100" />
              </div>
            ) : (
              <div key={item.msg.id} className={`flex items-end gap-3 ${item.isMine ? 'flex-row-reverse' : 'flex-row'}`}>
                {!item.isMine && (
                  <div className={`w-8 h-8 rounded-full bg-gradient-to-br ${getAvatarColor(item.msg.sender_name)} flex items-center justify-center text-[10px] font-black text-white shadow-md border-2 border-white shrink-0 mb-1 ${item.showAvatar ? 'opacity-100' : 'opacity-0'}`}>
                    {getInitials(item.msg.sender_name)}
                  </div>
                )}
                <div className={`max-w-[80%] flex flex-col ${item.isMine ? 'items-end' : 'items-start'}`}>
                  {item.showAvatar && !item.isMine && (
                    <span className="text-[10px] font-black text-neutral-400 mb-1 ml-2 uppercase tracking-widest">{item.msg.sender_name}</span>
                  )}
                  <div className={`px-4 py-3 rounded-2xl text-[13px] shadow-sm leading-relaxed ${item.isMine ? 'bg-orange-500 text-white rounded-br-sm' : 'bg-white text-neutral-800 border border-neutral-100 rounded-bl-sm'}`}>
                    {item.msg.message && <p className="whitespace-pre-wrap">{item.msg.message}</p>}
                    <FileBadge msg={item.msg} isMine={item.isMine} />
                    <p className={`text-[9px] font-bold uppercase mt-2 text-right ${item.isMine ? 'text-white/60' : 'text-neutral-400'}`}>
                      {formatTime(item.msg.created_at)}
                    </p>
                  </div>
                </div>
              </div>
            )
          ))
        )}
        <div ref={bottomRef} />
      </div>

      {/* Input */}
      <div className="p-6 bg-white border-t border-neutral-50 shadow-[0_-10px_40px_rgba(0,0,0,0.02)]">
        <div className="flex items-end gap-3">
          <input ref={fileInputRef} type="file" className="hidden" onChange={handleFileChange} />
          <button 
            onClick={() => fileInputRef.current?.click()}
            disabled={uploading}
            className="w-11 h-11 bg-neutral-50 hover:bg-orange-50 text-neutral-400 hover:text-orange-600 rounded-2xl flex items-center justify-center transition-all border border-neutral-100 active:scale-95 disabled:opacity-50"
          >
            {uploading ? <Loader2 size={18} className="animate-spin" /> : <Paperclip size={18} />}
          </button>
          
          <div className="flex-1 relative">
            <textarea 
              ref={inputRef}
              rows={1}
              placeholder="Private team message..."
              className="w-full bg-neutral-50 border border-neutral-100 rounded-[24px] px-5 py-3.5 pr-12 text-sm font-medium focus:outline-none focus:border-orange-500 transition-all resize-none max-h-[120px]"
              value={input}
              onChange={(e) => {
                setInput(e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); } }}
            />
            <button 
              onClick={handleSend}
              disabled={!input.trim()}
              className="absolute right-2 bottom-2 w-9 h-9 bg-orange-500 text-white rounded-xl flex items-center justify-center shadow-lg shadow-orange-500/30 hover:bg-orange-600 active:scale-95 transition-all disabled:opacity-40"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
        <p className="text-[9px] font-black text-neutral-300 uppercase tracking-[0.3em] mt-4 text-center">Project Secure Channel</p>
      </div>
    </div>
  );
};

export default ProjectChatPanel;
