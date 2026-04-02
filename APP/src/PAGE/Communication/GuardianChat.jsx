import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import io from 'socket.io-client';
import { FiMessageCircle, FiArrowLeft } from 'react-icons/fi';
import ChatWindow from '../../COMPONENTS/Chat/ChatWindow';
import ConversationList from '../../COMPONENTS/Chat/ConversationList';
import styles from './GuardianChat.module.css';

const GuardianChat = () => {
  const [conversations, setConversations] = useState([]);
  const [activeConversation, setActiveConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [messagesLoading, setMessagesLoading] = useState(false);
  const socketRef = useRef(null);

  // Get guardian info from localStorage
  const guardianInfo = JSON.parse(localStorage.getItem('guardianInfo') || '{}');
  const guardianId = guardianInfo.guardian_phone || guardianInfo.guardian_name || 'unknown';
  const currentUserId = `guardian_${guardianId}`;
  const currentUserName = guardianInfo.guardian_name || 'Guardian';
  const currentUserType = 'guardian';

  console.log('Guardian Info:', guardianInfo);
  console.log('Guardian User ID:', currentUserId);

  useEffect(() => {
    // Initialize Socket.IO
    socketRef.current = io('https://iqrab1.skoolific.com');
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
      console.log('Fetching conversations for user:', currentUserId);
      const res = await axios.get(`https://iqrab1.skoolific.com/api/chats/conversations?userId=${currentUserId}`);
      console.log('Conversations fetched:', res.data);
      setConversations(res.data.map(c => ({ ...c, currentUserId })));
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const fetchMessages = async (conversationId) => {
    setMessagesLoading(true);
    try {
      const res = await axios.get(`https://iqrab1.skoolific.com/api/chats/conversations/${conversationId}/messages`);
      setMessages(res.data);
      
      // Mark as read
      await axios.put('https://iqrab1.skoolific.com/api/chats/messages/read', {
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

  const handleBackToList = () => {
    setActiveConversation(null);
    setMessages([]);
  };

  const handleSendMessage = async (formData) => {
    try {
      const res = await axios.post(
        `https://iqrab1.skoolific.com/api/chats/conversations/${activeConversation.id}/messages`,
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

  return (
    <div className={styles.container}>
      {!activeConversation ? (
        <>
          <div className={styles.header}>
            <FiMessageCircle />
            <h1>Messages</h1>
          </div>
          <div className={styles.conversationsList}>
            {loading ? (
              <div className={styles.loading}>Loading...</div>
            ) : conversations.length === 0 ? (
              <div className={styles.empty}>
                <FiMessageCircle />
                <p>No messages yet</p>
              </div>
            ) : (
              <ConversationList
                conversations={conversations}
                activeId={null}
                onSelect={handleSelectConversation}
                loading={false}
              />
            )}
          </div>
        </>
      ) : (
        <>
          <div className={styles.chatHeader}>
            <button onClick={handleBackToList} className={styles.backButton}>
              <FiArrowLeft />
            </button>
            <div className={styles.headerInfo}>
              <h3>
                {activeConversation.participants?.find(p => p.user_id !== currentUserId)?.user_name}
              </h3>
              <span>Admin</span>
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
      )}
    </div>
  );
};

export default GuardianChat;
