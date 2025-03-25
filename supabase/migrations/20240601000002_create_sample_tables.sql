-- Create sample tables for the application

-- Users table
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  name TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Categories table
CREATE TABLE IF NOT EXISTS categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Products table
CREATE TABLE IF NOT EXISTS products (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  price DECIMAL(10, 2) NOT NULL,
  category_id UUID REFERENCES categories(id),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Orders table
CREATE TABLE IF NOT EXISTS orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id),
  total DECIMAL(10, 2) NOT NULL,
  status TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Insert some sample data
INSERT INTO users (email, name) VALUES
  ('user1@example.com', 'John Doe'),
  ('user2@example.com', 'Jane Smith'),
  ('user3@example.com', 'Bob Johnson')
ON CONFLICT (email) DO NOTHING;

INSERT INTO categories (name, description) VALUES
  ('Electronics', 'Electronic devices and accessories'),
  ('Clothing', 'Apparel and fashion items'),
  ('Books', 'Books and publications')
ON CONFLICT DO NOTHING;

-- Get category IDs for reference
DO $$
DECLARE
  electronics_id UUID;
  clothing_id UUID;
  books_id UUID;
BEGIN
  SELECT id INTO electronics_id FROM categories WHERE name = 'Electronics' LIMIT 1;
  SELECT id INTO clothing_id FROM categories WHERE name = 'Clothing' LIMIT 1;
  SELECT id INTO books_id FROM categories WHERE name = 'Books' LIMIT 1;
  
  INSERT INTO products (name, description, price, category_id) VALUES
    ('Smartphone', 'Latest model smartphone', 999.99, electronics_id),
    ('Laptop', 'High-performance laptop', 1499.99, electronics_id),
    ('T-shirt', 'Cotton t-shirt', 19.99, clothing_id),
    ('Jeans', 'Denim jeans', 49.99, clothing_id),
    ('Novel', 'Bestselling fiction novel', 14.99, books_id),
    ('Textbook', 'Computer science textbook', 79.99, books_id)
  ON CONFLICT DO NOTHING;
  
  -- Insert sample orders using the first user
  INSERT INTO orders (user_id, total, status) 
  SELECT 
    (SELECT id FROM users LIMIT 1),
    random() * 1000,
    status
  FROM 
    unnest(ARRAY['pending', 'processing', 'completed', 'shipped', 'cancelled']) AS status
  ON CONFLICT DO NOTHING;
END;
$$;

-- Enable realtime for tables
ALTER PUBLICATION supabase_realtime ADD TABLE users;
ALTER PUBLICATION supabase_realtime ADD TABLE products;
ALTER PUBLICATION supabase_realtime ADD TABLE categories;
ALTER PUBLICATION supabase_realtime ADD TABLE orders;
