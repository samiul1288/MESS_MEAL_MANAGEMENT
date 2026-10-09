-- MessMate PostgreSQL Schema
-- Generated for Final Lab Project
-- ============================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================
-- TABLE: mess_groups
-- Represents different hostels/mess groups in the campus
-- ============================================================
CREATE TABLE mess_groups (
    id SERIAL PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    code VARCHAR(20) UNIQUE NOT NULL,
    description TEXT
);

-- ============================================================
-- TABLE: users
-- Authentication and user accounts
-- ============================================================
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    email VARCHAR(100) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(100) NOT NULL,
    role VARCHAR(20) NOT NULL CHECK (role IN ('admin', 'manager', 'member')),
    mess_group_id INTEGER REFERENCES mess_groups(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: members
-- Member profiles within a mess group
-- ============================================================
CREATE TABLE members (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    mess_group_id INTEGER NOT NULL REFERENCES mess_groups(id) ON DELETE CASCADE,
    roll_number VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(100) NOT NULL,
    hall VARCHAR(50) NOT NULL,
    room VARCHAR(20),
    batch VARCHAR(20),
    phone VARCHAR(15),
    email VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'suspended')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: meals
-- Meal records for each mess group
-- ============================================================
CREATE TABLE meals (
    id SERIAL PRIMARY KEY,
    mess_group_id INTEGER NOT NULL REFERENCES mess_groups(id) ON DELETE CASCADE,
    meal_date DATE NOT NULL,
    meal_type VARCHAR(20) NOT NULL CHECK (meal_type IN ('breakfast', 'lunch', 'dinner', 'snack')),
    menu_items TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 0,
    cost_per_head NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    total_cost NUMERIC(10, 2) GENERATED ALWAYS AS (quantity * cost_per_head) STORED,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_meal_date_group_creator UNIQUE (mess_group_id, meal_date, meal_type, created_by)
);

-- ============================================================
-- TABLE: bazar_expenses
-- Mess expenses (food, utilities, medicine, etc.)
-- ============================================================
CREATE TABLE bazar_expenses (
    id SERIAL PRIMARY KEY,
    mess_group_id INTEGER NOT NULL REFERENCES mess_groups(id) ON DELETE CASCADE,
    expense_date DATE NOT NULL,
    category VARCHAR(30) NOT NULL CHECK (category IN ('food', 'medicine', 'repair', 'utility', 'miscellaneous')),
    description TEXT NOT NULL,
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    vendor VARCHAR(100),
    payment_method VARCHAR(30),
    notes TEXT,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- TABLE: payments
-- Member dues/contributions
-- ============================================================
CREATE TABLE payments (
    id SERIAL PRIMARY KEY,
    member_id INTEGER NOT NULL REFERENCES members(id) ON DELETE CASCADE,
    mess_group_id INTEGER NOT NULL REFERENCES mess_groups(id) ON DELETE CASCADE,
    payment_month VARCHAR(7) NOT NULL, -- Format: YYYY-MM
    amount NUMERIC(10, 2) NOT NULL DEFAULT 0.00,
    payment_date DATE,
    payment_method VARCHAR(30),
    status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('paid', 'pending', 'partial', 'overdue')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    CONSTRAINT uq_payment_month_member UNIQUE (member_id, payment_month, mess_group_id)
);

-- ============================================================
-- TABLE: notices
-- Announcements and notices for mess groups
-- ============================================================
CREATE TABLE notices (
    id SERIAL PRIMARY KEY,
    mess_group_id INTEGER NOT NULL REFERENCES mess_groups(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    is_pinned BOOLEAN DEFAULT FALSE,
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_meals_mess_group ON meals(mess_group_id);
CREATE INDEX idx_meals_meal_date ON meals(meal_date);
CREATE INDEX idx_expenses_mess_group ON bazar_expenses(mess_group_id);
CREATE INDEX idx_expenses_expense_date ON bazar_expenses(expense_date);
CREATE INDEX idx_payments_member ON payments(member_id);
CREATE INDEX idx_payments_month ON payments(payment_month);
CREATE INDEX idx_payments_mess_group ON payments(mess_group_id);
CREATE INDEX idx_notices_mess_group ON notices(mess_group_id);
CREATE INDEX idx_notices_is_pinned ON notices(is_pinned);
CREATE INDEX idx_members_mess_group ON members(mess_group_id);
CREATE INDEX idx_members_roll_number ON members(roll_number);

-- ============================================================
-- TRIGGERS: Auto-update updated_at
-- ============================================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_mess_groups_update
    BEFORE UPDATE ON mess_groups
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_users_update
    BEFORE UPDATE ON users
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_members_update
    BEFORE UPDATE ON members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_meals_update
    BEFORE UPDATE ON meals
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_bazar_expenses_update
    BEFORE UPDATE ON bazar_expenses
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_payments_update
    BEFORE UPDATE ON payments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER trg_notices_update
    BEFORE UPDATE ON notices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
