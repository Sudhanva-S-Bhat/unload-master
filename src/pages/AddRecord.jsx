import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { ArrowLeft, Droplets, Calendar, Hash, Truck, User, FileText, Printer } from 'lucide-react';
import { supabase } from '../lib/supabase';

export default function AddRecord() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const recordId = searchParams.get('id');
  const mode = searchParams.get('mode');
  
  const [submitting, setSubmitting] = useState(false);
  const [loading, setLoading] = useState(!!recordId);
  
  const [transporterList, setTransporterList] = useState([]);
  const [showTransporterSuggestions, setShowTransporterSuggestions] = useState(false);
  // Mock previous closing readings (this will come from your database later)
  const previousReadings = {
    pump1: { n1: '15200.50', n2: '24100.00', n3: '18500.25', n4: '31050.75' },
    pump2: { n1: '11200.50', n2: '22100.00', n3: '16600.25', n4: '32100.75' }
  };

  const getInitialNozzle = (pump, nozzle) => {
    const prevClosing = previousReadings[pump][nozzle];
    return { opening: prevClosing, closing: prevClosing, sale: '0.00' };
  };

  useEffect(() => {
    fetchTransporters();
  }, []);

  const fetchTransporters = async () => {
    try {
      const { data, error } = await supabase
        .from('unload_records')
        .select('transporter_name');
      
      if (data) {
        const uniqueTransporters = [...new Set(data.map(item => item.transporter_name))].filter(Boolean);
        setTransporterList(uniqueTransporters);
      }
    } catch (err) {
      console.error('Error fetching transporters:', err);
    }
  };

  // Calculate volume using exact paper-chart methodology:
  // Base integer volume + (decimal part * Diff of that integer)
  const getVolumeFromDip = (tankId, dipStr) => {
    const dip = parseFloat(dipStr);
    if (isNaN(dip) || dip < 0) return '';
    
    // Internal exact geometric formula
    const getGeometricVolume = (h, L, D) => {
      const r = D / 2;
      if (h <= 0) return 0;
      if (h >= D) return ((Math.PI * Math.pow(r, 2) * L) / 1000);
      const term1 = Math.pow(r, 2) * Math.acos((r - h) / r);
      const term2 = (r - h) * Math.sqrt(2 * r * h - Math.pow(h, 2));
      return (L * (term1 - term2)) / 1000;
    };

    let L, D;
    if (tankId === 'tank1' || tankId === 'tank2') {
      L = 540.90; // Exact Geometry for 16KL
      D = 200.00;
    } else {
      L = 589.40; // Exact Geometry for 22KL
      D = 225.00;
    }

    const integerDip = Math.floor(dip);
    const decimalPart = dip - integerDip;
    
    // The physical chart rounds its base volumes to 3 decimal places
    const volN = parseFloat(getGeometricVolume(integerDip, L, D).toFixed(3));
    
    if (decimalPart === 0) {
      return volN.toFixed(4);
    }
    
    // The "Diff" column on the chart for row N is exactly Vol(N) - Vol(N-1)
    const volPrev = parseFloat(getGeometricVolume(integerDip - 1, L, D).toFixed(3));
    const diffN = volN - volPrev;
    
    // Linear Interpolation using the exact Diff(N) value from the chart
    const finalVolume = volN + (decimalPart * diffN);
    return finalVolume.toFixed(4);
  };

  const initialTankReading = { openingDip: '', openingVol: '', closingDip: '', closingVol: '', unloadVolume: '' };

  const [formData, setFormData] = useState({
    unload_date: new Date().toISOString().slice(0, 16),
    tanks: [], // Stores 'tank1', 'tank2', 'tank3'
    tanker_number: '',
    invoice_number: '',
    transporter_name: '',
    tankReadings: {
      tank1: { ...initialTankReading },
      tank2: { ...initialTankReading },
      tank3: { ...initialTankReading }
    },
    pump1: {
      n1: getInitialNozzle('pump1', 'n1'),
      n2: getInitialNozzle('pump1', 'n2'),
      n3: getInitialNozzle('pump1', 'n3'),
      n4: getInitialNozzle('pump1', 'n4')
    },
    pump2: {
      n1: getInitialNozzle('pump2', 'n1'),
      n2: getInitialNozzle('pump2', 'n2'),
      n3: getInitialNozzle('pump2', 'n3'),
      n4: getInitialNozzle('pump2', 'n4')
    },
    remarks: ''
  });

  useEffect(() => {
    if (recordId) {
      fetchRecordData();
    }
  }, [recordId]);

  useEffect(() => {
    if (mode === 'print' && !loading) {
      setTimeout(() => {
        window.print();
      }, 500);
    }
  }, [mode, loading]);

  const fetchRecordData = async () => {
    try {
      const { data, error } = await supabase
        .from('unload_records')
        .select('*')
        .eq('id', recordId)
        .single();
        
      if (error) throw error;
      if (data) {
        setFormData({
          unload_date: new Date(data.unload_date).toISOString().slice(0, 16),
          invoice_number: data.invoice_number || '',
          tanker_number: data.tanker_number || '',
          transporter_name: data.transporter_name || '',
          tanks: data.tanks_unloaded || [],
          tankReadings: data.tank_readings || {
            tank1: { ...initialTankReading },
            tank2: { ...initialTankReading },
            tank3: { ...initialTankReading }
          },
          pump1: data.pump_readings?.pump1 || {
            n1: { opening: '', closing: '', sale: '0.00' }, n2: { opening: '', closing: '', sale: '0.00' }, n3: { opening: '', closing: '', sale: '0.00' }, n4: { opening: '', closing: '', sale: '0.00' }
          },
          pump2: data.pump_readings?.pump2 || {
            n1: { opening: '', closing: '', sale: '0.00' }, n2: { opening: '', closing: '', sale: '0.00' }, n3: { opening: '', closing: '', sale: '0.00' }, n4: { opening: '', closing: '', sale: '0.00' }
          },
          remarks: data.remarks || ''
        });
      }
    } catch (err) {
      console.error("Error fetching record:", err);
      // Fallback or ignore
    } finally {
      setLoading(false);
    }
  };

  const handlePumpChange = (pump, nozzle, field, value) => {
    setFormData(prev => {
      const updatedNozzle = { ...prev[pump][nozzle], [field]: value };
      
      // If editing opening, and closing was exactly matching the old opening, auto-update closing to match the new opening
      if (field === 'opening' && prev[pump][nozzle].closing === prev[pump][nozzle].opening) {
         updatedNozzle.closing = value;
      }

      // Auto-calculate sale
      const op = parseFloat(field === 'opening' ? value : prev[pump][nozzle].opening);
      const cl = parseFloat(field === 'closing' ? value : updatedNozzle.closing);
      
      if (!isNaN(op) && !isNaN(cl)) {
        updatedNozzle.sale = (cl - op).toFixed(2);
      } else {
        updatedNozzle.sale = '';
      }
      
      return { ...prev, [pump]: { ...prev[pump], [nozzle]: updatedNozzle } };
    });
  };

  const handleTankReadingChange = (tankId, field, value) => {
    setFormData(prev => {
      const updatedTank = { ...prev.tankReadings[tankId], [field]: value };
      
      if (field === 'openingDip') {
        updatedTank.openingVol = getVolumeFromDip(tankId, value);
      }
      if (field === 'closingDip') {
        updatedTank.closingVol = getVolumeFromDip(tankId, value);
      }

      return {
        ...prev,
        tankReadings: {
          ...prev.tankReadings,
          [tankId]: updatedTank
        }
      };
    });
  };

  const calculateMeterSalesForTank = (tankId) => {
    let total = 0;
    if (tankId === 'tank1') {
      total += parseFloat(formData.pump1.n3.sale || 0);
      total += parseFloat(formData.pump1.n4.sale || 0);
    } else if (tankId === 'tank2') {
      total += parseFloat(formData.pump2.n3.sale || 0);
      total += parseFloat(formData.pump2.n4.sale || 0);
    } else if (tankId === 'tank3') {
      total += parseFloat(formData.pump1.n1.sale || 0);
      total += parseFloat(formData.pump1.n2.sale || 0);
      total += parseFloat(formData.pump2.n1.sale || 0);
      total += parseFloat(formData.pump2.n2.sale || 0);
    }
    return total;
  };

  const getReconciliationData = (tankId) => {
    const tank = formData.tankReadings[tankId];
    const opVol = parseFloat(tank.openingVol) || 0;
    const clVol = parseFloat(tank.closingVol) || 0;
    const unloadVol = parseFloat(tank.unloadVolume) || 0;
    const meterSales = calculateMeterSalesForTank(tankId);
    
    let calcPurchase = (clVol - opVol) + meterSales;
    let variation = calcPurchase - unloadVol;
    
    return { 
      meterSales: meterSales > 0 ? meterSales.toFixed(2) : '0.00',
      calcPurchase: calcPurchase.toFixed(2),
      variation: variation.toFixed(2),
      color: variation < 0 ? '#dc2626' : (variation > 0 ? '#16a34a' : 'inherit')
    };
  };

  const renderTankReading = (tankId, label, fuelType, color) => {
    const reconData = getReconciliationData(tankId);
    return (
    <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
      <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <span style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.875rem' }}>{label}</span>
        <span style={{ color: color, fontSize: '0.75rem', fontWeight: 'bold' }}>{fuelType}</span>
      </h4>
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Op. Dip</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" style={{ padding: '0.5rem' }} value={formData.tankReadings[tankId].openingDip} onChange={(e) => handleTankReadingChange(tankId, 'openingDip', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Op. Vol</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" style={{ padding: '0.5rem' }} value={formData.tankReadings[tankId].openingVol} onChange={(e) => handleTankReadingChange(tankId, 'openingVol', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Cls. Dip</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" style={{ padding: '0.5rem' }} value={formData.tankReadings[tankId].closingDip} onChange={(e) => handleTankReadingChange(tankId, 'closingDip', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Cls. Vol</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" style={{ padding: '0.5rem' }} value={formData.tankReadings[tankId].closingVol} onChange={(e) => handleTankReadingChange(tankId, 'closingVol', e.target.value)} />
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '0.5rem' }}>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Unload Vol</label>
            <input type="number" step="0.01" className="form-input" placeholder="0.00" style={{ padding: '0.5rem' }} value={formData.tankReadings[tankId].unloadVolume} onChange={(e) => handleTankReadingChange(tankId, 'unloadVolume', e.target.value)} />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Meter Sales</label>
            <input type="text" className="form-input" placeholder="0.00" style={{ padding: '0.5rem', backgroundColor: 'var(--bg-body)' }} value={reconData.meterSales} readOnly />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Dip Purchase</label>
            <input type="text" className="form-input" placeholder="0.00" style={{ padding: '0.5rem', backgroundColor: 'var(--bg-body)', fontWeight: 'bold' }} value={reconData.calcPurchase} readOnly />
          </div>
          <div>
            <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Variation</label>
            <input type="text" className="form-input" placeholder="0.00" style={{ padding: '0.5rem', backgroundColor: 'var(--bg-body)', fontWeight: 'bold', color: reconData.color }} value={reconData.variation} readOnly />
          </div>
        </div>
      </div>
    </div>
  );
  };

  const renderNozzle = (pumpId, nozzleId, label, fuelType, color) => (
    <div className="form-group" style={{ marginBottom: 0, paddingBottom: '1rem', borderBottom: '1px solid var(--border-color)' }}>
      <label className="form-label" style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
        <span>{label}</span>
        <span style={{ color: color, fontSize: '0.75rem', fontWeight: 'bold' }}>{fuelType}</span>
      </label>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Opening</label>
          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={formData[pumpId][nozzleId].opening} onChange={(e) => handlePumpChange(pumpId, nozzleId, 'opening', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Closing</label>
          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={formData[pumpId][nozzleId].closing} onChange={(e) => handlePumpChange(pumpId, nozzleId, 'closing', e.target.value)} />
        </div>
        <div>
          <label style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Sale</label>
          <input type="number" step="0.01" className="form-input" placeholder="0.00" value={formData[pumpId][nozzleId].sale} onChange={(e) => handlePumpChange(pumpId, nozzleId, 'sale', e.target.value)} />
        </div>
      </div>
    </div>
  );

  const getNumericVariation = (tankId) => {
    const recon = getReconciliationData(tankId);
    return parseFloat(recon.variation) || 0;
  };

  const totalPetrolVariation = (getNumericVariation('tank1') + getNumericVariation('tank2')).toFixed(2);
  const totalDieselVariation = getNumericVariation('tank3').toFixed(2);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const recordData = {
        unload_date: formData.unload_date,
        invoice_number: formData.invoice_number,
        tanker_number: formData.tanker_number,
        transporter_name: formData.transporter_name,
        tanks_unloaded: formData.tanks,
        tank_readings: formData.tankReadings,
        pump_readings: { pump1: formData.pump1, pump2: formData.pump2 },
        total_petrol_variation: totalPetrolVariation,
        total_diesel_variation: totalDieselVariation,
        remarks: formData.remarks
      };

      if (recordId) {
        const { error } = await supabase
          .from('unload_records')
          .update(recordData)
          .eq('id', recordId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('unload_records')
          .insert([recordData]);
        if (error) throw error;
      }
      
      // Successfully saved
      navigate('/records');
    } catch (error) {
      console.error('Error saving record:', error);
      alert('Failed to save record: ' + (error.message || JSON.stringify(error)));
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="animate-fade-in">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
        <button 
          onClick={() => navigate(-1)} 
          className="btn btn-secondary"
          style={{ padding: '0.5rem', borderRadius: '50%' }}
        >
          <ArrowLeft size={20} />
        </button>
        <h1 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>
          {mode === 'print' ? 'Unload Record Details' : recordId ? 'Edit Unload Record' : 'Add New Unload Record'}
        </h1>
      </div>

      <div className="card">
        <h2 className="print-only" style={{ textAlign: 'center', fontSize: '1.5rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px dashed #999', paddingBottom: '0.5rem', letterSpacing: '2px' }}>
          SMITA ENTERPRISES
        </h2>
        <form onSubmit={handleSubmit}>
          <div className="form-group" style={{ marginBottom: '1.5rem', maxWidth: '300px' }}>
            <label className="form-label">Date & Time</label>
            <input 
              type="datetime-local" 
              className="form-input" 
              required 
              value={formData.unload_date}
              onChange={(e) => setFormData({...formData, unload_date: e.target.value})}
            />
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '180px 180px 300px', gap: '1.5rem', marginBottom: '1.5rem' }}>
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Invoice Number</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. 91022369"
                value={formData.invoice_number}
                onChange={(e) => setFormData({...formData, invoice_number: e.target.value})}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0 }}>
              <label className="form-label">Vehicle Number</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. MH04AB1234"
                value={formData.tanker_number}
                onChange={(e) => setFormData({...formData, tanker_number: e.target.value})}
              />
            </div>
            
            <div className="form-group" style={{ marginBottom: 0, position: 'relative' }}>
              <label className="form-label">Transporter Name</label>
              <input 
                type="text" 
                className="form-input" 
                required 
                placeholder="e.g. ABC Logistics"
                value={formData.transporter_name}
                onChange={(e) => {
                  setFormData({...formData, transporter_name: e.target.value});
                  setShowTransporterSuggestions(e.target.value.length >= 3);
                }}
                onFocus={(e) => setShowTransporterSuggestions(e.target.value.length >= 3)}
                onBlur={() => setTimeout(() => setShowTransporterSuggestions(false), 200)}
              />
              {showTransporterSuggestions && (
                <div className="print-only" style={{ display: 'none' }} /> /* Dummy element to prevent printing dropdown */
              )}
              {showTransporterSuggestions && (
                <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, backgroundColor: 'white', border: '1px solid #ccc', borderRadius: '4px', zIndex: 10, maxHeight: '150px', overflowY: 'auto', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}>
                  {transporterList.filter(t => t.toLowerCase().includes(formData.transporter_name.toLowerCase())).map((t, i) => (
                    <div 
                      key={i} 
                      style={{ padding: '0.5rem', cursor: 'pointer', borderBottom: '1px solid #eee' }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        setFormData({...formData, transporter_name: t});
                        setShowTransporterSuggestions(false);
                      }}
                      onMouseEnter={(e) => e.target.style.backgroundColor = '#f0f9ff'}
                      onMouseLeave={(e) => e.target.style.backgroundColor = 'white'}
                    >
                      {t}
                    </div>
                  ))}
                  {transporterList.filter(t => t.toLowerCase().includes(formData.transporter_name.toLowerCase())).length === 0 && (
                    <div style={{ padding: '0.5rem', color: '#999', fontSize: '0.875rem' }}>No past records found</div>
                  )}
                </div>
              )}
            </div>
          </div>

          <div className="form-group" style={{ marginBottom: '1.5rem' }}>
            <label className="form-label">Tanks Unloaded Into</label>
            <div style={{ display: 'flex', gap: '1rem' }}>
              {[
                { id: 'tank1', name: 'Tank 1', type: 'Petrol', color: '#16a34a', bg: '#dcfce7' },
                { id: 'tank2', name: 'Tank 2', type: 'Petrol', color: '#16a34a', bg: '#dcfce7' },
                { id: 'tank3', name: 'Tank 3', type: 'Diesel', color: '#dc2626', bg: '#fee2e2' },
              ].map(tank => (
                <label 
                  key={tank.id}
                  style={{
                    width: '150px',
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0.75rem',
                    border: `2px solid ${formData.tanks.includes(tank.id) ? tank.color : 'var(--border-color)'}`,
                    borderRadius: 'var(--radius-md)',
                    backgroundColor: formData.tanks.includes(tank.id) ? tank.bg : 'var(--bg-surface)',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.25rem' }}>
                    <input
                      type="checkbox"
                      checked={formData.tanks.includes(tank.id)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFormData({...formData, tanks: [...formData.tanks, tank.id]});
                        } else {
                          setFormData({...formData, tanks: formData.tanks.filter(t => t !== tank.id)});
                        }
                      }}
                      style={{ width: '1.1rem', height: '1.1rem', accentColor: tank.color, cursor: 'pointer' }}
                    />
                    <span style={{ fontWeight: '700', color: formData.tanks.includes(tank.id) ? tank.color : 'var(--text-main)' }}>
                      {tank.name}
                    </span>
                  </div>
                  <span style={{ fontSize: '0.75rem', fontWeight: '600', color: tank.color, backgroundColor: formData.tanks.includes(tank.id) ? 'rgba(255,255,255,0.7)' : 'transparent', padding: '0.15rem 0.5rem', borderRadius: '1rem' }}>
                    {tank.type}
                  </span>
                </label>
              ))}
            </div>
          </div>

          {formData.tanks.length > 0 && (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Tank Dip Readings</h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {formData.tanks.includes('tank1') && renderTankReading('tank1', 'Tank 1', 'Petrol', '#16a34a')}
                {formData.tanks.includes('tank2') && renderTankReading('tank2', 'Tank 2', 'Petrol', '#16a34a')}
                {formData.tanks.includes('tank3') && renderTankReading('tank3', 'Tank 3', 'Diesel', '#dc2626')}
              </div>
            </div>
          )}

          {formData.tanks.length > 0 && (
            <div className="form-group" style={{ marginBottom: '2rem' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Pump Meter Readings</h3>
              
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '2rem' }}>
                {/* Pump 1 */}
                {(formData.tanks.includes('tank1') || formData.tanks.includes('tank3')) && (
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.875rem' }}>Pump 1</span>
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {formData.tanks.includes('tank3') && renderNozzle('pump1', 'n1', 'Nozzle 1', 'Diesel', '#dc2626')}
                      {formData.tanks.includes('tank3') && renderNozzle('pump1', 'n2', 'Nozzle 2', 'Diesel', '#dc2626')}
                      {formData.tanks.includes('tank1') && renderNozzle('pump1', 'n3', 'Nozzle 3', 'Petrol (T1)', '#16a34a')}
                      {formData.tanks.includes('tank1') && renderNozzle('pump1', 'n4', 'Nozzle 4', 'Petrol (T1)', '#16a34a')}
                    </div>
                  </div>
                )}

                {/* Pump 2 */}
                {(formData.tanks.includes('tank2') || formData.tanks.includes('tank3')) && (
                  <div style={{ backgroundColor: 'var(--bg-surface)', padding: '1.5rem', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
                    <h4 style={{ fontWeight: 'bold', marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <span style={{ backgroundColor: 'var(--primary-color)', color: 'white', padding: '0.2rem 0.6rem', borderRadius: '1rem', fontSize: '0.875rem' }}>Pump 2</span>
                    </h4>
                    
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                      {formData.tanks.includes('tank3') && renderNozzle('pump2', 'n1', 'Nozzle 1', 'Diesel', '#dc2626')}
                      {formData.tanks.includes('tank3') && renderNozzle('pump2', 'n2', 'Nozzle 2', 'Diesel', '#dc2626')}
                      {formData.tanks.includes('tank2') && renderNozzle('pump2', 'n3', 'Nozzle 3', 'Petrol (T2)', '#16a34a')}
                      {formData.tanks.includes('tank2') && renderNozzle('pump2', 'n4', 'Nozzle 4', 'Petrol (T2)', '#16a34a')}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {formData.tanks.length > 0 && (
            <div className="form-group" style={{ marginBottom: '2rem', padding: '1.5rem', backgroundColor: 'var(--bg-surface)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border-color)' }}>
              <h3 style={{ fontSize: '1.125rem', fontWeight: 'bold', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.5rem' }}>Total Variation Summary</h3>
              <div style={{ display: 'flex', gap: '2rem' }}>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Total Petrol Variation</label>
                  <input type="text" className="form-input" value={totalPetrolVariation} readOnly style={{ 
                    backgroundColor: 'var(--bg-body)', 
                    fontWeight: 'bold', 
                    fontSize: '1.125rem',
                    color: parseFloat(totalPetrolVariation) < 0 ? '#dc2626' : (parseFloat(totalPetrolVariation) > 0 ? '#16a34a' : 'inherit')
                  }} />
                </div>
                <div style={{ flex: 1 }}>
                  <label style={{ fontSize: '0.875rem', color: 'var(--text-muted)', marginBottom: '0.2rem', display: 'block' }}>Total Diesel Variation</label>
                  <input type="text" className="form-input" value={totalDieselVariation} readOnly style={{ 
                    backgroundColor: 'var(--bg-body)', 
                    fontWeight: 'bold', 
                    fontSize: '1.125rem',
                    color: parseFloat(totalDieselVariation) < 0 ? '#dc2626' : (parseFloat(totalDieselVariation) > 0 ? '#16a34a' : 'inherit')
                  }} />
                </div>
              </div>
            </div>
          )}

          <div className="form-group">
            <label className="form-label">Remarks (Optional)</label>
            <textarea 
              className="form-textarea" 
              rows="4" 
              placeholder="Any additional notes or observations..."
              value={formData.remarks}
              onChange={(e) => setFormData({...formData, remarks: e.target.value})}
            ></textarea>
          </div>

          <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem', marginTop: '2rem', borderTop: '1px solid var(--border-color)', paddingTop: '1.5rem' }}>
            <button type="button" className="btn btn-secondary" onClick={() => window.print()} style={{ marginRight: 'auto' }}>
              <Printer size={18} /> Print / Save PDF
            </button>
            <button type="button" className="btn btn-secondary" onClick={() => navigate(-1)}>Cancel</button>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting ? 'Saving...' : 'Save Record'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
