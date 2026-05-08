import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Droplets, TrendingUp, Truck, Plus } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function Dashboard() {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalRecords: 0,
    totalPetrol: 0,
    totalDiesel: 0,
  });
  
  const [recentRecords, setRecentRecords] = useState([]);

  useEffect(() => {
    fetchDashboardData();
  }, []);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);
      const { data, error } = await supabase
        .from('unload_records')
        .select('*')
        .order('unload_date', { ascending: false });
        
      if (error) throw error;
      
      if (data) {
        setRecentRecords(data.slice(0, 5)); // Show only top 5 recent unloads
        
        // Calculate stats
        let petrol = 0;
        let diesel = 0;
        
        data.forEach(record => {
          const readings = record.tank_readings;
          if (readings) {
            if (readings.tank1?.unloadVol) petrol += Number(readings.tank1.unloadVol);
            if (readings.tank2?.unloadVol) petrol += Number(readings.tank2.unloadVol);
            if (readings.tank3?.unloadVol) diesel += Number(readings.tank3.unloadVol);
          }
        });
        
        setStats({
          totalRecords: data.length,
          totalPetrol: petrol,
          totalDiesel: diesel,
        });
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setLoading(false);
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
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Dashboard Overview</h1>
        <button className="btn btn-primary" onClick={() => navigate('/add-record')}>
          <Plus size={18} />
          Add Unload Record
        </button>
      </div>
      
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '2rem' }}>
        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: 'var(--primary-light)', borderRadius: '0.5rem', color: 'var(--primary)' }}>
            <TrendingUp size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Total Records</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalRecords}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#dcfce7', borderRadius: '0.5rem', color: '#166534' }}>
            <Droplets size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Petrol Unloaded (L)</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalPetrol.toLocaleString()}</h2>
          </div>
        </div>

        <div className="card" style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ padding: '1rem', backgroundColor: '#fee2e2', borderRadius: '0.5rem', color: '#991b1b' }}>
            <Truck size={24} />
          </div>
          <div>
            <p style={{ color: 'var(--text-muted)', fontSize: '0.875rem', fontWeight: '500' }}>Diesel Unloaded (L)</p>
            <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>{stats.totalDiesel.toLocaleString()}</h2>
          </div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
        <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold' }}>Recent Unloads</h2>
        <button className="btn" onClick={() => navigate('/records')} style={{ backgroundColor: 'transparent', color: 'var(--primary)', border: 'none', padding: 0 }}>
          View All &rarr;
        </button>
      </div>
      <div className="card table-container">
        {loading ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>Loading dashboard...</p>
        ) : recentRecords.length === 0 ? (
          <p style={{ padding: '1rem', color: 'var(--text-muted)', textAlign: 'center' }}>No recent records found.</p>
        ) : (
          <table className="data-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Fuel Type</th>
                <th>Quantity (L)</th>
                <th>Tanker No.</th>
              </tr>
            </thead>
            <tbody>
              {recentRecords.map(record => {
                const fuelType = getFuelType(record.tanks_unloaded);
                const quantity = getQuantity(record.tank_readings);
                return (
                  <tr key={record.id}>
                    <td>{new Date(record.unload_date).toLocaleDateString()}</td>
                    <td>
                      <span className={`badge ${fuelType.includes('Petrol') ? 'badge-petrol' : 'badge-diesel'}`}>
                        {fuelType}
                      </span>
                    </td>
                    <td>{quantity.toLocaleString()}</td>
                    <td>{record.tanker_number}</td>
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
