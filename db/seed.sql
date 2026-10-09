-- MessMate Seed Data
-- Sample data for development and testing

-- ============================================================
-- DROP TABLES (in dependency order)
-- ============================================================
DROP TABLE IF EXISTS notices CASCADE;
DROP TABLE IF EXISTS payments CASCADE;
DROP TABLE IF EXISTS bazar_expenses CASCADE;
DROP TABLE IF EXISTS meals CASCADE;
DROP TABLE IF EXISTS members CASCADE;
DROP TABLE IF EXISTS mess_groups CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================================
-- INSERT: mess_groups
-- ============================================================
INSERT INTO mess_groups (id, name, code, description, manager_id, created_at, updated_at) VALUES
(1, 'North Hostel Mess', 'NTH-MESS', 'Main mess for North Campus residents', NULL, NOW(), NOW()),
(2, 'South Campus Hostel', 'SCH-MESS', 'Hostel mess for South Campus students', NULL, NOW(), NOW()),
(3, 'East Wing Mess', 'EWN-MESS', 'Exp residential wing mess', NULL, NOW(), NOW());

-- ============================================================
-- INSERT: users
-- ============================================================
INSERT INTO users (id, username, email, password_hash, full_name, role, mess_group_id, is_active, created_at, updated_at) VALUES
(1, 'superadmin', 'superadmin@messmate.com', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'System Administrator', 'admin', NULL, TRUE, NOW(), NOW()),
(2, 'mgr_nth', 'mgr.nth@mss.cm', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Rahul Sharma', 'manager', 1, TRUE, NOW(), NOW()),
(3, 'mck', 'mck@mss.cm', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Meera Krishnan', 'manager', 2, TRUE, NOW(), NOW()),
(4, 'akshay', 'akshay.m@student.edu', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Akshay Patel', 'member', 1, TRUE, NOW(), NOW()),
(5, 'sneha', 'sneha.sh@student.edu', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Sneha Reddy', 'member', 1, TRUE, NOW(), NOW()),
(6, 'vijay', 'vijay.p@student.edu', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Vijay Rao', 'member', 2, TRUE, NOW(), NOW()),
(7, 'priya', 'priya.ag@student.edu', '$2b$12$LQKZ7w3jB0v3J4x5y6z7K.9u8i0h1g2f3d4e5r6s7t8u9v0w1x2y3z', 'Priya Gupta', 'member', 3, TRUE, NOW(), NOW());

-- ============================================================
-- INSERT: members
-- ============================================================
INSERT INTO members (id, mess_group_id, roll_number, name, hall, room, batch, phone, email, status, created_at, updated_at) VALUES
(1, 1, 'CSE2023001', 'Akshay Patel', 'North Hall', 'Room 101', '2023', '9876543210', 'akshay.p@student.edu', 'active', NOW(), NOW()),
(2, 1, 'CSE2023002', 'Sneha Reddy', 'North Hall', 'Room 102', '2023', '9876543211', 'sneha.sh@student.edu', 'active', NOW(), NOW()),
(3, 1, 'CSE2023003', 'Rohan Gupta', 'North Hall', 'Room 103', '2023', '9876543212', 'rohan.g@student.edu', 'active', NOW(), NOW()),
(4, 1, 'ECE2023001', 'Anjali Verma', 'North Hall', 'Room 201', '2023', '9876543213', 'anjali.v@student.edu', 'active', NOW(), NOW()),
(5, 2, 'CSE2023004', 'Vijay Rao', 'South Hostel', 'Room 301', '2023', '9876543220', 'vijay.p@student.edu', 'active', NOW(), NOW()),
(6, 2, 'CSE2023005', 'Neha Singh', 'South Hostel', 'Room 302', '2023', '9876543221', 'neha.s@student.edu', 'active', NOW(), NOW()),
(7, 3, 'ME2023001', 'Priya Gupta', 'East Wing', 'Room 401', '2023', '9876543230', 'priya.ag@student.edu', 'active', NOW(), NOW());

-- ============================================================
-- INSERT: meals
-- ============================================================
INSERT INTO meals (id, mess_group_id, meal_date, meal_type, menu_items, quantity, cost_per_head, created_by, created_at, updated_at) VALUES
(1, 1, '2026-01-01', 'breakfast', 'Poha, Chai, Fruit', 120, 25.00, 2, NOW(), NOW()),
(2, 1, '2026-01-01', 'lunch', 'Rice, Dal, Chana, Veg, Roti, Salad', 120, 60.00, 2, NOW(), NOW()),

-- ============================================================
-- INSERT: bazar_expenses
-- ============================================================
INSERT INTO bazar_expenses (id, mess_group_id, expense_date, category, description, amount, vendor, payment_method, notes, created_by, created_at, updated_at) VALUES
(1, 1, '2026-01-02', 'food', 'Vegetable supply - Green House', 2500.00, 'Green Basket', 'Cash', 'Jan 2026 vegetable delivery', 2, NOW(), NOW()),
(2, 1, '2026-01-02', 'food', 'Rice and Dal purchase', 1800.00, 'Grain World', 'Cash', 'Monthly rice and pulse stock', 2, NOW(), NOW()),
(3, 1, '2026-01-03', 'utility', 'Electricity bill - mess kitchen', 1200.00, 'Power Grid', 'Online', 'January electricity', 2, NOW(), NOW()),
(4, 1, '2026-01-04', 'medicine', 'First aid kit and medicines', 800.00, 'HealthPlus Pharmacy', 'Cash', 'Basic first aid stock', 2, NOW(), NOW()),
(5, 1, '2026-01-05', 'repair', 'Faucet repair in kitchen', 500.00, 'Hardware Hub', 'Cash', 'Kitchen faucet replacement', 2, NOW(), NOW()),
(6, 1, '2026-01-06', 'food', 'Snacks and tea supplies', 600.00, 'Snack Bazar', 'Cash', 'Snack items for monthly meetings', 2, NOW(), NOW()),
(7, 2, '2026-01-02', 'food', 'Vegetable supply', 1800.00, 'Green Basket', 'Cash', 'Jan 2026 vegetable delivery', 3, NOW(), NOW()),
(8, 2, '2026-01-03', 'food', 'Rice and Dal purchase', 1400.00, 'Grain World', 'Cash', 'Monthly rice and pulse stock', 3, NOW(), NOW()),
(9, 2, '2026-01-05', 'utility', 'Water bill', 900.00, 'Water Board', 'Online', 'January water charges', 3, NOW(), NOW());

-- ============================================================
-- INSERT: payments
-- ============================================================
INSERT INTO payments (id, member_id, mess_group_id, payment_month, amount, payment_date, payment_method, status, notes, created_at, updated_at) VALUES
(1, 1, 1, '2026-01', 600.00, '2026-01-05', 'Cash', 'paid', 'January 2026 dues paid', NOW(), NOW()),
(2, 2, 1, '2026-01', 600.00, '2026-01-05', 'Cash', 'paid', 'January 2026 dues paid', NOW(), NOW()),
(3, 3, 1, '2026-01', 600.00, '2026-01-05', 'Cash', 'paid', 'January 2026 dues paid', NOW(), NOW()),
(4, 4, 1, '2026-01', 600.00, '2026-01-06', 'Cash', 'paid', 'January 2026 dues paid', NOW(), NOW()),
(5, 1, 1, '2026-02', 600.00, '2026-02-05', 'Cash', 'paid', 'February 2026 dues paid', NOW(), NOW()),
(6, 2, 1, '2026-02', 600.00, '2026-02-05', 'Cash', 'partial', 'Paid 400 of 600', NOW(), NOW()),
(7, 3, 1, '2026-02', 600.00, NULL, 'Cash', 'pending', 'Awaiting payment', NOW(), NOW()),
(8, 4, 1, '2026-02', 600.00, '2026-02-08', 'Cash', 'paid', 'February 2026 dues paid', NOW(), NOW()),
(9, 5, 2, '2026-01', 600.00, '2026-01-05', 'Cash', 'paid', 'January 2026 dues paid', NOW(), NOW()),
(10, 6, 2, '2026-01', 600.00, NULL, 'Cash', 'pending', 'Awaiting payment', NOW(), NOW());

-- ============================================================
-- INSERT: notices
-- ============================================================
INSERT INTO notices (id, mess_group_id, title, content, is_pinned, created_by, created_at, updated_at) VALUES
(1, 1, 'Meal Timings for January', 'New meal timings effective from Jan 15: Breakfast 8:00-8:45 AM, Lunch 1:00-2:00 PM, Dinner 7:30-8:30 PM. Please adhere to the timings.', TRUE, 2, NOW(), NOW()),
(2, 1, 'Kitchen Closure Notification', 'The kitchen will be closed on Jan 19 (Sunday) for monthly maintenance. No meals will be served.', FALSE, 2, NOW(), NOW()),
(3, 2, 'New Billing Cycle', 'Billing cycle changed from monthly to bi-weekly starting Feb 2026. New meal plans will be introduced.', FALSE, 3, NOW(), NOW()),
(4, 3, 'Holiday Notice', 'No meals served on Feb 14 (Valentine\'s Day) and Feb 15 (Shivaratri).', FALSE, 2, NOW(), NOW());

(3, 1, '2026-01-01', 'dinner', 'Rice, Curry, Roti, Curd', 115, 55.00, 2, NOW(), NOW()),
(4, 1, '2026-01-02', 'breakfast', 'Upma, Chai, Boiled Eggs', 118, 25.00, 2, NOW(), NOW()),
(5, 1, '2026-01-02', 'lunch', 'Rice, Rajma, Boulette, Veg, Roti', 118, 60.00, 2, NOW(), NOW()),
(6, 1, '2026-01-02', 'dinner', 'Rice, Dal, Veg, Roti, Salad', 110, 55.00, 2, NOW(), NOW()),
(7, 1, '2026-01-03', 'breakfast', 'Bread, Butter, Omelette, Chai', 120, 25.00, 2, NOW(), NOW()),
(8, 1, '2026-01-03', 'lunch', 'Roti, Curry, Rice, Dal, Salad', 115, 55.00, 2, NOW(), NOW()),
(9, 1, '2026-01-03', 'dinner', 'Roti, Veg, Rice, Curd', 112, 50.00, 2, NOW(), NOW()),
(10, 2, '2026-01-01', 'lunch', 'Rice, Dal, Chana, Veg, Roti, Salad', 90, 60.00, 3, NOW(), NOW()),
(11, 2, '2026-01-01', 'dinner', 'Roti, Curry, Rice, Curd', 85, 55.00, 3, NOW(), NOW()),
(12, 2, '2026-01-02', 'breakfast', 'Poha, Chai, Fruit', 90, 25.00, 3, NOW(), NOW()),
(13, 2, '2026-01-02', 'lunch', 'Roti, Veg, Rice, Dal, Salad', 88, 55.00, 3, NOW(), NOW()),
(14, 2, '2026-01-02', 'dinner', 'Roti, Curry, Rice, Curd', 85, 50.00, 3, NOW(), NOW());
