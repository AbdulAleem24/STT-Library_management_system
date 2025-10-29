$env:PGPASSWORD = 'suhail123'
$connectionString = "host=localhost port=5433 user=postgres dbname=postgres"
$checkQuery = "SELECT 1 FROM pg_database WHERE datname = 'library_management';"
$createQuery = "CREATE DATABASE library_management;"

$exists = psql --set ON_ERROR_STOP=1 $connectionString -tAc $checkQuery

if ([string]::IsNullOrWhiteSpace($exists)) {
    Write-Output 'Creating database library_management...'
    psql --set ON_ERROR_STOP=1 $connectionString -c $createQuery
} else {
    Write-Output 'Database library_management already exists.'
}
