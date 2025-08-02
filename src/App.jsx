import { useState, useEffect } from 'react';
import './App.css';

function App() {
  const [itemsVienna, setItemsVienna] = useState(() => {
    const saved = localStorage.getItem('itemsVienna');
    return saved ? JSON.parse(saved) : [];
  });
  const [itemsInnsbruck, setItemsInnsbruck] = useState(() => {
    const saved = localStorage.getItem('itemsInnsbruck');
    return saved ? JSON.parse(saved) : [];
  });
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

  // Save to localStorage whenever items change
  useEffect(() => {
    localStorage.setItem('itemsVienna', JSON.stringify(itemsVienna));
  }, [itemsVienna]);
  useEffect(() => {
    localStorage.setItem('itemsInnsbruck', JSON.stringify(itemsInnsbruck));
  }, [itemsInnsbruck]);

  // Add item to selected site
  const handleAdd = () => {
    if (!name || !amount || isNaN(amount)) return;
    const newItem = { name, amount: Number(amount), type };
    if (site === 'vienna') {
      setItemsVienna(prev => [...prev, newItem]);
    } else {
      setItemsInnsbruck(prev => [...prev, newItem]);
    }
    setName('');
    setAmount('');
    setType('refill');
  };

  // Delete item from correct site
  const handleDelete = (idx, whichSite) => {
    if (whichSite === 'vienna') {
      setItemsVienna(itemsVienna.filter((_, i) => i !== idx));
    } else {
      setItemsInnsbruck(itemsInnsbruck.filter((_, i) => i !== idx));
    }
  };

  // Edit item from correct site
  const handleEdit = (idx, whichSite) => {
    setEditIndex(idx);
    setEditSite(whichSite);
    const item = whichSite === 'vienna' ? itemsVienna[idx] : itemsInnsbruck[idx];
    setEditName(item.name);
    setEditAmount(item.amount);
    setEditType(item.type);
  };

  // Save edited item
  const handleSave = () => {
    if (!editName || !editAmount || isNaN(editAmount)) return;
    const updatedItem = { name: editName, amount: Number(editAmount), type: editType };
    if (editSite === 'vienna') {
      const updated = itemsVienna.map((item, i) =>
        i === editIndex ? updatedItem : item
      );
      setItemsVienna(updated);
    } else {
      const updated = itemsInnsbruck.map((item, i) =>
        i === editIndex ? updatedItem : item
      );
      setItemsInnsbruck(updated);
    }
    setEditIndex(null);
    setEditName('');
    setEditAmount('');
    setEditType('refill');
    setEditSite('vienna');
  };

  return (
    <div className="inventory-app" style={{ display: isMobile ? 'block' : 'flex', minHeight: '100vh', fontFamily: 'Segoe UI, Arial, sans-serif', fontSize: '1.3rem', background: 'linear-gradient(90deg, #f8fafc 0%, #e0e7ef 100%)', boxSizing: 'border-box', width: '100vw', maxWidth: '100vw', overflow: 'hidden', margin: 0, padding: 0, position: 'fixed', top: 0, left: 0, right: 0, bottom: 0 }}>
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
        <div style={{ flex: 1, minWidth: '0', width: '100vw', padding: '3rem 2rem', background: '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', boxShadow: '2px 0 10px #e0e7ef', borderRadius: isMobile ? '0' : '0 2rem 2rem 0', height: isMobile ? 'auto' : '100vh', overflowY: 'auto', boxSizing: 'border-box' }}>
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
            <select value={type} onChange={e => setType(e.target.value)} style={{ fontSize: '1.2rem', padding: '0.7rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1' }}>
              <option value="refill">Require Refill</option>
              <option value="stable">Stable</option>
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
            {itemsVienna.map((item, idx) => (
              <li key={idx} style={{ margin: '0 auto 2rem auto', background: '#f1f5f9', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '600px', width: '100%', minWidth: '0', overflowX: 'hidden', boxSizing: 'border-box' }}>
                {editIndex === idx && editSite === 'vienna' ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '120px' }}
                    />
                    <input
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px' }}
                    />
                    <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '120px' }}>
                      <option value="refill">Require Refill</option>
                      <option value="stable">Stable</option>
                    </select>
                    <button onClick={handleSave} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Save</button>
                    <button onClick={() => setEditIndex(null)} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#334155', minWidth: '120px' }}>{item.name}</span>
                    <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '80px' }}>Amount: {item.amount}</span>
                    <span style={{ fontSize: '1.1rem', color: item.type === 'refill' && item.amount < LOW_STOCK ? '#ef4444' : '#22c55e', fontWeight: 'bold', minWidth: '120px' }}>
                      {item.type === 'refill' ? 'Require Refill' : 'Stable'}
                    </span>
                    {item.type === 'refill' && item.amount < LOW_STOCK && (
                      <span className="alert" style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '120px' }}>⚠️ Low stock!</span>
                    )}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => handleEdit(idx, 'vienna')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Edit</button>
                      <button onClick={() => handleDelete(idx, 'vienna')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Delete</button>
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
            {itemsInnsbruck.map((item, idx) => (
              <li key={idx} style={{ margin: '0 auto 2rem auto', background: '#f1f5f9', borderRadius: '1rem', boxShadow: '0 2px 8px #e0e7ef', padding: '1.2rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between', maxWidth: '95%', width: '95%', overflowX: 'auto' }}>
                {editIndex === idx && editSite === 'innsbruck' ? (
                  <>
                    <input
                      type="text"
                      value={editName}
                      onChange={e => setEditName(e.target.value)}
                      style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '120px' }}
                    />
                    <input
                      type="number"
                      value={editAmount}
                      onChange={e => setEditAmount(e.target.value)}
                      style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '80px' }}
                    />
                    <select value={editType} onChange={e => setEditType(e.target.value)} style={{ fontSize: '1.1rem', padding: '0.5rem', borderRadius: '0.5rem', border: '1px solid #cbd5e1', minWidth: '120px' }}>
                      <option value="refill">Require Refill</option>
                      <option value="stable">Stable</option>
                    </select>
                    <button onClick={handleSave} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#22c55e', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Save</button>
                    <button onClick={() => setEditIndex(null)} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Cancel</button>
                  </>
                ) : (
                  <>
                    <span style={{ fontWeight: 'bold', fontSize: '1.3rem', color: '#334155', minWidth: '120px' }}>{item.name}</span>
                    <span style={{ fontSize: '1.2rem', color: '#64748b', minWidth: '80px' }}>Amount: {item.amount}</span>
                    <span style={{ fontSize: '1.1rem', color: item.type === 'refill' && item.amount < LOW_STOCK ? '#ef4444' : '#22c55e', fontWeight: 'bold', minWidth: '120px' }}>
                      {item.type === 'refill' ? 'Require Refill' : 'Stable'}
                    </span>
                    {item.type === 'refill' && item.amount < LOW_STOCK && (
                      <span className="alert" style={{ color: '#ef4444', marginLeft: '0.5rem', fontWeight: 'bold', fontSize: '1.2rem', minWidth: '120px' }}>⚠️ Low stock!</span>
                    )}
                    <div style={{ display: 'flex', gap: '1rem' }}>
                      <button onClick={() => handleEdit(idx, 'innsbruck')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#2563eb', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Edit</button>
                      <button onClick={() => handleDelete(idx, 'innsbruck')} style={{ fontSize: '1.1rem', padding: '0.5rem 1rem', borderRadius: '0.5rem', background: '#ef4444', color: '#fff', border: 'none', cursor: 'pointer', fontWeight: 'bold', minWidth: '80px' }}>Delete</button>
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
