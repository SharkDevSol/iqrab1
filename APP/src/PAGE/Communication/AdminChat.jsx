import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FiMessageCircle, FiSearch, FiUser, FiSend } from 'react-icons/fi';
import ChatWindow from '../../COMPONENTS/Chat/ChatWindow';
import ConversationList from '../../COMPONENTS/Chat/ConversationList';
import styles from './AdminChat.module.css';

const AdminChat = () => {
  const [guardians, setGuardians] = useState([]);
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [messageText, setMessageText] = useState('');
  const [sending, setSending] = useState(false);
  const socketRef = useRef(null);

  const currentUserId = 'admin_1'; // Get from localStorage in production
  const currentUserName = 'Admin';
  const currentUserType = 'admin';

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io('https://bilal.skoolific.com');
    socketRef.current.emit('join', currentUserId);

    // Listen for new messages
    socketRef.current.on('new_message', (message) => {
      console.log('New message received via socket:', message);
      setMessages(prev => [...prev, message]);
      // Update conversation list
      fetchConversations();
    });

    // Listen for send_message events (when someone sends in a conversation)
    socketRef.current.on('send_message', (data) => {
      console.log('Send message event received:', data);
      if (data.message && activeConversation && data.conversationId === activeConversation.id) {
        setMessages(prev => {
          // Avoid duplicates
          if (prev.find(m => m.id === data.message.id)) {
            return prev;
          }
          return [...prev, data.message];
        });
      }
    });

    fetchGuardians();
    fetchConversations();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  // Join conversation room when active conversation changes
  useEffect(() => {
    if (socketRef.current && activeConversation) {
      console.log('Joining conversation room:', activeConversation.id);
      socketRef.current.emit('join_conversation', activeConversation.id);
      
      // Poll for new messages every 3 seconds as fallback
      const pollInterval = setInterval(() => {
        if (activeConversation && activeConversation.id) {
          fetchMessages(activeConversation.id, false); // Don't show loading spinner
        }
      }, 3000);
      
      return () => {
        clearInterval(pollInterval);
        if (socketRef.current && activeConversation) {
          socketRef.current.emit('leave_conversation', activeConversation.id);
        }
      };
    }
  }, [activeConversation]);

  const fetchGuardians = async () => {
    try {
      const res = await axios.get('https://bilal.skoolific.com/api/chats/contacts/guardians');
      setGuardians(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching guardians:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`https://bilal.skoolific.com/api/chats/conversations?userId=${currentUserId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setConversations(data.map(c => ({ ...c, currentUserId })));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    }
  };

  const fetchMessages = async (conversationId, showLoading = true) => {
    if (showLoading) {
      setMessagesLoading(true);
    }
    try {
      const res = await axios.get(`https://bilal.skoolific.com/api/chats/conversations/${conversationId}/messages`);
      setMessages(res.data);
      
      // Mark as read
      await axios.put('https://bilal.skoolific.com/api/chats/messages/read', {
        conversationId,
        userId: currentUserId
      });
      
      fetchConversations(); // Refresh to update unread count
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      if (showLoading) {
        setMessagesLoading(false);
      }
    }
  };

  const handleSelectGuardian = async (guardian) => {
    console.log('Guardian clicked:', guardian);
    
    // Format guardian ID with prefix to match guardian's format
    const guardianUserId = `guardian_${guardian.id}`;
    
    // Immediately set a basic conversation so UI shows
    const tempConversation = {
      id: guardian.id,
      type: 'admin_guardian',
      participants: [
        { user_id: currentUserId, user_type: 'admin', user_name: currentUserName },
        { user_id: guardianUserId, user_type: 'guardian', user_name: guardian.name }
      ]
    };
    
    setActiveConversation(tempConversation);
    setMessages([]);
    setMessagesLoading(true);
    
    try {
      // Create or get conversation
      const res = await axios.post('https://bilal.skoolific.com/api/chats/conversations', {
        type: 'admin_guardian',
        participants: [
          { user_id: currentUserId, user_type: 'admin', user_name: currentUserName },
          { user_id: guardianUserId, user_type: 'guardian', user_name: guardian.name }
        ]
      });

      console.log('Conversation response:', res.data);
      const convId = res.data.id;
      
      // Fetch full conversation details
      const convRes = await axios.get(`https://bilal.skoolific.com/api/chats/conversations/${convId}`);
      console.log('Full conversation:', convRes.data);
      setActiveConversation(convRes.data);
      
      // Fetch messages
      await fetchMessages(convId);
      
      // Refresh conversations list
      fetchConversations();
    } catch (error) {
      console.error('Error selecting guardian:', error);
      console.error('Error details:', error.response?.data);
      
      // Keep the temp conversation so chat window still shows
      setMessagesLoading(false);
    }
  };

  const handleSelectConversation = async (conversation) => {
    setActiveConversation(conversation);
    await fetchMessages(conversation.id);
  };

  const handleSendMessage = async (formData) => {
    try {
      const res = await axios.post(
        `https://bilal.skoolific.com/api/chats/conversations/${activeConversation.id}/messages`,
        formData,
        { headers: { 'Content-Type': 'multipart/form-data' } }
      );

      const newMessage = res.data;
      setMessages(prev => [...prev, newMessage]);

      // Broadcast via Socket.IO
      if (socketRef.current) {
        socketRef.current.emit('send_message', {
          conversationId: activeConversation.id,
          message: newMessage
        });
      }

      fetchConversations(); // Refresh list
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleSendMessageDirect = async () => {
    console.log('=== SEND MESSAGE DEBUG ===');
    console.log('messageText:', messageText);
    console.log('sending:', sending);
    console.log('activeConversation:', activeConversation);
    
    if (!messageText.trim() || sending || !activeConversation) {
      console.log('Send blocked - conditions not met');
      return;
    }

    setSending(true);
    try {
      const formData = new FormData();
      formData.append('senderId', currentUserId);
      formData.append('senderType', currentUserType);
      formData.append('senderName', currentUserName);
      formData.append('messageText', messageText.trim());

      console.log('Sending message to conversation:', activeConversation.id);
      console.log('FormData:', {
        senderId: currentUserId,
        senderType: currentUserType,
        senderName: currentUserName,
        messageText: messageText.trim()
      });

      await handleSendMessage(formData);
      console.log('Message sent successfully!');
      setMessageText('');
    } catch (error) {
      console.error('Error sending message:', error);
      console.error('Error response:', error.response?.data);
      alert('Failed to send message: ' + (error.response?.data?.error || error.message));
    } finally {
      setSending(false);
    }
  };

  const filteredGuardians = guardians.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <FiMessageCircle />
        <h1>Guardian Communications</h1>
      </div>

      <div className={styles.content}>
        {/* Guardians List */}
        <div className={styles.sidebar}>
          <div className={styles.sidebarHeader}>
            <h3>Guardians</h3>
          </div>
          <div className={styles.search}>
            <FiSearch />
            <input
              type="text"
              placeholder="Search guardians..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className={styles.guardianList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : filteredGuardians.length === 0 ? (
              <div className={styles.empty}>No guardians found</div>
            ) : (
              filteredGuardians.map(guardian => (
                <div
                  key={guardian.id}
                  className={`${styles.guardianItem} ${activeConversation?.participants?.find(p => p.user_id === guardian.id) ? styles.active : ''}`}
                  onClick={() => handleSelectGuardian(guardian)}
                >
                  <div className={styles.avatar}><FiUser /></div>
                  <div className={styles.info}>
                    <div className={styles.name}>{guardian.name}</div>
                    {guardian.phone && <div className={styles.phone}>{guardian.phone}</div>}
                    {guardian.students && guardian.students.length > 0 && (
                      <div className={styles.students}>
                        Guardian of: {guardian.students.map((s, i) => 
                          `${s.name} (${s.class})`
                        ).join(', ')}
                      </div>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Chat Window */}
        <div className={styles.chat}>
          {activeConversation ? (
            <div className={styles.chatContainer}>
              <div className={styles.chatHeader}>
                <div className={styles.avatar}><FiUser /></div>
                <div>
                  <h3>
                    {activeConversation.participants?.find(p => p.user_id !== currentUserId)?.user_name || 'Guardian'}
                  </h3>
                  <span>Guardian</span>
                </div>
              </div>
              
              {/* Input at TOP */}
              <div className={styles.topInputArea}>
                <textarea
                  value={messageText}
                  onChange={(e) => setMessageText(e.target.value)}
                  onKeyPress={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      handleSendMessageDirect();
                    }
                  }}
                  placeholder="Type your message here..."
                  rows={2}
                  disabled={sending}
                  className={styles.topInput}
                />
                <button
                  className={styles.topSendBtn}
                  onClick={handleSendMessageDirect}
                  disabled={sending || !messageText.trim()}
                >
                  {sending ? 'Sending...' : <><FiSend /> Send</>}
                </button>
              </div>

              {/* Messages below */}
              <div className={styles.messagesArea}>
                {messagesLoading ? (
                  <div className={styles.loading}>Loading messages...</div>
                ) : messages.length === 0 ? (
                  <div className={styles.noMessages}>
                    <p>No messages yet. Start the conversation above!</p>
                  </div>
                ) : (
                  <div className={styles.messagesList}>
                    {messages.map((message, index) => {
                      const isOwn = message.sender_id === currentUserId;
                      return (
                        <div
                          key={message.id}
                          className={`${styles.message} ${isOwn ? styles.own : styles.other}`}
                        >
                          {!isOwn && (
                            <div className={styles.senderName}>{message.sender_name}</div>
                          )}
                          {message.message_text && (
                            <div className={styles.messageText}>{message.message_text}</div>
                          )}
                          <div className={styles.messageTime}>
                            {new Date(message.created_at).toLocaleTimeString('en-US', { 
                              hour: '2-digit', 
                              minute: '2-digit' 
                            })}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className={styles.noChat}>
              <FiMessageCircle />
              <h3>Select a guardian to start chatting</h3>
              <p>Click on a guardian from the list to begin a conversation</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AdminChat;
