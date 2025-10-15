-- ============================================
-- DATA EXPORT FOR PHARMACY MANAGEMENT SYSTEM
-- ============================================
-- Run this script AFTER running SUPABASE_SCHEMA.sql
-- This will populate your new Supabase database with existing data

-- ============================================
-- 1. MEDICINE CATEGORIES
-- ============================================
INSERT INTO public.medicine_categories (id, name, description, created_at) VALUES
  ('ed651f1c-4b09-4f91-88d5-483c3aef6dc1', 'Antibiotics', 'Medicines that fight bacterial infections', '2025-10-13 11:24:51.051671+00'),
  ('fdf7d041-7d1a-4607-933a-11caf07d146e', 'Pain Relief', 'Analgesics and pain management medications', '2025-10-13 11:24:51.051671+00'),
  ('96f25b5b-ec67-48a3-8247-3d0dcb3dc1c5', 'Vitamins', 'Vitamin and mineral supplements', '2025-10-13 11:24:51.051671+00'),
  ('a758093d-ef56-45d9-a6d6-ae63eb2d054a', 'Cardiovascular', 'Heart and blood pressure medications', '2025-10-13 11:24:51.051671+00'),
  ('05bdb094-e14f-4d93-bd00-55a4712bd4d5', 'Respiratory', 'Asthma, cough, and cold medications', '2025-10-13 11:24:51.051671+00'),
  ('f50feeb2-43b4-442c-8e32-fa0225047144', 'Gastrointestinal', 'Digestive system medications', '2025-10-13 11:24:51.051671+00'),
  ('e1f8d233-b136-44a8-8b13-d56a41cebbb8', 'Diabetes', 'Blood sugar management medications', '2025-10-13 11:24:51.051671+00'),
  ('5b60f701-4abf-4fc3-bce9-d8dc3285ab91', 'Dermatology', 'Skin care and treatment medications', '2025-10-13 11:24:51.051671+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 2. MEDICINES
-- ============================================
INSERT INTO public.medicines (id, name, generic_name, category_id, manufacturer, batch_number, expiry_date, unit_price, quantity_in_stock, reorder_level, created_at, updated_at) VALUES
  ('aebda115-13e0-4ba5-a864-13d62f19138d', 'Amoxicillin 500mg', 'Amoxicillin', 'ed651f1c-4b09-4f91-88d5-483c3aef6dc1', 'PharmaCorp', 'AMX-2024-001', '2026-12-31', 12.50, 150, 20, '2025-10-13 11:27:49.933157+00', '2025-10-13 11:27:49.933157+00'),
  ('9167115e-6ca9-4c8f-9659-93514b13f59a', 'Ibuprofen 400mg', 'Ibuprofen', 'fdf7d041-7d1a-4607-933a-11caf07d146e', 'HealthMed', 'IBU-2024-002', '2026-06-30', 8.99, 200, 30, '2025-10-13 11:27:49.933157+00', '2025-10-13 11:27:49.933157+00'),
  ('1e020929-b421-44ac-a8a6-ea84794734c7', 'Vitamin C 1000mg', 'Ascorbic Acid', '96f25b5b-ec67-48a3-8247-3d0dcb3dc1c5', 'VitaLife', 'VTC-2024-003', '2027-03-15', 15.99, 8, 15, '2025-10-13 11:27:49.933157+00', '2025-10-13 11:27:49.933157+00'),
  ('b5c89820-4c8e-4cbf-94af-0e5e7bbf2707', 'Metformin 500mg', 'Metformin HCl', 'e1f8d233-b136-44a8-8b13-d56a41cebbb8', 'DiabCare', 'MET-2024-004', '2026-09-30', 6.50, 180, 25, '2025-10-13 11:27:49.933157+00', '2025-10-13 11:27:49.933157+00'),
  ('fa066f55-7c7f-42e0-8092-9bcbd355fa8a', 'Omeprazole 20mg', 'Omeprazole', 'f50feeb2-43b4-442c-8e32-fa0225047144', 'GastroMed', 'OME-2024-005', '2026-11-30', 11.25, 95, 20, '2025-10-13 11:27:49.933157+00', '2025-10-13 11:27:49.933157+00')
ON CONFLICT (id) DO NOTHING;

-- ============================================
-- 3. SALES DATA
-- ============================================
-- NOTE: Sales data includes user_id references (sold_by field)
-- These will only work if you manually create the same users in your new Supabase instance
-- OR you can skip this section and start fresh with new sales data

-- Uncomment the following if you want to import sales history
-- Make sure the user IDs exist in your new database first!

/*
INSERT INTO public.sales (id, medicine_id, quantity, unit_price, total_price, customer_name, customer_phone, sold_by, sale_date, notes) VALUES
  ('62283f7b-3e65-4f98-8254-f188a04fff6f', '9167115e-6ca9-4c8f-9659-93514b13f59a', 50, 8.99, 449.50, 'eiv', '777777777777', '5d660bff-0f56-461f-a7e3-c092ea614772', '2025-10-13 11:29:36.435887+00', '')
ON CONFLICT (id) DO NOTHING;
*/

-- ============================================
-- VERIFICATION QUERIES
-- ============================================
-- Run these after the import to verify your data

-- Check categories count (should be 8)
-- SELECT COUNT(*) as category_count FROM medicine_categories;

-- Check medicines count (should be 5)
-- SELECT COUNT(*) as medicine_count FROM medicines;

-- Check sales count
-- SELECT COUNT(*) as sales_count FROM sales;

-- View all medicines with category names
-- SELECT m.name, m.quantity_in_stock, m.unit_price, mc.name as category
-- FROM medicines m
-- JOIN medicine_categories mc ON m.category_id = mc.id
-- ORDER BY mc.name, m.name;

-- Success message
DO $$
BEGIN
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Data import completed!';
  RAISE NOTICE '========================================';
  RAISE NOTICE 'Imported:';
  RAISE NOTICE '  - 8 Medicine Categories';
  RAISE NOTICE '  - 5 Medicines';
  RAISE NOTICE '  - Sales data (if uncommented)';
  RAISE NOTICE '';
  RAISE NOTICE 'Next Steps:';
  RAISE NOTICE '1. Create users via Authentication > Users';
  RAISE NOTICE '2. Assign roles using user_roles table';
  RAISE NOTICE '3. Start using your application!';
  RAISE NOTICE '========================================';
END $$;
