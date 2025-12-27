#!/usr/bin/env python3
"""
Test database connection script
Run with: uv run python test_db_connection.py
"""
import asyncio
from app.config import settings
from app.db.session import engine
from sqlalchemy import text

async def test_connection():
    """Test database connection"""
    print("=" * 60)
    print("Testing Database Connection")
    print("=" * 60)
    
    # Display connection info based on what's configured
    if settings.DATABASE_URL:
        from urllib.parse import urlparse
        parsed = urlparse(settings.DATABASE_URL)
        print(f"Connection String: {settings.DATABASE_URL[:50]}...")  # Show first 50 chars
        print(f"Host: {parsed.hostname}")
        print(f"Port: {parsed.port or 5432}")
        print(f"Database: {parsed.path.lstrip('/')}")
        print(f"User: {parsed.username}")
    else:
        print(f"Host: {settings.DATABASE_HOST}")
        print(f"Port: {settings.DATABASE_PORT}")
        print(f"Database: {settings.DATABASE_NAME}")
        print(f"User: {settings.DATABASE_USER}")
    print(f"SSL: {'ENABLED (required)' if settings.requires_ssl else 'DISABLED'}")
    if settings.DATABASE_SSL_MODE:
        print(f"SSL Mode: {settings.DATABASE_SSL_MODE}")
    print("-" * 60)
    
    try:
        async with engine.begin() as conn:
            # Test basic connection
            result = await conn.execute(text("SELECT 1 as test"))
            value = result.scalar()
            print(f"✅ Connection successful! Test query returned: {value}")
            
            # Test database version
            result = await conn.execute(text("SELECT version()"))
            version = result.scalar()
            print(f"✅ PostgreSQL version: {version.split(',')[0]}")
            
            # Check if tables exist
            result = await conn.execute(text("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name
            """))
            tables = [row[0] for row in result.fetchall()]
            
            if tables:
                print(f"✅ Found {len(tables)} tables:")
                for table in tables:
                    print(f"   - {table}")
            else:
                print("⚠️  No tables found. You may need to run the schema creation script.")
                print("   Run: psql -U your_user -d formosastay -f ../database_creation/FormosaStaySchema.sql")
            
            print("=" * 60)
            print("✅ Database connection test PASSED")
            print("=" * 60)
            return True
            
    except Exception as e:
        print("=" * 60)
        print("❌ Database connection test FAILED")
        print("=" * 60)
        print(f"Error: {str(e)}")
        print("\nCommon issues:")
        print("1. Wrong database credentials in .env file")
        print("2. Network/firewall blocking connection")
        print("3. DNS resolution failure (check hostname)")
        print("4. SSL/TLS connection required (Supabase needs SSL)")
        print("\nTo fix:")
        print("- For Supabase: Use DATABASE_URL=postgresql://user:pass@host:port/db in .env")
        print("- Or use individual variables: DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, etc.")
        print("- Check your .env file has correct credentials")
        print("- Verify the connection string from Supabase dashboard")
        print("=" * 60)
        return False

if __name__ == "__main__":
    success = asyncio.run(test_connection())
    exit(0 if success else 1)

