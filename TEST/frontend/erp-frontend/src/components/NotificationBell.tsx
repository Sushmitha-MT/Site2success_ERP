import React, { useState, useEffect, useRef } from 'react';
import { Bell, Check, Trash2 } from 'lucide-react';
import { notificationsApi, Notification } from '../api/notifications';

// ── Helpers ─────────────────────────────────────────────────────────────
function formatTimeAgo(isoString: string) {
  const date = new Date(isoString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return `${diffInSeconds}s ago`;
  const diffInMinutes = Math.floor(diffInSeconds / 60);
  if (diffInMinutes < 60) return `${diffInMinutes}m ago`;
  const diffInHours = Math.floor(diffInMinutes / 60);
  if (diffInHours < 24) return `${diffInHours}h ago`;
  const diffInDays = Math.floor(diffInHours / 24);
  return `${diffInDays}d ago`;
}

// ── Inner Notification Item Component ────────────────────────────────────
interface NotificationItemProps {
  notification: Notification;
  onRead: (id: string) => void;
  onDelete: (id: string) => void;
}

const NotificationItem: React.FC<NotificationItemProps> = ({ notification, onRead, onDelete }) => {
  return (
    <div 
      className={`relative group p-4 border-b border-neutral-100 transition-colors hover:bg-neutral-50 ${
        !notification.is_read ? 'bg-orange-50/30' : 'bg-white'
      }`}
    >
      <div className="flex gap-3">
        {/* Unread Indicator */}
        <div className="pt-1.5 shrink-0">
          {!notification.is_read ? (
            <div className="w-2.5 h-2.5 rounded-full bg-orange-500 shadow-sm" />
          ) : (
            <div className="w-2.5 h-2.5 rounded-full bg-neutral-200" />
          )}
        </div>
        
        {/* Content */}
        <div 
          className="flex-1 min-w-0 cursor-pointer" 
          onClick={() => {
            if (!notification.is_read) onRead(notification.id);
          }}
        >
          <div className="flex justify-between items-start mb-1">
            <h4 className={`text-sm truncate pr-2 ${!notification.is_read ? 'font-bold text-neutral-900' : 'font-medium text-neutral-700'}`}>
              {notification.title}
            </h4>
            <span className="text-[10px] uppercase font-bold text-neutral-400 tracking-wider shrink-0 mt-0.5">
              {formatTimeAgo(notification.created_at)}
            </span>
          </div>
          <p className={`text-xs leading-relaxed line-clamp-2 ${!notification.is_read ? 'text-neutral-700 font-medium' : 'text-neutral-500'}`}>
            {notification.message}
          </p>
        </div>
      </div>

      {/* Hover Actions */}
      <div className="absolute top-3 right-3 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1 bg-white/90 backdrop-blur-sm p-1 rounded-lg border border-neutral-100 shadow-sm">
        {!notification.is_read && (
          <button 
            onClick={(e) => { e.stopPropagation(); onRead(notification.id); }}
            className="p-1.5 text-neutral-400 hover:text-orange-600 hover:bg-orange-50 rounded-md transition-colors"
            title="Mark as read"
          >
            <Check size={14} strokeWidth={3} />
          </button>
        )}
        <button 
          onClick={(e) => { e.stopPropagation(); onDelete(notification.id); }}
          className="p-1.5 text-neutral-400 hover:text-red-500 hover:bg-red-50 rounded-md transition-colors"
          title="Delete"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ── Main Bell Component ──────────────────────────────────────────────────
const NotificationBell: React.FC = () => {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Computed unread count
  const unreadCount = notifications.filter(n => !n.is_read).length;

  // Poll notifications
  const loadNotifications = async () => {
    try {
      const data = await notificationsApi.getNotifications();
      // sort is handled by backend (latest first), so just set state
      setNotifications(data);
    } catch (error) {
      console.error('Failed to load notifications:', error);
    } finally {
      if (loading) setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000); // Poll every 30s
    return () => clearInterval(interval);
  }, []);

  // Handle outside click to close dropdown
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [isOpen]);

  // Actions with optimistic UI updates
  const handleMarkAsRead = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => 
      prev.map(n => n.id === id ? { ...n, is_read: true } : n)
    );
    try {
      await notificationsApi.markAsRead(id);
    } catch (error) {
      // Revert on failure
      loadNotifications();
    }
  };

  const handleDelete = async (id: string) => {
    // Optimistic UI update
    setNotifications(prev => prev.filter(n => n.id !== id));
    try {
      await notificationsApi.deleteNotification(id);
    } catch (error) {
      // Revert on failure
      loadNotifications();
    }
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Target Button */}
      <button 
        onClick={() => setIsOpen(!isOpen)}
        className={`relative w-10 h-10 rounded-xl flex items-center justify-center transition-all ${
          isOpen ? 'bg-orange-50 text-orange-600' : 'text-neutral-500 hover:bg-neutral-50 hover:text-neutral-900'
        }`}
      >
        <Bell size={20} className={unreadCount > 0 ? "animate-[wiggle_1s_ease-in-out_infinite] [animation-iteration-count:1]" : ""} />
        
        {/* Unread Badge */}
        {unreadCount > 0 && (
          <div className="absolute top-2 right-2.5 w-2 h-2 rounded-full bg-red-500 border border-white shadow-sm" />
        )}
      </button>

      {/* Dropdown Modal */}
      {isOpen && (
        <div className="absolute top-[calc(100%+8px)] right-0 w-[360px] bg-white rounded-2xl shadow-[0_10px_40px_rgba(0,0,0,0.12)] border border-neutral-100 overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-200">
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-neutral-100 flex items-center justify-between bg-neutral-50/50">
            <div className="flex items-center gap-2">
              <h3 className="font-black text-neutral-900 tracking-tight">Notifications</h3>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 bg-orange-100 text-orange-600 text-[10px] font-black rounded-full uppercase tracking-wider">
                  {unreadCount} New
                </span>
              )}
            </div>
          </div>

          {/* List Area */}
          <div className="max-h-[400px] overflow-y-auto overscroll-contain">
            {loading && notifications.length === 0 ? (
              <div className="p-8 text-center text-neutral-400 text-sm font-medium">Loading...</div>
            ) : notifications.length === 0 ? (
              <div className="p-10 flex flex-col items-center justify-center text-center">
                <div className="w-12 h-12 bg-neutral-50 rounded-full flex items-center justify-center text-neutral-300 mb-3">
                  <Bell size={20} />
                </div>
                <h4 className="font-bold text-neutral-700">No notifications</h4>
                <p className="text-xs text-neutral-400 mt-1">You're all caught up!</p>
              </div>
            ) : (
              notifications.map((notif) => (
                <NotificationItem 
                  key={notif.id} 
                  notification={notif} 
                  onRead={handleMarkAsRead} 
                  onDelete={handleDelete} 
                />
              ))
            )}
          </div>
          
        </div>
      )}
    </div>
  );
};

export default NotificationBell;
