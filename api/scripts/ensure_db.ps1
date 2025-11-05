param(
	[string]$DatabaseName = 'library_management',
	[string]$Host = 'localhost',
	[int]$Port = 5433,
	[string]$User = 'postgres'
)

if (-not $env:PGPASSWORD) {
	throw 'Set the PGPASSWORD environment variable before running this script.'
}

$connectionString = "host=$Host port=$Port user=$User dbname=postgres"
$query = "SELECT 1 FROM pg_database WHERE datname='$DatabaseName';"

psql --set ON_ERROR_STOP=1 $connectionString -tAc $query
