$env:PGPASSWORD = 'suhail123'
$connectionString = "host=localhost port=5433 user=postgres dbname=postgres"
$query = "SELECT 1 FROM pg_database WHERE datname='library_management';"

psql --set ON_ERROR_STOP=1 $connectionString -tAc $query
