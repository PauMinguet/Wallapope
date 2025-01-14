-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Drop existing tables if they exist
DROP TABLE IF EXISTS car_images CASCADE;
DROP TABLE IF EXISTS car_listings CASCADE;
DROP TABLE IF EXISTS car_searches CASCADE;
DROP TABLE IF EXISTS car_market_price CASCADE;

-- Create car_searches table
CREATE TABLE car_searches (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_date TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    brand VARCHAR(100) NOT NULL,
    model VARCHAR(100) NOT NULL,
    min_price DECIMAL(10,2),
    min_year INTEGER,
    search_url TEXT,
    search_parameters JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    frontend_url TEXT,
    price_range_min DECIMAL(10,2),
    market_price DECIMAL(10,2)
);

-- Create car_listings table
CREATE TABLE car_listings (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    search_id UUID REFERENCES car_searches(id) ON DELETE CASCADE,
    external_id VARCHAR(50) UNIQUE NOT NULL,
    title TEXT,
    description TEXT,
    price DECIMAL(10,2),
    currency VARCHAR(3) DEFAULT 'EUR',
    web_slug VARCHAR(255),
    distance DECIMAL(10,2),
    location JSONB,
    brand VARCHAR(100),
    model VARCHAR(100),
    year INTEGER,
    version VARCHAR(255),
    kilometers INTEGER,
    engine_type VARCHAR(50),
    gearbox VARCHAR(50),
    horsepower DECIMAL(5,2),
    seller_info JSONB,
    flags JSONB,
    external_created_at TIMESTAMP WITH TIME ZONE,
    external_updated_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create car_images table
CREATE TABLE car_images (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    listing_id UUID REFERENCES car_listings(id) ON DELETE CASCADE,
    image_urls JSONB NOT NULL,
    image_order INTEGER,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create car_market_price table
CREATE TABLE car_market_price (
    id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
    search_id UUID REFERENCES car_searches(id),
    market_price DECIMAL(10,2),
    sample_size INTEGER,
    raw_average DECIMAL(10,2),
    timestamp TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for better performance
CREATE INDEX idx_car_listings_search_id ON car_listings(search_id);
CREATE INDEX idx_car_listings_external_id ON car_listings(external_id);
CREATE INDEX idx_car_listings_brand_model ON car_listings(brand, model);
CREATE INDEX idx_car_listings_price ON car_listings(price);
CREATE INDEX idx_car_images_listing_id ON car_images(listing_id);
CREATE INDEX idx_market_price_search ON car_market_price(search_id);

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers for updated_at
CREATE TRIGGER update_car_searches_updated_at
    BEFORE UPDATE ON car_searches
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_car_listings_updated_at
    BEFORE UPDATE ON car_listings
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 