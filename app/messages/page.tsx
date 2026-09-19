'use client'
import { useState, useEffect, useRef, useCallback } from 'react'
import { toast } from 'sonner'

type User = { id: number; fullName: string | null; role: string }
type Message = {
  id: number; content: string; senderId: number; receiverId: number
  isRead: boolean | null; readAt: string | null; createdAt: string; senderName: string | null
}
type Conversation = {
  userId: number; lastMessage: { content: string; createdAt: string; isRead: boolean | null }
  unread: number; user: User
}

const ROLE_LABELS: Record<string, string> = {
  admin: 'مشرف', teacher: 'معلم', guardian: 'ولي أمر',
}

// Message status indicator
function MessageStatus({ msg, currentUserId }: { msg: Message; currentUserId: number }) {
  if (msg.senderId !== currentUserId) return null
  if (msg.isRead) {
    return (
      <span className="text-blue-300 text-xs" title={msg.readAt ? `قُرئت: ${new Date(msg.readAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}` : 'مقروءة'}>
        ✓✓
      </span>
    )
  }
  return <span className="text-green-300 text-xs" title="تم الإرسال">✓</span>
}

export default function MessagesPage() {
  const [conversations, setConversations] = useState<Conversation[]>([])
  const [users, setUsers] = useState<User[]>([])
  const [filteredConversations, setFilteredConversations] = useState<Conversation[]>([])
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [newMessage, setNewMessage] = useState('')
  const [currentUser, setCurrentUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [showNewConv, setShowNewConv] = useState(false)
  const [mobileView, setMobileView] = useState<'list' | 'chat'>('list')
  const [convSearch, setConvSearch] = useState('')
  const [msgSearch, setMsgSearch] = useState('')
  const [showMsgSearch, setShowMsgSearch] = useState(false)

  // Admin broadcast modal
  const [showBroadcastModal, setShowBroadcastModal] = useState(false)
  const [broadcastTarget, setBroadcastTarget] = useState<'all' | 'teacher' | 'guardian'>('all')
  const [broadcastMessage, setBroadcastMessage] = useState('')
  const [broadcasting, setBroadcasting] = useState(false)

  // Teacher group-broadcast modal
  const [showGroupBroadcastModal, setShowGroupBroadcastModal] = useState(false)
  const [groupBroadcastMessage, setGroupBroadcastMessage] = useState('')
  const [groupBroadcasting, setGroupBroadcasting] = useState(false)

  const messagesEndRef = useRef<HTMLDivElement>(null)
  const msgInputRef = useRef<HTMLInputElement>(null)

  async function loadConversations() {
    const res = await fetch('/api/messages?inbox=1')
    const data = await res.json()
    if (Array.isArray(data)) setConversations(data)
  }

  async function loadUsers() {
    const res = await fetch('/api/messages')
    const data = await res.json()
    if (Array.isArray(data)) setUsers(data)
  }

  useEffect(() => {
    fetch('/api/auth/me').then(r => r.json()).then(u => { if (u?.id) setCurrentUser(u) }).catch(() => {})
    Promise.all([loadConversations(), loadUsers()]).finally(() => setLoading(false))
  }, [])

  useEffect(() => {
    if (selectedUserId) {
      fetch(`/api/messages?withUserId=${selectedUserId}`)
        .then(r => r.json())
        .then(data => { if (Array.isArray(data)) setMessages(data) })
    }
  }, [selectedUserId])

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Filter conversations by search
  useEffect(() => {
    if (!convSearch.trim()) {
      setFilteredConversations(conversations)
    } else {
      const q = convSearch.toLowerCase()
      setFilteredConversations(
        conversations.filter(c =>
          (c.user.fullName ?? '').toLowerCase().includes(q) ||
          (c.lastMessage?.content ?? '').toLowerCase().includes(q)
        )
      )
    }
  }, [conversations, convSearch])

  // Filter messages by search
  const filteredMessages = msgSearch.trim()
    ? messages.filter(m => m.content.toLowerCase().includes(msgSearch.toLowerCase()))
    : messages

  async function sendMessage() {
    if (!selectedUserId || !newMessage.trim()) return
    setSending(true)
    const res = await fetch('/api/messages', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ receiverId: selectedUserId, content: newMessage }),
    })
    if (res.ok) {
      const { message } = await res.json()
      setMessages(prev => [...prev, { ...message, senderName: 'أنا' }])
      setNewMessage('')
      loadConversations()
    } else {
      toast.error('فشل إرسال الرسالة')
    }
    setSending(false)
  }

  // Admin: broadcast to all/teachers/guardians
  async function handleSendBroadcast() {
    if (!broadcastMessage.trim()) return
    setBroadcasting(true)
    const targetUsers = users.filter(u => {
      if (u.id === currentUser?.id) return false
      if (broadcastTarget === 'all') return true
      return u.role === broadcastTarget
    })
    if (targetUsers.length === 0) {
      toast.error('لا يوجد مستخدمون ضمن الفئة المحددة')
      setBroadcasting(false)
      return
    }
    try {
      await Promise.all(
        targetUsers.map(u =>
          fetch('/api/messages', {
            method: 'POST', headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ receiverId: u.id, content: broadcastMessage }),
          })
        )
      )
      toast.success(`تم الإرسال إلى ${targetUsers.length} مستخدم`)
      setBroadcastMessage('')
      setShowBroadcastModal(false)
      loadConversations()
    } catch { toast.error('حدث خطأ') }
    setBroadcasting(false)
  }

  // Teacher: broadcast to guardians of their groups
  async function handleGroupBroadcast() {
    if (!groupBroadcastMessage.trim()) return
    setGroupBroadcasting(true)
    try {
      const res = await fetch('/api/messages/broadcast', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ content: groupBroadcastMessage }),
      })
      const data = await res.json()
      if (res.ok) {
        toast.success(`تم الإرسال إلى ${data.sent} ولي أمر`)
        setGroupBroadcastMessage('')
        setShowGroupBroadcastModal(false)
        loadConversations()
      } else {
        toast.error(data.error ?? 'حدث خطأ في الإرسال')
      }
    } catch { toast.error('حدث خطأ') }
    setGroupBroadcasting(false)
  }

  function selectUser(userId: number) {
    setSelectedUserId(userId)
    setShowNewConv(false)
    setMobileView('chat')
    setTimeout(() => msgInputRef.current?.focus(), 100)
  }

  const selectedUser = users.find(u => u.id === selectedUserId)
    ?? conversations.find(c => c.userId === selectedUserId)?.user

  // ── Conversations Sidebar ──────────────────────────────────────────────
  const SidebarPanel = (
    <div className="h-full flex flex-col bg-white">
      {/* Search conversations */}
      <div className="p-3 border-b flex items-center gap-2 flex-shrink-0">
        <div className="relative flex-1">
          <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 text-sm">🔍</span>
          <input value={convSearch} onChange={e => setConvSearch(e.target.value)}
            placeholder="بحث في المحادثات..."
            className="w-full border border-gray-200 rounded-lg pr-8 pl-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
        </div>
        <button onClick={() => setShowNewConv(!showNewConv)}
          className="w-8 h-8 bg-green-700 hover:bg-green-800 text-white rounded-full flex items-center justify-center font-bold transition-colors flex-shrink-0 text-lg"
          title="محادثة جديدة">+</button>
      </div>

      {showNewConv && (
        <div className="border-b bg-green-50 p-2 max-h-48 overflow-y-auto flex-shrink-0">
          <p className="text-xs text-green-700 font-medium mb-1.5 px-1">اختر مستخدماً:</p>
          {users.length === 0 ? (
            <p className="text-xs text-gray-400 px-2">لا يوجد مستخدمون</p>
          ) : users.map(u => (
            <button key={u.id} onClick={() => selectUser(u.id)}
              className="w-full text-right px-2 py-2 rounded-lg hover:bg-white text-sm flex items-center gap-2 transition-colors">
              <div className="w-8 h-8 bg-green-700 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                {u.fullName?.[0] ?? '?'}
              </div>
              <div className="min-w-0">
                <div className="font-medium text-gray-800 truncate">{u.fullName}</div>
                <div className="text-xs text-gray-400">{ROLE_LABELS[u.role] ?? u.role}</div>
              </div>
            </button>
          ))}
        </div>
      )}

      <div className="flex-1 overflow-y-auto">
        {loading ? (
          <div className="flex items-center justify-center h-24">
            <div className="w-6 h-6 border-2 border-green-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : filteredConversations.length === 0 ? (
          <div className="text-center text-gray-400 p-6 text-sm">
            <div className="text-3xl mb-2">💬</div>
            <p>{convSearch ? 'لا نتائج بحث' : 'لا توجد محادثات'}</p>
          </div>
        ) : filteredConversations.map(conv => (
          <button key={conv.userId} onClick={() => selectUser(conv.userId)}
            className={`w-full text-right px-3 py-3 border-b border-gray-100 hover:bg-gray-50 transition-colors ${selectedUserId === conv.userId ? 'bg-green-50 border-r-2 border-r-green-600' : ''}`}>
            <div className="flex items-center gap-2.5">
              <div className="w-10 h-10 bg-green-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0 text-sm">
                {conv.user.fullName?.[0] ?? '?'}
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between gap-1">
                  <span className="font-semibold text-sm text-gray-800 truncate">{conv.user.fullName}</span>
                  <div className="flex items-center gap-1 flex-shrink-0">
                    {conv.unread > 0 && (
                      <span className="bg-green-600 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center font-bold">
                        {conv.unread}
                      </span>
                    )}
                  </div>
                </div>
                <div className="flex items-center gap-1 mt-0.5">
                  <p className="text-xs text-gray-400 truncate flex-1">{conv.lastMessage?.content}</p>
                  <span className="text-xs text-gray-300 flex-shrink-0">
                    {conv.lastMessage?.createdAt ? new Date(conv.lastMessage.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' }) : ''}
                  </span>
                </div>
              </div>
            </div>
          </button>
        ))}
      </div>
    </div>
  )

  // ── Chat Panel ──────────────────────────────────────────────────────────
  const ChatPanel = (
    <div className="flex-1 flex flex-col min-w-0 h-full bg-gray-50">
      {!selectedUserId ? (
        <div className="flex-1 flex items-center justify-center text-center text-gray-400 p-8">
          <div>
            <div className="text-5xl mb-3">💬</div>
            <p className="font-medium text-gray-500">اختر محادثة أو ابدأ واحدة جديدة</p>
          </div>
        </div>
      ) : (
        <>
          {/* Chat header */}
          <div className="bg-white border-b px-4 py-3 flex items-center gap-3 flex-shrink-0 shadow-sm">
            <button onClick={() => setMobileView('list')}
              className="md:hidden w-8 h-8 rounded-full bg-gray-100 hover:bg-gray-200 flex items-center justify-center text-gray-600 transition-colors flex-shrink-0">
              ←
            </button>
            <div className="w-9 h-9 bg-green-700 rounded-full flex items-center justify-center text-white font-bold flex-shrink-0">
              {selectedUser?.fullName?.[0] ?? '?'}
            </div>
            <div className="flex-1 min-w-0">
              <div className="font-bold text-gray-800 text-sm truncate">{selectedUser?.fullName}</div>
              <div className="text-xs text-gray-400">{ROLE_LABELS[selectedUser?.role ?? ''] ?? ''}</div>
            </div>
            {/* Message search toggle */}
            <button onClick={() => setShowMsgSearch(!showMsgSearch)}
              className={`w-8 h-8 rounded-lg flex items-center justify-center transition-colors ${showMsgSearch ? 'bg-green-100 text-green-700' : 'bg-gray-100 text-gray-500 hover:bg-gray-200'}`}
              title="بحث في الرسائل">
              🔍
            </button>
          </div>

          {/* Message search bar */}
          {showMsgSearch && (
            <div className="bg-white border-b px-4 py-2 flex-shrink-0">
              <input value={msgSearch} onChange={e => setMsgSearch(e.target.value)}
                placeholder="بحث في الرسائل..."
                className="w-full border border-gray-200 rounded-lg px-3 py-1.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400" />
            </div>
          )}

          {/* Messages area */}
          <div className="flex-1 overflow-y-auto p-3 sm:p-4 space-y-2">
            {filteredMessages.length === 0 ? (
              <div className="text-center text-gray-400 text-sm mt-8">
                {msgSearch ? 'لا توجد رسائل تطابق البحث' : 'ابدأ المحادثة الآن'}
              </div>
            ) : filteredMessages.map(msg => {
              const isMe = msg.senderId === currentUser?.id
              return (
                <div key={msg.id} className={`flex ${isMe ? 'justify-start' : 'justify-end'}`}>
                  <div className={`max-w-[78%] sm:max-w-sm px-3.5 py-2.5 rounded-2xl text-sm shadow-sm ${
                    isMe ? 'bg-green-700 text-white rounded-bl-sm' : 'bg-white text-gray-800 rounded-br-sm border border-gray-100'
                  }`}>
                    <div className="leading-relaxed">{msg.content}</div>
                    <div className={`flex items-center gap-1.5 mt-1 ${isMe ? 'justify-start' : 'justify-end'}`}>
                      <span className={`text-xs ${isMe ? 'text-green-200' : 'text-gray-400'}`}>
                        {new Date(msg.createdAt).toLocaleTimeString('ar', { hour: '2-digit', minute: '2-digit' })}
                      </span>
                      {currentUser && <MessageStatus msg={msg} currentUserId={currentUser.id} />}
                    </div>
                  </div>
                </div>
              )
            })}
            <div ref={messagesEndRef} />
          </div>

          {/* Message input */}
          <div className="bg-white border-t px-3 py-3 flex gap-2 flex-shrink-0">
            <input ref={msgInputRef} type="text" value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage() } }}
              placeholder="اكتب رسالتك..."
              className="flex-1 border border-gray-200 rounded-full px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-green-400 bg-gray-50" />
            <button onClick={sendMessage} disabled={sending || !newMessage.trim()}
              className="w-10 h-10 bg-green-700 hover:bg-green-800 disabled:opacity-50 text-white rounded-full flex items-center justify-center transition-colors flex-shrink-0 text-lg">
              {sending ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : '↑'}
            </button>
          </div>
        </>
      )}
    </div>
  )

  return (
    <div dir="rtl">
      <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
        <h1 className="text-xl font-bold text-gray-800 flex items-center gap-2">💬 الرسائل</h1>
        <div className="flex gap-2 flex-wrap">
          {/* Teacher: group broadcast button */}
          {currentUser?.role === 'teacher' && (
            <button onClick={() => setShowGroupBroadcastModal(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              📣 رسالة لأولياء الفوج
            </button>
          )}
          {/* Admin: full broadcast button */}
          {currentUser?.role === 'admin' && (
            <button onClick={() => setShowBroadcastModal(true)}
              className="bg-green-700 hover:bg-green-800 text-white px-4 py-2 rounded-xl text-sm font-semibold transition-colors flex items-center gap-2">
              📢 رسالة جماعية
            </button>
          )}
        </div>
      </div>

      {/* Desktop */}
      <div className="hidden md:flex bg-white rounded-xl border shadow-sm overflow-hidden" style={{ height: 'calc(100vh - 180px)', minHeight: 520 }}>
        <div className="w-72 flex-shrink-0 border-l border-gray-200 overflow-hidden">{SidebarPanel}</div>
        {ChatPanel}
      </div>

      {/* Mobile — full-screen panels */}
      <div className="md:hidden bg-white rounded-xl border shadow-sm overflow-hidden" style={{ height: 'calc(100dvh - 180px)', minHeight: 480 }}>
        <div className={`h-full ${mobileView === 'list' ? 'block' : 'hidden'}`}>{SidebarPanel}</div>
        <div className={`h-full flex flex-col ${mobileView === 'chat' ? 'flex' : 'hidden'}`}>{ChatPanel}</div>
      </div>

      {/* Admin Broadcast Modal */}
      {showBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <h3 className="font-bold text-lg text-gray-800">📢 رسالة جماعية</h3>
              <button onClick={() => setShowBroadcastModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">المستهدفون:</label>
              <select value={broadcastTarget} onChange={e => setBroadcastTarget(e.target.value as typeof broadcastTarget)}
                className="w-full border border-gray-300 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-green-500">
                <option value="all">الجميع</option>
                <option value="teacher">المعلمون فقط</option>
                <option value="guardian">أولياء الأمور فقط</option>
              </select>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">نص الرسالة:</label>
              <textarea value={broadcastMessage} onChange={e => setBroadcastMessage(e.target.value)}
                placeholder="اكتب الرسالة هنا..." rows={4}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-green-500 resize-none" />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={handleSendBroadcast} disabled={broadcasting || !broadcastMessage.trim()}
                className="flex-1 bg-green-700 hover:bg-green-800 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {broadcasting ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" /> : 'إرسال للجميع'}
              </button>
              <button onClick={() => setShowBroadcastModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Teacher Group Broadcast Modal */}
      {showGroupBroadcastModal && (
        <div className="fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4" dir="rtl">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <div className="flex justify-between items-center border-b pb-3">
              <div>
                <h3 className="font-bold text-lg text-gray-800">📣 رسالة جماعية للفوج</h3>
                <p className="text-xs text-gray-500 mt-0.5">سيتم إرسال الرسالة لجميع أولياء أمور طلاب فوجك</p>
              </div>
              <button onClick={() => setShowGroupBroadcastModal(false)} className="text-gray-400 hover:text-gray-600 text-xl">✕</button>
            </div>
            <div>
              <label className="block text-xs font-semibold text-gray-600 mb-1">نص الرسالة:</label>
              <textarea value={groupBroadcastMessage} onChange={e => setGroupBroadcastMessage(e.target.value)}
                placeholder="اكتب رسالتك لأولياء الأمور..." rows={5}
                className="w-full border border-gray-300 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none" />
            </div>
            <div className="flex gap-2 pt-2 border-t">
              <button onClick={handleGroupBroadcast} disabled={groupBroadcasting || !groupBroadcastMessage.trim()}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white py-2.5 rounded-xl text-sm font-medium disabled:opacity-50 transition-colors flex items-center justify-center gap-2">
                {groupBroadcasting
                  ? <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                  : '📣 إرسال لأولياء الفوج'}
              </button>
              <button onClick={() => setShowGroupBroadcastModal(false)}
                className="flex-1 border border-gray-300 text-gray-600 py-2.5 rounded-xl text-sm hover:bg-gray-50 transition-colors">
                إلغاء
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
