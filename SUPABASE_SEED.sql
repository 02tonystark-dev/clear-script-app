-- ============================================
-- SEED DATA FOR PHARMACY MANAGEMENT SYSTEM
-- ============================================

-- Insert medicine categories
INSERT INTO public.medicine_categories (name, description) VALUES
  ('Antibiotics', 'Medications used to treat bacterial infections'),
  ('Pain Relief', 'Analgesics and pain management medications'),
  ('Vitamins', 'Dietary supplements and vitamins'),
  ('Cardiovascular', 'Heart and blood pressure medications'),
  ('Respiratory', 'Medications for respiratory conditions'),
  ('Gastrointestinal', 'Medications for digestive system'),
  ('Dermatology', 'Skin condition treatments'),
  ('Diabetes', 'Blood sugar management medications');

-- Success message
DO $$
BEGIN
  RAISE NOTICE 'Seed data inserted successfully!';
  RAISE NOTICE '8 medicine categories added';
  RAISE NOTICE '';
  RAISE NOTICE 'You can now:';
  RAISE NOTICE '- Log in to your application';
  RAISE NOTICE '- Add medicines to these categories';
  RAISE NOTICE '- Start recording sales';
END $$;
