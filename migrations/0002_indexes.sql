CREATE INDEX IF NOT EXISTS idx_calls_phone ON voice_calls(phone);
CREATE INDEX IF NOT EXISTS idx_calls_status ON voice_calls(status);
CREATE INDEX IF NOT EXISTS idx_lead_scores_customer ON lead_scores(customer_id);
CREATE INDEX IF NOT EXISTS idx_quotes_customer ON insurance_quotes(customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON appointments(customer_id);
CREATE INDEX IF NOT EXISTS idx_callbacks_customer ON callbacks(customer_id);
