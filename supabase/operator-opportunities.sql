-- Operator-owned opportunities for the real operator dashboard.
ALTER TABLE opportunities
ADD COLUMN IF NOT EXISTS operator_id UUID REFERENCES profiles(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS opportunities_operator_id_idx
ON opportunities(operator_id);
