"""Setup Supabase Storage buckets for PPE Compliance System"""
import os
from dotenv import load_dotenv
from supabase import create_client, Client

# Load environment variables
load_dotenv()

SUPABASE_URL = os.getenv("SUPABASE_URL")
SUPABASE_KEY = os.getenv("SUPABASE_KEY")

if not SUPABASE_URL or not SUPABASE_KEY:
    print("❌ Error: SUPABASE_URL and SUPABASE_KEY must be set in .env file")
    exit(1)

print("=" * 70)
print("SUPABASE STORAGE SETUP")
print("=" * 70)
print(f"\nSupabase URL: {SUPABASE_URL}")
print(f"API Key: {SUPABASE_KEY[:20]}...")

# Create Supabase client
supabase: Client = create_client(SUPABASE_URL, SUPABASE_KEY)

# Buckets to create
buckets = [
    {
        "name": "violations",
        "public": True,
        "file_size_limit": 5242880,  # 5MB per file
        "allowed_mime_types": ["image/jpeg", "image/png", "image/webp"],
    },
    {
        "name": "logos",
        "public": True,
        "file_size_limit": 2097152,  # 2MB per file
        "allowed_mime_types": ["image/jpeg", "image/png", "image/svg+xml"],
    },
]

print("\n" + "=" * 70)
print("CREATING STORAGE BUCKETS")
print("=" * 70)

for bucket_config in buckets:
    bucket_name = bucket_config["name"]

    try:
        # Try to create the bucket
        result = supabase.storage.create_bucket(
            id=bucket_name,
            options={
                "public": bucket_config["public"],
                "file_size_limit": bucket_config["file_size_limit"],
                "allowed_mime_types": bucket_config["allowed_mime_types"],
            },
        )

        print(f"\n✅ Created bucket: {bucket_name}")
        print(f"   - Public: {bucket_config['public']}")
        print(f"   - Max file size: {bucket_config['file_size_limit'] / 1024 / 1024:.1f} MB")
        print(f"   - Allowed types: {', '.join(bucket_config['allowed_mime_types'])}")

    except Exception as e:
        error_message = str(e)

        # Check if bucket already exists
        if "already exists" in error_message.lower() or "duplicate" in error_message.lower():
            print(f"\n⚠️  Bucket '{bucket_name}' already exists (skipping)")
        else:
            print(f"\n❌ Error creating bucket '{bucket_name}': {e}")

# List all buckets to verify
print("\n" + "=" * 70)
print("EXISTING STORAGE BUCKETS")
print("=" * 70)

try:
    all_buckets = supabase.storage.list_buckets()

    if all_buckets:
        for bucket in all_buckets:
            print(f"\n📁 {bucket.name}")
            print(f"   - ID: {bucket.id}")
            print(f"   - Public: {bucket.public}")
            print(f"   - Created: {bucket.created_at}")
    else:
        print("\nNo buckets found.")

except Exception as e:
    print(f"\n❌ Error listing buckets: {e}")

print("\n" + "=" * 70)
print("SETUP COMPLETE!")
print("=" * 70)
print("\nYou can now upload files to these buckets:")
print("  - violations: PPE violation screenshots")
print("  - logos: Company/system logos")
print("\nView your buckets in Supabase Dashboard:")
print(f"  {SUPABASE_URL.replace('https://', 'https://supabase.com/dashboard/project/')}/storage/buckets")
print("=" * 70)
