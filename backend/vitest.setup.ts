// Set required env vars before any module imports
process.env['VOYAGE_API_KEY'] = process.env['VOYAGE_API_KEY'] ?? 'test-voyage-key';
process.env['SUPABASE_URL'] = process.env['SUPABASE_URL'] ?? 'http://localhost';
process.env['SUPABASE_SERVICE_ROLE_KEY'] = process.env['SUPABASE_SERVICE_ROLE_KEY'] ?? 'test-service-role-key';
process.env['ANTHROPIC_API_KEY'] = process.env['ANTHROPIC_API_KEY'] ?? 'test-anthropic-key';
