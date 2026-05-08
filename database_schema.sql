-- Drop the old table if it exists (since we completely changed the structure)
DROP TABLE IF EXISTS unload_records;

-- Create the new, advanced unload_records table
CREATE TABLE unload_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  unload_date TIMESTAMP WITH TIME ZONE NOT NULL,
  invoice_number TEXT NOT NULL,
  tanker_number TEXT NOT NULL,
  transporter_name TEXT NOT NULL,
  tanks_unloaded JSONB NOT NULL, -- Stores array like ['tank1', 'tank3']
  tank_readings JSONB NOT NULL,  -- Stores the complex Opening/Closing dip, vol, sales, variation ledger
  pump_readings JSONB NOT NULL,  -- Stores the complex Pump Nozzle readings (n1, n2, n3, n4)
  total_petrol_variation NUMERIC,
  total_diesel_variation NUMERIC,
  remarks TEXT
);

-- Set up Row Level Security (RLS)
ALTER TABLE unload_records ENABLE ROW LEVEL SECURITY;

-- Create policies (we use 'true' for now to bypass Auth during rapid development)
CREATE POLICY "Enable read access for all" 
ON unload_records FOR SELECT 
USING (true);

CREATE POLICY "Enable insert access for all" 
ON unload_records FOR INSERT 
WITH CHECK (true);

CREATE POLICY "Enable update access for all" 
ON unload_records FOR UPDATE 
USING (true);

CREATE POLICY "Enable delete access for all" 
ON unload_records FOR DELETE 
USING (true);
