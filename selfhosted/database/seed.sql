-- Insert medicine categories
INSERT INTO medicine_categories (name, description) VALUES
  ('Antibiotics', 'Medications used to treat bacterial infections'),
  ('Pain Relief', 'Analgesics and pain management medications'),
  ('Vitamins', 'Dietary supplements and vitamins'),
  ('Cardiovascular', 'Heart and blood pressure medications');

-- Note: To create an admin user, run the backend and use the signup endpoint
-- The password will be hashed automatically
-- Example: POST /api/auth/signup with { "email": "admin@pharmacare.com", "password": "admin123", "full_name": "Admin User" }
