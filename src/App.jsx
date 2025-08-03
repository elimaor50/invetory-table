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

  // Function to show delete confirmation
  const confirmDelete = (idx, whichSite) => {
    const items = whichSite === 'office' ? itemsOffice : 
                  whichSite === 'innsbruck' ? itemsInnsbruck :
                  whichSite === 'ci' ? itemsCI :
                  whichSite === 'gate' ? itemsGate :
                  whichSite === 'ctx' ? itemsCTX : itemsCeller;
    
    const item = items[idx];
    setDeleteTarget({ idx, site: whichSite, itemName: item?.name || 'Unknown Item' });
    setShowDeleteConfirm(true);
  };

  // Function to cancel delete
  const cancelDelete = () => {
    setShowDeleteConfirm(false);
    setDeleteTarget({ idx: null, site: null, itemName: '' });
  };

  // Helper function to scroll active tab into view on mobile
  const scrollToActiveTab = (tabName) => {
    setActiveTab(tabName);
    if (isMobile) {
      setTimeout(() => {
        const activeButton = document.querySelector(`[data-tab="${tabName}"]`);
        if (activeButton) {
          activeButton.scrollIntoView({ behavior: 'smooth', inline: 'center', block: 'nearest' });
        }
      }, 100);
    }
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
                    deleteTarget.site === 'ctx' ? itemsCTX : itemsCeller;
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
                  whichSite === 'ctx' ? itemsCTX : itemsCeller;
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
                  editSite === 'ctx' ? itemsCTX : itemsCeller;
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
      `}</style>
      <div className="inventory-app" style={{ 
        display: isMobile ? 'block' : 'grid', 
        gridTemplateColumns: isMobile ? '1fr' : '1fr 1fr 1fr 1fr 1fr 1fr auto', 
        gap: isMobile ? '0' : '1rem', 
        height: '100dvh', 
        width: '100vw', 
        fontFamily: 'Segoe UI, Arial, sans-serif', 
        fontSize: isMobile ? '1.2rem' : '1.3rem', 
        background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%)', 
        boxSizing: 'border-box', 
        overflow: 'auto', 
        margin: 0, 
        padding: isMobile ? '0' : '1rem',
        minHeight: '100vh'
      }}>
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
      {/* Add Item */}
      {(!isMobile || activeTab === 'add') && (
        <div style={{ gridColumn: isMobile ? '1' : '7', flex: isMobile ? 'none' : 'unset', minWidth: '0', padding: '2rem 1.5rem', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 10px #e0e7ef', borderRadius: isMobile ? '0' : '1rem', height: isMobile ? 'auto' : '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '1.8rem', marginBottom: '1.5rem', color: '#2d3748' }}>Add Item</h2>
          <div className="add-item" style={{ display: 'flex', flexDirection: 'column', gap: '1.2rem', width: '100%', maxWidth: '300px', minWidth: '0', background: '#f1f5f9', padding: '1.5rem', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', margin: '1rem auto', boxSizing: 'border-box', alignItems: 'stretch', justifyContent: 'center' }}>
            <select value={site} onChange={e => setSite(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              <option value="office">Office</option>
              <option value="innsbruck">Innsbruck</option>
              <option value="ci">C/I</option>
              <option value="gate">GATE</option>
              <option value="ctx">CTX</option>
              <option value="celler">CELLER</option>
            </select>
            <input
              type="text"
              placeholder="Item name"
              value={name}
              onChange={e => setName(e.target.value)}
              style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
            <input
              type="number"
              placeholder="Amount"
              value={amount}
              onChange={e => setAmount(e.target.value)}
              style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
            <input
              type="number"
              placeholder="Low stock threshold (e.g., 10)"
              value={lowStockThreshold}
              onChange={e => setLowStockThreshold(e.target.value)}
              style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}
            />
            <select value={type} onChange={e => setType(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="refill">Supplies</option>
              <option value="stable">Equipment</option>
            </select>
            <button onClick={handleAdd} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>Add Item</button>
          </div>
        </div>
      )}
      {/* Office Column */}
      {(!isMobile || activeTab === 'office') && (
        <div style={{ gridColumn: isMobile ? '1' : '1', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>Office</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 1.5rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1rem',
                  maxWidth: '500px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
                }}>
                  {editIndex === originalIdx && editSite === 'office' ? (
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
                            <span style={{ fontSize: '1rem', color: editType === 'refill' && editAmount < editLowStockThreshold ? '#ef4444' : '#22c55e', fontWeight: 'bold' }}>
                              {editType === 'refill' ? 'Supplies' : 'Equipment'}
                            </span>
                            {editType === 'refill' && editAmount < editLowStockThreshold && (
                              <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: '1rem' }}>⚠️ Low stock!</span>
                            )}
                          </div>
                          <div style={{ 
                            display: 'flex', 
                            gap: '0.5rem', 
                            justifyContent: isMobile ? 'stretch' : 'flex-end',
                            flexWrap: 'wrap'
                          }}>
                            <button 
                              onClick={handleSave} 
                              style={getButtonStyle('#22c55e')}
                            >
                              Save
                            </button>
                            <button 
                              onClick={() => setEditIndex(null)} 
                              style={getButtonStyle('#ef4444')}
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      </div>
                    </React.Fragment>
                  ) : (
                    <React.Fragment>
                      {/* First row: Name and Amount */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name} // Add tooltip for full name
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.2rem', 
                          color: '#64748b', 
                          minWidth: '60px',
                          textAlign: 'right'
                        }}>Amount: {item.amount}</span>
                      </div>
                      {/* Second row: Type, Low Stock Alert, and Action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'office')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'office')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </React.Fragment>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* Innsbruck Column */}
      {(!isMobile || activeTab === 'innsbruck') && (
        <div style={{ gridColumn: isMobile ? '1' : '6', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>Innsbruck</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 2rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '1rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1.2rem',
                  maxWidth: '600px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.7rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
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
                    <>
                      {/* First row: Name and Amount */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name} // Add tooltip for full name
                        >
                          {item.name}
                        </span>
                        <span style={{ 
                          fontSize: '1.2rem', 
                          color: '#64748b', 
                          minWidth: '60px',
                          textAlign: 'right'
                        }}>Amount: {item.amount}</span>
                      </div>
                      {/* Second row: Type, Low Stock Alert, and Action buttons */}
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'innsbruck')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'innsbruck')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* C/I Column */}
      {(!isMobile || activeTab === 'ci') && (
        <div style={{ gridColumn: isMobile ? '1' : '2', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>C/I</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 1.5rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1rem',
                  maxWidth: '500px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
                }}>
                  {editIndex === originalIdx && editSite === 'ci' ? (
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
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', textAlign: 'right' }}>Amount: {item.amount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'ci')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'ci')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* GATE Column */}
      {(!isMobile || activeTab === 'gate') && (
        <div style={{ gridColumn: isMobile ? '1' : '3', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>GATE</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 1.5rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1rem',
                  maxWidth: '500px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
                }}>
                  {editIndex === originalIdx && editSite === 'gate' ? (
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
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', textAlign: 'right' }}>Amount: {item.amount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'gate')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'gate')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* CTX Column */}
      {(!isMobile || activeTab === 'ctx') && (
        <div style={{ gridColumn: isMobile ? '1' : '4', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>CTX</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 1.5rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1rem',
                  maxWidth: '500px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
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
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', textAlign: 'right' }}>Amount: {item.amount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'ctx')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'ctx')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* CELLER Column */}
      {(!isMobile || activeTab === 'celler') && (
        <div style={{ gridColumn: isMobile ? '1' : '5', flex: isMobile ? 'none' : 'unset', background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.5rem', minWidth: isMobile ? '0' : '250px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.5rem', marginBottom: '1.2rem', color: '#2563eb' }}>CELLER</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
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
                  margin: '0 auto 1.5rem auto',
                  background: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#fee2e2' : '#f1f5f9',
                  borderRadius: '0.8rem',
                  boxShadow: '0 2px 8px #e0e7ef',
                  padding: '1rem',
                  maxWidth: '500px',
                  width: '100%',
                  minWidth: '0',
                  overflowX: 'hidden',
                  boxSizing: 'border-box',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: '0.6rem',
                  border: item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) ? '2px solid #ef4444' : 'none',
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
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span
                          style={{
                            fontWeight: 'bold',
                            fontSize: getNameFontSize(item.name),
                            color: '#334155',
                            wordBreak: 'break-word',
                            maxWidth: isHebrew(item.name) ? '75%' : '65%',
                            whiteSpace: item.name.length > 25 ? 'normal' : 'nowrap',
                            overflow: 'hidden',
                            textOverflow: item.name.length > 25 ? 'clip' : 'ellipsis',
                            direction: isHebrew(item.name) ? 'rtl' : 'ltr',
                            textAlign: isHebrew(item.name) ? 'right' : 'left',
                            lineHeight: item.name.length > 25 ? '1.2' : '1.4',
                            display: '-webkit-box',
                            WebkitBoxOrient: 'vertical',
                            WebkitLineClamp: item.name.length > 35 ? 3 : 2,
                            maxHeight: item.name.length > 35 ? '2.8rem' : '2.4rem',
                          }}
                          title={item.name}
                        >
                          {item.name}
                        </span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', textAlign: 'right' }}>Amount: {item.amount}</span>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '0.5rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: '1', minWidth: '120px' }}>
                          <span style={{ fontSize: isMobile ? '1rem' : '1.1rem', color: item.type === 'refill' ? (item.amount < (item.lowStockThreshold || LOW_STOCK) ? '#ef4444' : '#22c55e') : '#2563eb', fontWeight: 'bold' }}>
                            {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                          </span>
                          {item.type === 'refill' && item.amount < (item.lowStockThreshold || LOW_STOCK) && (
                            <span className="alert" style={{ color: '#ef4444', fontWeight: 'bold', fontSize: isMobile ? '1rem' : '1.1rem' }}>⚠️ Low stock!</span>
                          )}
                        </div>
                        <div style={{ display: 'flex', gap: '0.5rem', flexShrink: 0 }}>
                          <button onClick={() => handleEdit(originalIdx, 'celler')} style={getButtonStyle('#2563eb')}>Edit</button>
                          <button onClick={() => confirmDelete(originalIdx, 'celler')} style={getButtonStyle('#ef4444')}>Delete</button>
                        </div>
                      </div>
                    </>
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
    </>
  );
}

export default App;
