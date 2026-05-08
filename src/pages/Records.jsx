import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Search } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Records() {
  const navigate = useNavigate();
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('unload_records')
        .select('*')
        .order('unload_date', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setRecords(data);
      }
    } catch (error) {
      console.error('Error fetching records:', error);
      setRecords([]);
    } finally {
      setLoading(false);
    }
  };

  const filteredRecords = records.filter(record => 
    record.tanker_number?.toLowerCase().includes(searchTerm.toLowerCase()) ||
    record.invoice_number?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handlePrint = (id) => {
    navigate(`/add-record?id=${id}&mode=print`);
  };

  const handleEdit = (id) => {
    navigate(`/add-record?id=${id}`);
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this record? This cannot be undone.")) {
      try {
        const { error } = await supabase
          .from('unload_records')
          .delete()
          .eq('id', id);
        
        if (error) throw error;
        
        // Refresh the list
        fetchRecords();
      } catch (error) {
        console.error('Error deleting record:', error);
        alert('Failed to delete record. Check your connection or Supabase settings.');
      }
    }
  };

  const getFuelType = (tanks) => {
    if (!tanks || tanks.length === 0) return 'Unknown';
    const hasPetrol = tanks.includes('tank1') || tanks.includes('tank2');
    const hasDiesel = tanks.includes('tank3');
    if (hasPetrol && hasDiesel) return 'Petrol + Diesel';
    if (hasPetrol) return 'Petrol';
    if (hasDiesel) return 'Diesel';
    return 'Unknown';
  };

  const getQuantity = (readings) => {
    if (!readings) return 0;
    let total = 0;
    if (readings.tank1?.unloadVol) total += Number(readings.tank1.unloadVol);
    if (readings.tank2?.unloadVol) total += Number(readings.tank2.unloadVol);
    if (readings.tank3?.unloadVol) total += Number(readings.tank3.unloadVol);
    return total;
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Recent Unloads</h1>
        <button className="btn btn-primary" onClick={() => navigate('/add-record')}>
          <Plus size={18} />
          Add Record
        </button>
      </div>

      <div className="card" style={{ marginBottom: '1.5rem' }}>
        <div style={{ position: 'relative', maxWidth: '300px' }}>
          <Search size={18} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
          <input 
            type="text" 
            placeholder="Search tanker or invoice..." 
            className="form-input"
            style={{ paddingLeft: '2.5rem' }}
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
      </div>

      <div className="card table-container">
        {loading ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading records...</p>
        ) : filteredRecords.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>No records found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Type</th>
                <th>Quantity (L)</th>
                <th>Tanker No.</th>
                <th>Invoice No.</th>
                <th>Remarks</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {filteredRecords.map(record => {
                const fuelType = getFuelType(record.tanks_unloaded);
                const quantity = getQuantity(record.tank_readings);
                
                return (
                  <tr key={record.id}>
                    <td>{new Date(record.unload_date).toLocaleString()}</td>
                    <td>
                      <span className={`badge ${fuelType.includes('Petrol') ? 'badge-petrol' : 'badge-diesel'}`}>
                        {fuelType}
                      </span>
                    </td>
                    <td>{quantity.toLocaleString()}</td>
                    <td>{record.tanker_number}</td>
                    <td>{record.invoice_number}</td>
                    <td style={{ color: 'var(--text-muted)' }}>{record.remarks || '-'}</td>
                    <td>
                      <div style={{ display: 'flex', gap: '0.5rem' }}>
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handlePrint(record.id)}>
                          Print / PDF
                        </button>
                        <button className="btn btn-secondary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={() => handleEdit(record.id)}>
                          Edit
                        </button>
                        <button className="btn" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem', backgroundColor: '#ef4444', color: 'white', border: 'none' }} onClick={() => handleDelete(record.id)}>
                          Delete
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
