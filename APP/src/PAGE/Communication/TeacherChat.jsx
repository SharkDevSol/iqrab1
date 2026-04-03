import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FiMessageCircle, FiUser, FiPlus, FiX, FiSearch, FiArrowLeft } from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import ChatWindow from '../../COMPONENTS/Chat/ChatWindow';
import ConversationList from '../../COMPONENTS/Chat/ConversationList';
import styles from './TeacherChat.module.css';

const TeacherChat = () => {
  const navigate = useNavigate();
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const [showNewChatModal, setShowNewChatModal] = useState(false);
  const [guardians, setGuardians] = useState([]);
  const [guardiansLoading, setGuardiansLoading] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const socketRef = useRef(null);

  // Get teacher info from localStorage
  const staffProfile = JSON.parse(localStorage.getItem('staffProfile') || '{}');
  const currentUserId = `teacher_${staffProfile.global_staff_id || '1'}`;
  const currentUserName = staffProfile.name || 'Teacher';
  const currentUserType = 'teacher';

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io('https://bilal.skoolific.com');
    socketRef.current.emit('join', currentUserId);

    // Listen for new messages
    socketRef.current.on('new_message', (message) => {
      setMessages(prev => [...prev, message]);
      fetchConversations();
    });

    fetchConversations();

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, []);

  const fetchConversations = async () => {
    try {
      const res = await axios.get(`https://bilal.skoolific.com/api/chats/conversations?userId=${currentUserId}`);
      const data = Array.isArray(res.data) ? res.data : [];
      setConversations(data.map(c => ({ ...c, currentUserId })));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchGuardians = async () => {
    setGuardiansLoading(true);
    try {
      const res = await axios.get('https://bilal.skoolific.com/api/chats/contacts/guardians');
      console.log('Guardians fetched:', res.data);
      setGuardians(Array.isArray(res.data) ? res.data : []);
    } catch (error) {
      console.error('Error fetching guardians:', error);
      console.error('Error details:', error.response?.data);
    } finally {
      setGuardiansLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const res = await axios.get(`https://bilal.skoolific.com/api/chats/conversations/${conversationId}/messages`);
      setMessages(res.data);
      
      // Mark as read
      await axios.put('https://bilal.skoolific.com/api/chats/messages/read', {
        conversationId,
        userId: currentUserId
      });
      
      fetchConversations();
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
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

      fetchConversations();
    } catch (error) {
      console.error('Error sending message:', error);
      throw error;
    }
  };

  const handleNewChat = () => {
    setShowNewChatModal(true);
    fetchGuardians();
  };

  const handleStartConversation = async (guardian) => {
    try {
      console.log('Starting conversation with guardian:', guardian);
      
      const res = await axios.post('https://bilal.skoolific.com/api/chats/conversations', {
        type: 'direct',
        participants: [
          { user_id: currentUserId, user_name: currentUserName, user_type: currentUserType },
          { user_id: `guardian_${guardian.id}`, user_name: guardian.name, user_type: 'guardian' }
        ]
      });

      console.log('Conversation created:', res.data);

      setShowNewChatModal(false);
      setSearchQuery('');
      await fetchConversations();
      
      // Select the new conversation
      const newConv = res.data;
      
      // If conversation already exists, we need to fetch its full details
      if (newConv.existing) {
        const convDetails = await axios.get(`https://bilal.skoolific.com/api/chats/conversations/${newConv.id}`);
        setActiveConversation(convDetails.data);
      } else {
        // For new conversations, we need to add participants info
        const convDetails = await axios.get(`https://bilal.skoolific.com/api/chats/conversations/${newConv.id}`);
        setActiveConversation(convDetails.data);
      }
      
      await fetchMessages(newConv.id);
    } catch (error) {
      console.error('Error starting conversation:', error);
      console.error('Error details:', error.response?.data);
      alert('Failed to start conversation. Please try again.');
    }
  };

  const filteredGuardians = guardians.filter(g =>
    g.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    g.students?.some(s => s.name?.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  return (
    <div className={styles.container}>
      <div className={styles.header}>
        <button className={styles.backButton} onClick={() => navigate(-1)}>
          <FiArrowLeft />
        </button>
        <FiMessageCircle />
        <h1>Messages</h1>
      </div>

      <div className={styles.content}>
        {/* Conversations List */}
        <div className={styles.conversations}>
          <div className={styles.conversationsHeader}>
            <h3>Conversations</h3>
            <button className={styles.newChatBtn} onClick={handleNewChat}>
              <FiPlus /> New
            </button>
          </div>
          <ConversationList
            conversations={conversations}
            activeId={activeConversation?.id}
            onSelect={handleSelectConversation}
            loading={loading}
          />
        </div>

        {/* Chat Window */}
        <div className={styles.chat}>
          {activeConversation ? (
            <>
              <div className={styles.chatHeader}>
                <div className={styles.avatar}><FiUser /></div>
                <div>
                  <h3>
                    {activeConversation.participants?.find(p => p.user_id !== currentUserId)?.user_name}
                  </h3>
                  <span>
                    {activeConversation.participants?.find(p => p.user_id !== currentUserId)?.user_type === 'guardian' ? 'Guardian' : 'Admin'}
                  </span>
                </div>
              </div>
              <ChatWindow
                conversation={activeConversation}
                messages={messages}
                currentUserId={currentUserId}
                currentUserName={currentUserName}
                currentUserType={currentUserType}
                onSendMessage={handleSendMessage}
                isLoading={messagesLoading}
                socket={socketRef.current}
              />
            </>
          ) : (
            <div className={styles.noChat}>
              <FiMessageCircle />
              <h3>Select a conversation to start chatting</h3>
            </div>
          )}
        </div>
      </div>

      {/* New Chat Modal */}
      {showNewChatModal && (
        <div className={styles.modalOverlay} onClick={() => setShowNewChatModal(false)}>
          <div className={styles.modal} onClick={e => e.stopPropagation()}>
            <div className={styles.modalHeader}>
              <h2>New Conversation</h2>
              <button className={styles.closeBtn} onClick={() => setShowNewChatModal(false)}>
                <FiX />
              </button>
            </div>

            <div className={styles.modalSearch}>
              <FiSearch />
              <input
                type="text"
                placeholder="Search guardians or students..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
            </div>

            <div className={styles.modalContent}>
              {guardiansLoading ? (
                <div className={styles.modalLoading}>Loading guardians...</div>
              ) : filteredGuardians.length > 0 ? (
                <div className={styles.guardiansList}>
                  {filteredGuardians.map(guardian => (
                    <div
                      key={guardian.id}
                      className={styles.guardianItem}
                      onClick={() => handleStartConversation(guardian)}
                    >
                      <div className={styles.guardianAvatar}>
                        <FiUser />
                      </div>
                      <div className={styles.guardianInfo}>
                        <h4>{guardian.name}</h4>
                        {guardian.students && guardian.students.length > 0 && (
                          <p className={styles.guardianStudents}>
                            Guardian of: {guardian.students.map(s => `${s.name} (${s.class})`).join(', ')}
                          </p>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className={styles.modalEmpty}>
                  <FiUser />
                  <p>No guardians found</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default TeacherChat;
