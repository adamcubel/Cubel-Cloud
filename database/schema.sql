-- Cubel Cloud Database Schema
-- PostgreSQL 12+

-- Registration Requests Table
-- Stores new user registration requests
CREATE TABLE IF NOT EXISTS registration_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) NOT NULL,
    first_name VARCHAR(100) NOT NULL,
    last_name VARCHAR(100) NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    submitted_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_registration_requests_email ON registration_requests(email);
CREATE INDEX IF NOT EXISTS idx_registration_requests_status ON registration_requests(status);
CREATE INDEX IF NOT EXISTS idx_registration_requests_submitted_at ON registration_requests(submitted_at DESC);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_registration_requests_updated_at ON registration_requests;
CREATE TRIGGER update_registration_requests_updated_at
    BEFORE UPDATE ON registration_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE registration_requests IS 'New user registration requests';
COMMENT ON COLUMN registration_requests.email IS 'Email address of the person requesting access';
COMMENT ON COLUMN registration_requests.first_name IS 'First name of the requester';
COMMENT ON COLUMN registration_requests.last_name IS 'Last name of the requester';
COMMENT ON COLUMN registration_requests.reason IS 'Reason for requesting access to the application';
COMMENT ON COLUMN registration_requests.status IS 'Current status: pending, approved, or rejected';
COMMENT ON COLUMN registration_requests.submitted_at IS 'When the registration request was submitted';
COMMENT ON COLUMN registration_requests.processed_at IS 'When the request was approved or rejected';
COMMENT ON COLUMN registration_requests.processed_by IS 'Email of the admin who processed the request';
COMMENT ON COLUMN registration_requests.notes IS 'Optional notes from admin';

-- Access Requests Table
-- Stores user requests for application access
CREATE TABLE IF NOT EXISTS access_requests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    user_email VARCHAR(255) NOT NULL,
    user_name VARCHAR(255) NOT NULL,
    application_id VARCHAR(100) NOT NULL,
    application_name VARCHAR(255) NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'approved', 'rejected')),
    requested_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    processed_at TIMESTAMP WITH TIME ZONE,
    processed_by VARCHAR(255),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT NOW()
);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_access_requests_user_id ON access_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_status ON access_requests(status);
CREATE INDEX IF NOT EXISTS idx_access_requests_application_id ON access_requests(application_id);
CREATE INDEX IF NOT EXISTS idx_access_requests_requested_at ON access_requests(requested_at DESC);

-- Trigger to automatically update updated_at
DROP TRIGGER IF EXISTS update_access_requests_updated_at ON access_requests;
CREATE TRIGGER update_access_requests_updated_at
    BEFORE UPDATE ON access_requests
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Comments for documentation
COMMENT ON TABLE access_requests IS 'User requests for application access';
COMMENT ON COLUMN access_requests.user_id IS 'Unique identifier for the user from OIDC';
COMMENT ON COLUMN access_requests.user_email IS 'Email address of the requesting user';
COMMENT ON COLUMN access_requests.user_name IS 'Display name of the requesting user';
COMMENT ON COLUMN access_requests.application_id IS 'ID of the requested application';
COMMENT ON COLUMN access_requests.application_name IS 'Display name of the requested application';
COMMENT ON COLUMN access_requests.status IS 'Current status: pending, approved, or rejected';
COMMENT ON COLUMN access_requests.requested_at IS 'When the request was created';
COMMENT ON COLUMN access_requests.processed_at IS 'When the request was approved or rejected';
COMMENT ON COLUMN access_requests.processed_by IS 'Email of the admin who processed the request';
COMMENT ON COLUMN access_requests.notes IS 'Optional notes from admin or user';
