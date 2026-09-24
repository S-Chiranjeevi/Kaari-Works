# setup-db.ps1
# Run this once after cloning to create the PostgreSQL database, user, and schema.
# Requires PostgreSQL 15+ to be installed and psql to be on PATH.
#
# Usage: powershell -ExecutionPolicy Bypass -File setup-db.ps1

$DB_NAME = "kaari_works"
$DB_USER = "kaari"
$DB_PASS = "change_me"

Write-Host ""
Write-Host "=== Kaari Works – PostgreSQL Setup ===" -ForegroundColor Cyan
Write-Host ""

# 1. Create the role (user) if it doesn't exist
Write-Host "Creating role '$DB_USER'..." -ForegroundColor Yellow
psql -U postgres -c "DO `$`$ BEGIN IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = '$DB_USER') THEN CREATE ROLE $DB_USER LOGIN PASSWORD '$DB_PASS'; END IF; END `$`$;"

# 2. Create the database if it doesn't exist
Write-Host "Creating database '$DB_NAME'..." -ForegroundColor Yellow
psql -U postgres -c "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'" | Out-Null
$exists = psql -U postgres -t -c "SELECT COUNT(*) FROM pg_database WHERE datname='$DB_NAME';"
if ($exists.Trim() -eq "0") {
    psql -U postgres -c "CREATE DATABASE $DB_NAME OWNER $DB_USER;"
} else {
    Write-Host "Database '$DB_NAME' already exists." -ForegroundColor Gray
}

# 3. Grant privileges
Write-Host "Granting privileges..." -ForegroundColor Yellow
psql -U postgres -c "GRANT ALL PRIVILEGES ON DATABASE $DB_NAME TO $DB_USER;"
psql -U postgres -d $DB_NAME -c "GRANT ALL ON SCHEMA public TO $DB_USER;"

Write-Host ""
Write-Host "Database ready. Now run:" -ForegroundColor Green
Write-Host "  npm run db:push      (sync schema -> DB, fast for dev)" -ForegroundColor White
Write-Host "  npm run db:migrate   (create a named migration, for production use)" -ForegroundColor White
Write-Host "  npm run db:seed      (optional: insert sample data)" -ForegroundColor White
Write-Host ""