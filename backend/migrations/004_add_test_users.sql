-- Insert test users
INSERT INTO users (id, display_name, email, user_principal_name, last_synced)
VALUES 
    ('test-user-1', 'Tarun Gusain', 'tarun.gusain@gruve.ai', 'tarun.gusain@gruve.ai', CURRENT_TIMESTAMP),
    ('test-user-2', 'Prerna Mishra', 'prerna.mishra@gruve.ai', 'prerna.mishra@gruve.ai', CURRENT_TIMESTAMP)
ON CONFLICT (id) DO UPDATE SET
    display_name = EXCLUDED.display_name,
    email = EXCLUDED.email,
    user_principal_name = EXCLUDED.user_principal_name,
    last_synced = CURRENT_TIMESTAMP;
