 import React, { useState, useEffect } from 'react';
import './App.css';
import { db } from './firebase';
import {
  collection,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query
} from 'firebase/firestore';

function App() {
  // Helper to check if string contains Hebrew
  const isHebrew = str => /[\u0590-\u05FF]/.test(str);
  
  // Improved mobile detection with responsive updates
  const [isMobile, setIsMobile] = useState(typeof window !== 'undefined' && window.innerWidth < 900);
  
  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 900);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);
  
  // Helper to get font size for item name with mobile-optimized scaling
  const getNameFontSize = name => {
    if (!name) return isMobile ? '1.1rem' : '1.3rem';
    const length = name.length;
    
    if (isMobile) {
      // More aggressive scaling for mobile
      if (length > 35) return '0.65rem';   // Very long names
      if (length > 25) return '0.75rem';   // Long names
      if (length > 20) return '0.85rem';   // Medium-long names
      if (length > 15) return '0.95rem';   // Medium names
      if (length > 10) return '1.05rem';   // Short-medium names
      return '1.1rem';                     // Short names
    } else {
      // Desktop scaling (original)
      if (length > 45) return '0.75rem';   // Very long names
      if (length > 35) return '0.85rem';   // Long names
      if (length > 25) return '0.95rem';   // Medium-long names
      if (length > 18) return '1.1rem';    // Medium names
      if (length > 12) return '1.2rem';    // Short-medium names
      return '1.3rem';                     // Short names
    }
  };

  // Get responsive button styling for better mobile support
  const getButtonStyle = (backgroundColor) => {
    const baseStyle = {
      borderRadius: '0.5rem',
      background: backgroundColor,
      color: '#fff',
      border: 'none',
      cursor: 'pointer',
      fontWeight: 'bold',
      whiteSpace: 'nowrap'
    };

    if (isMobile) {
      return {
        ...baseStyle,
        fontSize: window.innerWidth < 400 ? '0.9rem' : '1rem',
        padding: window.innerWidth < 400 ? '0.4rem 0.7rem' : '0.5rem 0.8rem'
      };
    } else {
      return {
        ...baseStyle,
        fontSize: '1.1rem',
        padding: '0.5rem 1rem'
      };
    }
  };
  const [itemsOffice, setItemsOffice] = useState([]);
  const [itemsInnsbruck, setItemsInnsbruck] = useState([]);
  const [itemsCI, setItemsCI] = useState([]);
  const [itemsGate, setItemsGate] = useState([]);
  const [itemsCTX, setItemsCTX] = useState([]);
  const [itemsCeller, setItemsCeller] = useState([]);
  const [itemsCheckRoom, setItemsCheckRoom] = useState([]);
  const [site, setSite] = useState('office');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('refill');
  const [lowStockThreshold, setLowStockThreshold] = useState('10');
  const [editIndex, setEditIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('refill');
  const [editLowStockThreshold, setEditLowStockThreshold] = useState('10');
  const [editSite, setEditSite] = useState('office');
  const [activeTab, setActiveTab] = useState('office');
  const LOW_STOCK = 10;

  // Delete confirmation dialog state
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState({ idx: null, site: null, itemName: '' });

  // Password protection state for adding items
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [passwordInput, setPasswordInput] = useState('');
  const [authTimeout, setAuthTimeout] = useState(null);
  const CORRECT_PASSWORD = '2006';
  const AUTH_DURATION = 10 * 60 * 1000; // 10 minutes in milliseconds

  // Touch/swipe functionality for mobile navigation
  const [touchStart, setTouchStart] = useState(null);
  const [touchEnd, setTouchEnd] = useState(null);
  const [isAnimating, setIsAnimating] = useState(false);
  const minSwipeDistance = 30; // Reduced from 50 for better responsiveness

  // Function to show delete confirmation
  const confirmDelete = (idx, whichSite) => {
    const items = whichSite === 'office' ? itemsOffice : 
                  whichSite === 'innsbruck' ? itemsInnsbruck :
                  whichSite === 'ci' ? itemsCI :
                  whichSite === 'gate' ? itemsGate :
                  whichSite === 'ctx' ? itemsCTX : 
                  whichSite === 'celler' ? itemsCeller : itemsCheckRoom;
    
    const item = items[idx];
    setDeleteTarget({ idx, site: whichSite, itemName: item?.name || 'Unknown Item' });
    setShowDeleteConfirm(true);
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget({ idx: null, site: null, itemName: '' });
  };

  // Password authentication functions
  const checkPassword = () => {
    if (passwordInput === CORRECT_PASSWORD) {
      setIsAuthenticated(true);
      setShowPasswordPrompt(false);
      setPasswordInput('');
      
      // Clear any existing timeout
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
      
      // Set new timeout for 10 minutes
      const timeout = setTimeout(() => {
        setIsAuthenticated(false);
        setAuthTimeout(null);
      }, AUTH_DURATION);
      
      setAuthTimeout(timeout);
    } else {
      alert('Incorrect password. Please try again.');
      setPasswordInput('');
    }
  };

  const cancelPasswordPrompt = () => {
    setShowPasswordPrompt(false);
    setPasswordInput('');
  };

  const attemptAddItem = () => {
    if (isAuthenticated) {
      handleAdd();
    } else {
      setShowPasswordPrompt(true);
    }
  };

  // Clear timeout on component unmount
  useEffect(() => {
    return () => {
      if (authTimeout) {
        clearTimeout(authTimeout);
      }
    };
  }, [authTimeout]);

  // Helper function to scroll active tab into view on mobile with smooth animation
  const scrollToActiveTab = (tabName) => {
    if (isAnimating) return; // Prevent multiple animations
    
    setIsAnimating(true);
    
    if (isMobile) {
      // Determine animation direction
      const tabs = ['office', 'ci', 'gate', 'ctx', 'check-room', 'celler', 'innsbruck', 'add'];
      const currentIndex = tabs.indexOf(activeTab);
      const newIndex = tabs.indexOf(tabName);
      const isForward = newIndex > currentIndex;
      
      // Get the active column
      const activeColumn = document.querySelector('.column-container');
      if (activeColumn) {
        // Add exit animation
        activeColumn.style.transform = isForward ? 'translateX(-50px)' : 'translateX(50px)';
        activeColumn.style.opacity = '0';
      }
      
      setTimeout(() => {
        setActiveTab(tabName);
        
        // Animate new column in
        setTimeout(() => {
          const newColumn = document.querySelector('.column-container');
          if (newColumn) {
            // Start from opposite direction
            newColumn.style.transform = isForward ? 'translateX(50px)' : 'translateX(-50px)';
            newColumn.style.opacity = '0';
            
            // Animate to final position
            requestAnimationFrame(() => {
              newColumn.style.transform = 'translateX(0)';
              newColumn.style.opacity = '1';
            });
          }
          
          // Scroll navigation bar
          const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
          if (activeButton) {
            activeButton.scrollIntoView({ 
              behavior: 'smooth', 
              inline: 'center', 
              block: 'nearest' 
            });
          }
          
          setTimeout(() => setIsAnimating(false), 300);
        }, 50);
      }, 200);
    } else {
      setActiveTab(tabName);
      setIsAnimating(false);
    }
  };

  // Touch/swipe handling functions
  const onTouchStart = (e) => {
    // Only handle swipes on the main container, not on form elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
      return;
    }
    
    setTouchEnd(null);
    setTouchStart(e.targetTouches[0].clientX);
  };

  const onTouchMove = (e) => {
    // Only handle swipes on the main container, not on form elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
      return;
    }
    
    setTouchEnd(e.targetTouches[0].clientX);
  };

  const onTouchEnd = (e) => {
    // Only handle swipes on the main container, not on form elements
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT' || e.target.tagName === 'BUTTON') {
      return;
    }
    
    if (!touchStart || !touchEnd) return;
    
    const distance = touchStart - touchEnd;
    const isLeftSwipe = distance > minSwipeDistance;
    const isRightSwipe = distance < -minSwipeDistance;

    if (isLeftSwipe || isRightSwipe) {
      // Prevent any default behavior that might interfere
      e.preventDefault();
      
      // Define the correct order as specified: office → c/i → gate → ctx → check-room → celler → innsbruck → add item
      const tabs = ['office', 'ci', 'gate', 'ctx', 'check-room', 'celler', 'innsbruck', 'add'];
      const currentIndex = tabs.indexOf(activeTab);
      
      if (isLeftSwipe && currentIndex < tabs.length - 1) {
        // Swipe left: next tab
        scrollToActiveTab(tabs[currentIndex + 1]);
      } else if (isRightSwipe && currentIndex > 0) {
        // Swipe right: previous tab
        scrollToActiveTab(tabs[currentIndex - 1]);
      }
    }
    
    // Reset touch states
    setTouchStart(null);
    setTouchEnd(null);
  };

  // Firestore real-time sync
  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setItemsOffice(allItems.filter(item => item.site === 'office'));
      setItemsInnsbruck(allItems.filter(item => item.site === 'innsbruck'));
      setItemsCI(allItems.filter(item => item.site === 'ci'));
      setItemsGate(allItems.filter(item => item.site === 'gate'));
      setItemsCTX(allItems.filter(item => item.site === 'ctx'));
      setItemsCeller(allItems.filter(item => item.site === 'celler'));
      setItemsCheckRoom(allItems.filter(item => item.site === 'check-room'));
    });
    return unsubscribe;
  }, []);

  // Add item to Firestore
  const handleAdd = async () => {
    if (!name || !amount || isNaN(amount) || !lowStockThreshold || isNaN(lowStockThreshold)) return;
    const newItem = { 
      name, 
      amount: Number(amount), 
      type, 
      site,
      lowStockThreshold: Number(lowStockThreshold)
    };
    await addDoc(collection(db, 'inventory'), newItem);
    setName('');
    setAmount('');
    setType('refill');
    setLowStockThreshold('10');
  };

  // Delete item from Firestore (called after confirmation)
  const handleDelete = async () => {
    if (deleteTarget.idx !== null && deleteTarget.site) {
      const items = deleteTarget.site === 'office' ? itemsOffice : 
                    deleteTarget.site === 'innsbruck' ? itemsInnsbruck :
                    deleteTarget.site === 'ci' ? itemsCI :
                    deleteTarget.site === 'gate' ? itemsGate :
                    deleteTarget.site === 'ctx' ? itemsCTX : 
                    deleteTarget.site === 'celler' ? itemsCeller : itemsCheckRoom;
      const item = items.find((_, i) => i === deleteTarget.idx);
      if (item && item.id) {
        await deleteDoc(doc(db, 'inventory', item.id));
      }
    }
    // Close confirmation dialog
    setShowDeleteConfirm(false);
    setDeleteTarget({ idx: null, site: null, itemName: '' });
  };

  // Edit item from correct site
  const handleEdit = (idx, whichSite) => {
    setEditIndex(idx);
    setEditSite(whichSite);
    const items = whichSite === 'office' ? itemsOffice : 
                  whichSite === 'innsbruck' ? itemsInnsbruck :
                  whichSite === 'ci' ? itemsCI :
                  whichSite === 'gate' ? itemsGate :
                  whichSite === 'ctx' ? itemsCTX : 
                  whichSite === 'celler' ? itemsCeller : itemsCheckRoom;
    const item = items.find((_, i) => i === idx);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditType(item.type);
    setEditLowStockThreshold(item.lowStockThreshold || 10);
  };

  // Save edited item to Firestore
  const handleSave = async () => {
    if (!editName || !editAmount || isNaN(editAmount) || !editLowStockThreshold || isNaN(editLowStockThreshold)) return;
    const items = editSite === 'office' ? itemsOffice : 
                  editSite === 'innsbruck' ? itemsInnsbruck :
                  editSite === 'ci' ? itemsCI :
                  editSite === 'gate' ? itemsGate :
                  editSite === 'ctx' ? itemsCTX : 
                  editSite === 'celler' ? itemsCeller : itemsCheckRoom;
    const item = items.find((_, i) => i === editIndex);
    if (item && item.id) {
      await updateDoc(doc(db, 'inventory', item.id), {
        name: editName,
        amount: Number(editAmount),
        type: editType,
        site: editSite,
        lowStockThreshold: Number(editLowStockThreshold)
      });
    }
    setEditIndex(null);
    setEditName('');
    setEditAmount('');
    setEditType('refill');
    setEditLowStockThreshold('10');
    setEditSite('office');
  };

  return (
    <>
      <style jsx>{`
        /* Global modern font family */
        * {
          font-family: -apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Roboto", "Helvetica Neue", sans-serif;
        }
        
        /* EliExpress branding animations */
        @keyframes logoGlow {
          0% { text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
          50% { text-shadow: 2px 2px 8px rgba(255,255,255,0.5), 0 0 20px rgba(255,101,0,0.5); }
          100% { text-shadow: 2px 2px 4px rgba(0,0,0,0.3); }
        }
        
        .eli-logo {
          animation: logoGlow 3s ease-in-out infinite;
        }
        
        /* Custom scrollbar for mobile navigation */
        .mobile-nav {
          scrollbar-width: none; /* Firefox */
          -ms-overflow-style: none; /* IE and Edge */
        }
        .mobile-nav::-webkit-scrollbar {
          display: none; /* Chrome, Safari, Opera */
        }
        /* Smooth scrolling for mobile */
        .mobile-nav {
          scroll-behavior: smooth;
        }
        /* Smooth slide animations for columns */
        .column-container {
          transition: transform 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94), opacity 0.4s ease;
          transform: translateX(0);
          opacity: 1;
        }
        /* Enhanced swipe animations */
        @keyframes slideInRight {
          from {
            transform: translateX(100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        @keyframes slideInLeft {
          from {
            transform: translateX(-100px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
        .slide-enter {
          animation: slideInRight 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        .slide-enter-reverse {
          animation: slideInLeft 0.4s cubic-bezier(0.25, 0.46, 0.45, 0.94);
        }
        /* Ensure form elements don't interfere with animations */
        .column-container input,
        .column-container select,
        .column-container button {
          pointer-events: auto;
        }
      `}</style>
      <div className="inventory-app main-container" style={{ 
        display: isMobile ? 'block' : 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr 1fr 1fr 1fr auto', 
        gap: isMobile ? '0' : '1rem', 
        height: '100dvh', 
        width: '100vw', 
        fontFamily: '-apple-system, BlinkMacSystemFont, "SF Pro Display", "Inter", "Roboto", "Helvetica Neue", sans-serif', 
        fontSize: isMobile ? '1.2rem' : '1.3rem', 
        background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%)', 
        boxSizing: 'border-box', 
        overflow: 'auto', 
        margin: 0, 
        padding: isMobile ? '0' : '1rem',
        minHeight: '100vh',
        touchAction: isMobile ? 'pan-x' : 'auto', // Enable horizontal pan gestures
        userSelect: 'none', // Prevent text selection during swipe
        WebkitUserSelect: 'none',
        MozUserSelect: 'none',
        msUserSelect: 'none'
      }}
      onTouchStart={isMobile ? onTouchStart : undefined}
      onTouchMove={isMobile ? onTouchMove : undefined}
      onTouchEnd={isMobile ? onTouchEnd : undefined}
      >
      
      {/* EliExpress Header */}
      <div style={{
        gridColumn: isMobile ? '1' : '1 / -1',
        background: 'linear-gradient(135deg, #ff6500, #ff8533)',
        color: '#fff',
        padding: isMobile ? '1rem' : '1.5rem 2rem',
        marginBottom: isMobile ? '0' : '1rem',
        borderRadius: isMobile ? '0' : '1rem',
        boxShadow: '0 4px 20px rgba(255, 101, 0, 0.3)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
        position: 'relative',
        overflow: 'hidden'
      }}>
        {/* Background photo in top right corner */}
        <div style={{
          position: 'absolute',
          top: 0,
          right: 0,
          width: isMobile ? '80px' : '120px',
          height: isMobile ? '80px' : '120px',
          backgroundImage: 'url(/eli-photo.jpg)',
          backgroundSize: 'cover',
          backgroundPosition: 'center',
          opacity: 0.6,
          borderRadius: '0 1rem 0 0',
          filter: 'brightness(1.1) contrast(1.1)'
        }} />
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', zIndex: 1 }}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
            <div className="eli-logo" style={{
              fontSize: isMobile ? '1.5rem' : '2rem',
              fontWeight: '900',
              letterSpacing: '-0.02em',
              textShadow: '2px 2px 4px rgba(0,0,0,0.3)',
              lineHeight: '1.1'
            }}>
              🚀 EliExpress
            </div>
            <div style={{
              fontSize: isMobile ? '0.75rem' : '0.9rem',
              fontWeight: '500',
              opacity: 0.85,
              fontStyle: 'italic',
              marginTop: '0.2rem',
              letterSpacing: '0.5px'
            }}>
              Inventory Management System
            </div>
          </div>
        </div>
        {!isMobile && (
          <div style={{
            fontSize: '1rem',
            fontWeight: '500',
            opacity: 0.8,
            display: 'flex',
            alignItems: 'center',
            gap: '0.5rem',
            zIndex: 1
          }}>
            <span>📦</span>
            Smart Inventory Solutions
          </div>
        )}
      </div>

      {/* Mobile tab menu */}
      {isMobile && (
        <div className="mobile-nav" style={{ 
          display: 'flex', 
          justifyContent: 'flex-start', 
          gap: '0.5rem', 
          background: '#fff', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1rem', 
          position: 'sticky', 
          top: 0, 
          zIndex: 10, 
          overflowX: 'auto', 
          overflowY: 'hidden',
          whiteSpace: 'nowrap',
          WebkitOverflowScrolling: 'touch',
          scrollbarWidth: 'thin',
          width: '100vw',
          boxSizing: 'border-box'
        }}>
          <button 
            data-tab="office"
            onClick={() => scrollToActiveTab('office')} 
            style={{ 
              fontWeight: activeTab === 'office' ? 'bold' : 'normal', 
              background: activeTab === 'office' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'office' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>OFFICE</button>
          <button 
            data-tab="ci"
            onClick={() => scrollToActiveTab('ci')} 
            style={{ 
              fontWeight: activeTab === 'ci' ? 'bold' : 'normal', 
              background: activeTab === 'ci' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'ci' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>C/I</button>
          <button 
            data-tab="gate"
            onClick={() => scrollToActiveTab('gate')} 
            style={{ 
              fontWeight: activeTab === 'gate' ? 'bold' : 'normal', 
              background: activeTab === 'gate' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'gate' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>GATE</button>
          <button 
            data-tab="ctx"
            onClick={() => scrollToActiveTab('ctx')} 
            style={{ 
              fontWeight: activeTab === 'ctx' ? 'bold' : 'normal', 
              background: activeTab === 'ctx' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'ctx' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>CTX</button>
          <button 
            data-tab="check-room"
            onClick={() => scrollToActiveTab('check-room')} 
            style={{ 
              fontWeight: activeTab === 'check-room' ? 'bold' : 'normal', 
              background: activeTab === 'check-room' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'check-room' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>CHECK-ROOM</button>
          <button 
            data-tab="celler"
            onClick={() => scrollToActiveTab('celler')} 
            style={{ 
              fontWeight: activeTab === 'celler' ? 'bold' : 'normal', 
              background: activeTab === 'celler' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'celler' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>CELLER</button>
          <button 
            data-tab="innsbruck"
            onClick={() => scrollToActiveTab('innsbruck')} 
            style={{ 
              fontWeight: activeTab === 'innsbruck' ? 'bold' : 'normal', 
              background: activeTab === 'innsbruck' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'innsbruck' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>INNSBRUCK</button>
          <button 
            data-tab="add"
            onClick={() => scrollToActiveTab('add')} 
            style={{ 
              fontWeight: activeTab === 'add' ? 'bold' : 'normal', 
              background: activeTab === 'add' ? '#2563eb' : '#f1f5f9', 
              color: activeTab === 'add' ? '#fff' : '#2563eb', 
              border: 'none', 
              borderRadius: '0.5rem', 
              padding: '0.8rem 1.2rem', 
              fontSize: '1rem', 
              cursor: 'pointer', 
              minWidth: 'fit-content',
              whiteSpace: 'nowrap',
              flexShrink: 0
            }}>ADD ITEM</button>
        </div>
      )}
      {/* Add Item - Modern Design */}
      {(!isMobile || activeTab === 'add') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '8', 
          flex: isMobile ? 'none' : 'unset', 
          minWidth: '0', 
          background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          justifyContent: 'flex-start', 
          borderRadius: isMobile ? '0' : '1rem', 
          height: isMobile ? '100vh' : '100%', 
          overflowY: 'auto', 
          boxSizing: 'border-box',
          padding: isMobile ? '0.5rem 0.5rem' : '1.5rem',
          position: 'relative',
          boxShadow: '0 8px 32px rgba(102, 126, 234, 0.3)'
        }}>
          {/* Background Pattern */}
          <div style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            background: 'url("data:image/svg+xml,%3Csvg width="60" height="60" viewBox="0 0 60 60" xmlns="http://www.w3.org/2000/svg"%3E%3Cg fill="none" fill-rule="evenodd"%3E%3Cg fill="%23ffffff" fill-opacity="0.05"%3E%3Ccircle cx="30" cy="30" r="2"/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")',
            borderRadius: isMobile ? '0' : '1rem',
            pointerEvents: 'none'
          }} />
          
          {/* Header Section */}
          <div style={{
            textAlign: 'center',
            marginBottom: isMobile ? '0.5rem' : '1.5rem',
            zIndex: 1
          }}>
            <div style={{
              fontSize: isMobile ? '1.5rem' : '2.5rem',
              marginBottom: isMobile ? '0.1rem' : '0.3rem'
            }}>
              ✨
            </div>
            <h2 style={{ 
              fontSize: isMobile ? '1.2rem' : '2rem', 
              margin: '0', 
              color: '#fff', 
              fontWeight: '700',
              textShadow: '0 2px 4px rgba(0,0,0,0.3)',
              letterSpacing: '-0.5px'
            }}>
              Add New Item
            </h2>
            <p style={{
              color: 'rgba(255,255,255,0.8)',
              fontSize: isMobile ? '0.7rem' : '0.9rem',
              margin: isMobile ? '0.1rem 0 0 0' : '0.3rem 0 0 0',
              fontWeight: '400'
            }}>
              Create inventory entries
            </p>
          </div>

          {/* Authentication Status */}
          {isAuthenticated && (
            <div style={{
              backgroundColor: 'rgba(34, 197, 94, 0.9)',
              color: '#fff',
              padding: isMobile ? '0.4rem 0.8rem' : '0.75rem 1.25rem',
              borderRadius: '50px',
              fontSize: isMobile ? '0.7rem' : '0.8rem',
              fontWeight: '600',
              marginBottom: isMobile ? '0.5rem' : '1.5rem',
              display: 'flex',
              alignItems: 'center',
              gap: '0.5rem',
              backdropFilter: 'blur(10px)',
              border: '1px solid rgba(255,255,255,0.2)',
              boxShadow: '0 4px 16px rgba(34, 197, 94, 0.3)',
              zIndex: 1
            }}>
              <span>✅</span>
              <span>Ready to add items</span>
            </div>
          )}

          {/* Form Container */}
          <div style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            gap: isMobile ? '0.6rem' : '1.2rem', 
            width: '100%', 
            maxWidth: isMobile ? '100%' : '350px', 
            background: 'rgba(255, 255, 255, 0.95)', 
            padding: isMobile ? '1rem 0.8rem' : '2rem 1.5rem', 
            borderRadius: '1.5rem', 
            boxShadow: '0 16px 40px rgba(0,0,0,0.1)', 
            backdropFilter: 'blur(20px)',
            border: '1px solid rgba(255,255,255,0.3)',
            zIndex: 1,
            flex: '1',
            minHeight: '0',
            boxSizing: 'border-box'
          }}>
            {/* Location Selector */}
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.25rem' : '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📍 Location
              </label>
              <select 
                value={site} 
                onChange={e => setSite(e.target.value)} 
                style={{ 
                  fontSize: isMobile ? '0.8rem' : '1rem', 
                  padding: isMobile ? '0.6rem 0.7rem' : '0.875rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="office">🏢 Office</option>
                <option value="ci">🔧 C/I</option>
                <option value="gate">🚪 GATE</option>
                <option value="ctx">⚡ CTX</option>
                <option value="check-room">✅ CHECK-ROOM</option>
                <option value="celler">🏠 CELLER</option>
                <option value="innsbruck">🏔️ Innsbruck</option>
              </select>
            </div>

            {/* Item Name */}
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.25rem' : '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🏷️ Item Name
              </label>
              <input
                type="text"
                placeholder="Enter item name..."
                value={name}
                onChange={e => setName(e.target.value)}
                style={{ 
                  fontSize: isMobile ? '0.8rem' : '1rem', 
                  padding: isMobile ? '0.6rem 0.7rem' : '0.875rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Quantity */}
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.25rem' : '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                📦 Quantity
              </label>
              <input
                type="number"
                placeholder="Enter quantity..."
                value={amount}
                onChange={e => setAmount(e.target.value)}
                style={{ 
                  fontSize: isMobile ? '0.8rem' : '1rem', 
                  padding: isMobile ? '0.6rem 0.7rem' : '0.875rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Low Stock Threshold */}
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.25rem' : '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                ⚠️ Low Stock Alert
              </label>
              <input
                type="number"
                placeholder="Alert when below..."
                value={lowStockThreshold}
                onChange={e => setLowStockThreshold(e.target.value)}
                style={{ 
                  fontSize: isMobile ? '0.8rem' : '1rem', 
                  padding: isMobile ? '0.6rem 0.7rem' : '0.875rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              />
            </div>

            {/* Item Type */}
            <div style={{ position: 'relative', width: '100%', boxSizing: 'border-box' }}>
              <label style={{
                display: 'block',
                fontSize: isMobile ? '0.65rem' : '0.75rem',
                fontWeight: '600',
                color: '#374151',
                marginBottom: isMobile ? '0.25rem' : '0.4rem',
                textTransform: 'uppercase',
                letterSpacing: '0.5px'
              }}>
                🏷️ Item Type
              </label>
              <select 
                value={type} 
                onChange={e => setType(e.target.value)} 
                style={{ 
                  fontSize: isMobile ? '0.8rem' : '1rem', 
                  padding: isMobile ? '0.6rem 0.7rem' : '0.875rem 1rem', 
                  borderRadius: '0.75rem', 
                  border: '2px solid #e5e7eb',
                  width: '100%',
                  boxSizing: 'border-box',
                  background: '#fff',
                  color: '#374151',
                  fontWeight: '500',
                  cursor: 'pointer',
                  transition: 'all 0.2s ease',
                  outline: 'none'
                }}
                onFocus={(e) => e.target.style.borderColor = '#667eea'}
                onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
              >
                <option value="refill">📦 Supplies (Consumable)</option>
                <option value="stable">🔧 Equipment (Permanent)</option>
              </select>
            </div>

            {/* Add Button */}
            <button 
              onClick={attemptAddItem} 
              style={{ 
                fontSize: isMobile ? '0.9rem' : '1.1rem', 
                padding: isMobile ? '0.7rem 1.2rem' : '1rem 2rem', 
                borderRadius: '0.75rem', 
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', 
                color: '#fff', 
                border: 'none', 
                cursor: 'pointer', 
                fontWeight: '700',
                marginTop: isMobile ? '0.3rem' : '0.5rem',
                transition: 'all 0.2s ease',
                boxShadow: '0 8px 25px rgba(102, 126, 234, 0.4)',
                textTransform: 'uppercase',
                letterSpacing: '0.5px',
                width: '100%',
                boxSizing: 'border-box'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 12px 35px rgba(102, 126, 234, 0.5)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 8px 25px rgba(102, 126, 234, 0.4)';
              }}
            >
              ✨ Add Item
            </button>
          </div>
        </div>
      )}
      {/* Office Column */}
      {(!isMobile || activeTab === 'office') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '1', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          transition: isMobile ? 'transform 0.3s cubic-bezier(0.4, 0, 0.2, 1), opacity 0.3s ease' : 'none',
          transform: isMobile && activeTab === 'office' ? 'translateX(0)' : 'translateX(0)',
          opacity: isMobile && activeTab === 'office' ? 1 : 1
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>Office</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsOffice.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsOffice]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                // First priority: Low stock items (refill type with amount < item's lowStockThreshold)
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                
                // Second priority: Supplies (refill) before Equipment (stable)
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'office' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <input 
                          type="number" 
                          value={editAmount} 
                          onChange={e => setEditAmount(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        >
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                        <input 
                          type="number" 
                          value={editLowStockThreshold} 
                          onChange={e => setEditLowStockThreshold(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                          placeholder="Low stock threshold"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem', color: '#64748b' }}>Type:</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: editType === 'stable' ? '#2563eb' : '#059669' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'office')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'office')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* Innsbruck Column */}
      {(!isMobile || activeTab === 'innsbruck') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '7', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>Innsbruck</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsInnsbruck.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsInnsbruck]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                // First priority: Low stock items (refill type with amount < item's lowStockThreshold)
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                
                // Second priority: Supplies (refill) before Equipment (stable)
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'innsbruck' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {/* Name input - full width */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Name:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        
                        {/* Amount and Low Stock threshold inputs */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Amount:</label>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Low Stock:</label>
                            <input
                              type="number"
                              value={editLowStockThreshold}
                              onChange={e => setEditLowStockThreshold(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        
                        {/* Type input */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Type:</label>
                          <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}>
                            <option value="refill">Supplies</option>
                            <option value="stable">Equipment</option>
                          </select>
                        </div>
                        
                        {/* Status and buttons */}
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                            <span style={{ fontSize: '1rem', color: editType === 'refill' ? (editAmount < editLowStockThreshold ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'innsbruck')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'innsbruck')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* C/I Column */}
      {(!isMobile || activeTab === 'ci') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '2', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>C/I</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsCI.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsCI]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'ci' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <input 
                          type="number" 
                          value={editAmount} 
                          onChange={e => setEditAmount(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        >
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                        <input 
                          type="number" 
                          value={editLowStockThreshold} 
                          onChange={e => setEditLowStockThreshold(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                          placeholder="Low stock threshold"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem', color: '#64748b' }}>Type:</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: editType === 'stable' ? '#2563eb' : '#059669' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'ci')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'ci')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* GATE Column */}
      {(!isMobile || activeTab === 'gate') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '3', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>GATE</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsGate.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsGate]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'gate' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <input 
                          type="number" 
                          value={editAmount} 
                          onChange={e => setEditAmount(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        >
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                        <input 
                          type="number" 
                          value={editLowStockThreshold} 
                          onChange={e => setEditLowStockThreshold(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                          placeholder="Low stock threshold"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem', color: '#64748b' }}>Type:</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: editType === 'stable' ? '#2563eb' : '#059669' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'gate')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'gate')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* CTX Column */}
      {(!isMobile || activeTab === 'ctx') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '4', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>CTX</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsCTX.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsCTX]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'ctx' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Name:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Amount:</label>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Low Stock:</label>
                            <input
                              type="number"
                              value={editLowStockThreshold}
                              onChange={e => setEditLowStockThreshold(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Type:</label>
                          <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}>
                            <option value="refill">Supplies</option>
                            <option value="stable">Equipment</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                            <span style={{ fontSize: '1rem', color: editType === 'refill' ? (editAmount < editLowStockThreshold ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'ctx')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'ctx')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* CELLER Column */}
      {(!isMobile || activeTab === 'celler') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '6', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>CELLER</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsCeller.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsCeller]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'celler' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Name:</label>
                          <input
                            type="text"
                            value={editName}
                            onChange={e => setEditName(e.target.value)}
                            style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                          />
                        </div>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Amount:</label>
                            <input
                              type="number"
                              value={editAmount}
                              onChange={e => setEditAmount(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem', flex: 1 }}>
                            <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Low Stock:</label>
                            <input
                              type="number"
                              value={editLowStockThreshold}
                              onChange={e => setEditLowStockThreshold(e.target.value)}
                              style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}
                            />
                          </div>
                        </div>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.3rem' }}>
                          <label style={{ fontSize: '0.9rem', color: '#64748b', fontWeight: 'bold' }}>Type:</label>
                          <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.6rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%', boxSizing: 'border-box' }}>
                            <option value="refill">Supplies</option>
                            <option value="stable">Equipment</option>
                          </select>
                        </div>
                        <div style={{ display: 'flex', flexDirection: isMobile ? 'column' : 'row', gap: '1rem', alignItems: isMobile ? 'stretch' : 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', justifyContent: isMobile ? 'center' : 'flex-start' }}>
                            <span style={{ fontSize: '1rem', color: editType === 'refill' ? (editAmount < editLowStockThreshold ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'celler')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'celler')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}

      {/* Check-Room Column */}
      {(!isMobile || activeTab === 'check-room') && (
        <div className="column-container" style={{ 
          gridColumn: isMobile ? '1' : '5', 
          flex: isMobile ? 'none' : 'unset', 
          background: '#fff', 
          borderRadius: '1rem', 
          boxShadow: '0 2px 8px #e0e7ef', 
          padding: '1.5rem', 
          minWidth: isMobile ? '0' : '250px', 
          height: isMobile ? 'auto' : '100%', 
          overflowY: 'auto', 
          marginTop: isMobile ? '2rem' : '0',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center'
        }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb', textAlign: 'center' }}>Check-Room</h2>
          <ul className="item-list" style={{ 
            listStyle: 'none', 
            padding: 0, 
            width: '100%',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center'
          }}>
            {itemsCheckRoom.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsCheckRoom]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => {
                // First priority: Low stock items (refill type with amount < item's lowStockThreshold)
                const aIsLowStock = a.item.type === 'refill' && a.item.amount < (a.item.lowStockThreshold || LOW_STOCK);
                const bIsLowStock = b.item.type === 'refill' && b.item.amount < (b.item.lowStockThreshold || LOW_STOCK);
                
                if (aIsLowStock && !bIsLowStock) return -1;
                if (!aIsLowStock && bIsLowStock) return 1;
                
                // Second priority: Supplies (refill) before Equipment (stable)
                return (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1);
              })
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fef2f2' : (item.type === 'stable' ? '#eff6ff' : '#f0fdf4'),
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 6px #e0e7ef',
                  padding: '0.9rem',
                  width: isMobile ? '90%' : '260px',
                  maxWidth: '280px',
                  border: '2px solid',
                  borderColor: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fca5a5' : (item.type === 'stable' ? '#93c5fd' : '#a7f3d0'),
                  position: 'relative',
                  marginBottom: '1.5rem'
                }}>
                  {editIndex === originalIdx && editSite === 'check-room' ? (
                    <React.Fragment>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        <input 
                          type="text" 
                          value={editName} 
                          onChange={e => setEditName(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <input 
                          type="number" 
                          value={editAmount} 
                          onChange={e => setEditAmount(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        />
                        <select 
                          value={editType} 
                          onChange={e => setEditType(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                        >
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                        <input 
                          type="number" 
                          value={editLowStockThreshold} 
                          onChange={e => setEditLowStockThreshold(e.target.value)} 
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
                          placeholder="Low stock threshold"
                        />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.5rem' }}>
                          <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
                            <span style={{ fontSize: '1rem', color: '#64748b' }}>Type:</span>
                            <span style={{ fontSize: '1rem', fontWeight: 'bold', color: editType === 'stable' ? '#2563eb' : '#059669' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ display: 'flex', gap: '0.8rem', justifyContent: isMobile ? 'stretch' : 'flex-end' }}>
                            <button onClick={handleSave} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Save</button>
                            <button onClick={() => setEditIndex(null)} style={{ fontSize: '1rem', padding: '0.6rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', flex: isMobile ? '1' : 'none' }}>Cancel</button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.8rem', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.8rem' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#1e293b',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            wordBreak: 'break-word',
                            hyphens: 'auto',
                            lineHeight: '1.2',
                            flex: '1'
                          }}
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.3rem', 
                          fontWeight: 'bold',
                          color: '#0f172a',
                          background: 'linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)',
                          padding: '0.3rem 0.6rem',
                          borderRadius: '0.5rem',
                          border: '1px solid #cbd5e1',
                          minWidth: '50px',
                          textAlign: 'center'
                        }}>
                          {item.amount}
                        </span>
                        <div style={{ display: 'flex', flexDirection: 'row', gap: '0.4rem', alignItems: 'center' }}>
                          <button onClick={() => handleEdit(originalIdx, 'check-room')} style={{
                            ...getButtonStyle('#f59e0b'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'check-room')} style={{
                            ...getButtonStyle('#ef4444'),
                            fontSize: '0.85rem',
                            padding: '0.4rem 0.7rem'
                          }}>Delete</button>
                        </div>
                      </div>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                          <span style={{ 
                            fontSize: '0.9rem', 
                            color: item.type === 'stable' ? '#2563eb' : '#059669', 
                            fontWeight: 'bold',
                            padding: '0.2rem 0.6rem',
                            borderRadius: '0.4rem',
                            background: item.type === 'stable' ? '#eff6ff' : '#f0fdf4',
                            border: '1px solid',
                            borderColor: item.type === 'stable' ? '#93c5fd' : '#a7f3d0'
                          }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '0.8rem', flexShrink: 0 }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <span style={{ fontSize: '0.8rem', color: '#64748b' }}>
                          Low: &lt; {item.lowStockThreshold || LOW_STOCK}
                        </span>
                      </div>
                    </div>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          zIndex: 1000,
          padding: '1rem'
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '400px',
            width: '100%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)',
            textAlign: 'center'
          }}>
            <div style={{
              fontSize: '3rem',
              marginBottom: '1rem',
              color: '#ef4444'
            }}>
              ⚠️
            </div>
            <h2 style={{
              fontSize: '1.5rem',
              marginBottom: '0.5rem',
              color: '#1f2937',
              fontWeight: 'bold'
            }}>
              Confirm Delete
            </h2>
            <p style={{
              fontSize: '1.1rem',
              marginBottom: '1.5rem',
              color: '#6b7280',
              lineHeight: '1.5'
            }}>
              Are you sure you want to delete{' '}
              <strong style={{ color: '#1f2937' }}>"{deleteTarget.itemName}"</strong>?
              <br />
              <span style={{ fontSize: '1rem', color: '#ef4444' }}>
                This action cannot be undone.
              </span>
            </p>
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'center',
              flexWrap: 'wrap'
            }}>
              <button
                onClick={cancelDelete}
                style={{
                  fontSize: '1.1rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  background: '#6b7280',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minWidth: '100px'
                }}
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                style={{
                  fontSize: '1.1rem',
                  padding: '0.75rem 1.5rem',
                  borderRadius: '0.5rem',
                  background: '#ef4444',
                  color: '#fff',
                  border: 'none',
                  cursor: 'pointer',
                  fontWeight: 'bold',
                  minWidth: '100px'
                }}
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Password Prompt Modal */}
      {showPasswordPrompt && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000
        }}>
          <div style={{
            backgroundColor: '#fff',
            borderRadius: '1rem',
            padding: '2rem',
            maxWidth: '400px',
            width: '90%',
            boxShadow: '0 10px 25px rgba(0, 0, 0, 0.2)'
          }}>
            <h3 style={{ 
              margin: '0 0 1.5rem 0', 
              fontSize: '1.5rem', 
              color: '#2d3748',
              textAlign: 'center'
            }}>
              🔒 Admin Access Required
            </h3>
            <p style={{ 
              margin: '0 0 1.5rem 0', 
              color: '#4a5568',
              textAlign: 'center',
              fontSize: '1rem'
            }}>
              Enter password to add new items:
            </p>
            <input
              type="password"
              value={passwordInput}
              onChange={(e) => setPasswordInput(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && checkPassword()}
              placeholder="Enter password"
              style={{
                width: '100%',
                padding: '0.75rem',
                border: '2px solid #e2e8f0',
                borderRadius: '0.5rem',
                fontSize: '1rem',
                marginBottom: '1.5rem',
                boxSizing: 'border-box'
              }}
              autoFocus
            />
            <div style={{
              display: 'flex',
              gap: '1rem',
              justifyContent: 'flex-end'
            }}>
              <button
                onClick={cancelPasswordPrompt}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: '2px solid #e2e8f0',
                  borderRadius: '0.5rem',
                  backgroundColor: '#fff',
                  color: '#4a5568',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Cancel
              </button>
              <button
                onClick={checkPassword}
                style={{
                  padding: '0.75rem 1.5rem',
                  border: 'none',
                  borderRadius: '0.5rem',
                  backgroundColor: '#2563eb',
                  color: '#fff',
                  cursor: 'pointer',
                  fontSize: '1rem',
                  fontWeight: 'bold'
                }}
              >
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default App;
