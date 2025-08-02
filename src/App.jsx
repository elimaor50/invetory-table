import { useState, useEffect } from 'react';
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
  const [itemsVienna, setItemsVienna] = useState([]);
  const [itemsInnsbruck, setItemsInnsbruck] = useState([]);
  const [site, setSite] = useState('vienna');
  const [name, setName] = useState('');
  const [amount, setAmount] = useState('');
  const [type, setType] = useState('refill');
  const [editIndex, setEditIndex] = useState(null);
  const [editName, setEditName] = useState('');
  const [editAmount, setEditAmount] = useState('');
  const [editType, setEditType] = useState('refill');
  const [editSite, setEditSite] = useState('vienna');
  const [activeTab, setActiveTab] = useState('add');
  const LOW_STOCK = 10;

  // Detect mobile
  const isMobile = typeof window !== 'undefined' && window.innerWidth < 900;

  // Firestore real-time sync
  useEffect(() => {
    const q = query(collection(db, 'inventory'));
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const allItems = snapshot.docs.map(doc => ({ ...doc.data(), id: doc.id }));
      setItemsVienna(allItems.filter(item => item.site === 'vienna'));
      setItemsInnsbruck(allItems.filter(item => item.site === 'innsbruck'));
    });
    return unsubscribe;
  }, []);

  // Add item to Firestore
  const handleAdd = async () => {
    if (!name || !amount || isNaN(amount)) return;
    const newItem = { name, amount: Number(amount), type, site };
    await addDoc(collection(db, 'inventory'), newItem);
    setName('');
    setAmount('');
    setType('refill');
  };

  // Delete item from Firestore
  const handleDelete = async (idx, whichSite) => {
    const items = whichSite === 'vienna' ? itemsVienna : itemsInnsbruck;
    const item = items.find((_, i) => i === idx);
    if (item && item.id) {
      await deleteDoc(doc(db, 'inventory', item.id));
    }
  };

  // Edit item from correct site
  const handleEdit = (idx, whichSite) => {
    setEditIndex(idx);
    setEditSite(whichSite);
    const items = whichSite === 'vienna' ? itemsVienna : itemsInnsbruck;
    const item = items.find((_, i) => i === idx);
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditType(item.type);
  };

  // Save edited item to Firestore
  const handleSave = async () => {
    if (!editName || !editAmount || isNaN(editAmount)) return;
    const items = editSite === 'vienna' ? itemsVienna : itemsInnsbruck;
    const item = items.find((_, i) => i === editIndex);
    if (item && item.id) {
      await updateDoc(doc(db, 'inventory', item.id), {
        name: editName,
        amount: Number(editAmount),
        type: editType,
        site: editSite
      });
    }
    setEditIndex(null);
    setEditName('');
    setEditAmount('');
    setEditType('refill');
    setEditSite('vienna');
  };

  return (
    <div className="inventory-app" style={{ display: isMobile ? 'block' : 'flex', height: '100dvh', width: '100vw', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '1.3rem', background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%)', boxSizing: 'border-box', overflow: 'auto', margin: 0, padding: 0 }}>
      {/* Mobile tab menu */}
      {isMobile && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: '1rem', background: '#fff', boxShadow: '0 2px 8px #e0e7ef', padding: '1rem 0', position: 'sticky', top: 0, zIndex: 10 }}>
          <button onClick={() => setActiveTab('add')} style={{ fontWeight: activeTab === 'add' ? 'bold' : 'normal', background: activeTab === 'add' ? '#2563eb' : '#f1f5f9', color: activeTab === 'add' ? '#fff' : '#2563eb', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.2rem', fontSize: '1.1rem', cursor: 'pointer' }}>Add Item</button>
          <button onClick={() => setActiveTab('vienna')} style={{ fontWeight: activeTab === 'vienna' ? 'bold' : 'normal', background: activeTab === 'vienna' ? '#2563eb' : '#f1f5f9', color: activeTab === 'vienna' ? '#fff' : '#2563eb', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.2rem', fontSize: '1.1rem', cursor: 'pointer' }}>Vienna</button>
          <button onClick={() => setActiveTab('innsbruck')} style={{ fontWeight: activeTab === 'innsbruck' ? 'bold' : 'normal', background: activeTab === 'innsbruck' ? '#2563eb' : '#f1f5f9', color: activeTab === 'innsbruck' ? '#fff' : '#2563eb', border: 'none', borderRadius: '0.5rem', padding: '0.7rem 1.2rem', fontSize: '1.1rem', cursor: 'pointer' }}>Innsbruck</button>
        </div>
      )}
      {/* Add Item */}
      {(!isMobile || activeTab === 'add') && (
        <div style={{ flex: 1, minWidth: '0', padding: '3rem 2rem', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 10px #e0e7ef', borderRadius: isMobile ? '0' : '0 2rem 2rem 0', height: isMobile ? 'auto' : '100%', overflowY: 'auto', boxSizing: 'border-box' }}>
          <h2 style={{ fontSize: '2rem', marginBottom: '2rem', color: '#2d3748' }}>Add Item</h2>
          <div className="add-item" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem', width: '100%', maxWidth: '400px', minWidth: '0', background: '#f1f5f9', padding: '2rem', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', margin: '2rem auto', boxSizing: 'border-box', alignItems: 'stretch', justifyContent: 'center' }}>
            <select value={site} onChange={e => setSite(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              <option value="vienna">Vienna</option>
              <option value="innsbruck">Innsbruck</option>
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
            <select value={type} onChange={e => setType(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', width: '100%' }}>
              <option value="refill">Supplies</option>
              <option value="stable">Equipment</option>
            </select>
            <button onClick={handleAdd} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', marginTop: '1rem' }}>Add Item</button>
          </div>
        </div>
      )}
      {/* Vienna Column */}
      {(!isMobile || activeTab === 'vienna') && (
        <div style={{ flex: 1, background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '2rem', minWidth: isMobile ? '0' : '400px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.7rem', marginBottom: '1.5rem', color: '#2563eb' }}>Vienna</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
            {itemsVienna.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsVienna]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1))
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{ margin: '0 auto 2rem auto', background: '#f1f5f9', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.2rem', maxWidth: '600px', width: '100%', minWidth: '0', overflowX: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {editIndex === originalIdx && editSite === 'vienna' ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px', flex: 1 }}
                        />
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '60px', flex: 1 }}
                        />
                        <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px', flex: 1 }}>
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={handleSave} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Save</button>
                        <button onClick={() => setEditIndex(null)} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#334155', minWidth: '80px', flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', flex: 1 }}>Amount: {item.amount}</span>
                        <span style={{ fontSize: '1.1rem', color: item.type === 'refill' && item.amount < LOW_STOCK ? '#ef4444' : '#22c55e', fontWeight: 'bold', minWidth: '80px', flex: 1 }}>
                          {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                        </span>
                        {item.type === 'refill' && item.amount < LOW_STOCK && (
                          <span className="alert" style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '80px', flex: 1 }}>⚠️ Low stock!</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(originalIdx, 'vienna')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Edit</button>
                        <button onClick={() => handleDelete(originalIdx, 'vienna')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
      {/* Innsbruck Column */}
      {(!isMobile || activeTab === 'innsbruck') && (
        <div style={{ flex: 1, background: '#fff', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '2rem', minWidth: isMobile ? '0' : '400px', height: isMobile ? 'auto' : '100%', overflowY: 'auto', marginTop: isMobile ? '2rem' : '0' }}>
          <h2 style={{ fontSize: '1.7rem', marginBottom: '1.5rem', color: '#2563eb' }}>Innsbruck</h2>
          <ul className="item-list" style={{ listStyle: 'none', padding: 0 }}>
            {itemsInnsbruck.length === 0 && <p style={{ color: '#64748b' }}>No items yet.</p>}
            {[...itemsInnsbruck]
              .map((item, originalIdx) => ({ item, originalIdx }))
              .sort((a, b) => (a.item.type === 'refill' ? -1 : 1) - (b.item.type === 'refill' ? -1 : 1))
              .map(({ item, originalIdx }) => (
                <li key={originalIdx} style={{ margin: '0 auto 2rem auto', background: '#f1f5f9', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.2rem', maxWidth: '600px', width: '100%', minWidth: '0', overflowX: 'hidden', boxSizing: 'border-box', display: 'flex', flexDirection: 'column', gap: '0.7rem' }}>
                  {editIndex === originalIdx && editSite === 'innsbruck' ? (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <input
                          type="text"
                          value={editName}
                          onChange={e => setEditName(e.target.value)}
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px', flex: 1 }}
                        />
                        <input
                          type="number"
                          value={editAmount}
                          onChange={e => setEditAmount(e.target.value)}
                          style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '60px', flex: 1 }}
                        />
                        <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px', flex: 1 }}>
                          <option value="refill">Supplies</option>
                          <option value="stable">Equipment</option>
                        </select>
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={handleSave} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Save</button>
                        <button onClick={() => setEditIndex(null)} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Cancel</button>
                      </div>
                    </>
                  ) : (
                    <>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#334155', minWidth: '80px', flex: 1 }}>{item.name}</span>
                        <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '60px', flex: 1 }}>Amount: {item.amount}</span>
                        <span style={{ fontSize: '1.1rem', color: item.type === 'refill' && item.amount < LOW_STOCK ? '#ef4444' : '#22c55e', fontWeight: 'bold', minWidth: '80px', flex: 1 }}>
                          {item.type === 'refill' ? 'Supplies' : 'Equipment'}
                        </span>
                        {item.type === 'refill' && item.amount < LOW_STOCK && (
                          <span className="alert" style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '80px', flex: 1 }}>⚠️ Low stock!</span>
                        )}
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'row', gap: '1rem', justifyContent: 'flex-end' }}>
                        <button onClick={() => handleEdit(originalIdx, 'innsbruck')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Edit</button>
                        <button onClick={() => handleDelete(originalIdx, 'innsbruck')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Delete</button>
                      </div>
                    </>
                  )}
                </li>
              ))}
          </ul>
        </div>
      )}
    </div>
  );
}

export default App;
