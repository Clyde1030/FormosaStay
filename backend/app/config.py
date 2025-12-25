# app/config.py
from pydantic_settings import BaseSettings
from typing import Optional

class Settings(BaseSettings):
    # Database settings - support both full URL and individual components
    DATABASE_URL: Optional[str] = None  # Full connection string (preferred for Supabase)
    DATABASE_USER: Optional[str] = None
    DATABASE_PASSWORD: Optional[str] = None
    DATABASE_HOST: Optional[str] = None
    DATABASE_PORT: int = 5432
    DATABASE_NAME: Optional[str] = None
    DATABASE_SSL_MODE: Optional[str] = None  # Optional: require, prefer, verify-ca, verify-full, disable

    # Full async DB URL
    @property
    def async_database_url(self) -> str:
        """Returns the async database URL, parsing from DATABASE_URL if provided."""
        if self.DATABASE_URL:
            url = self.DATABASE_URL.strip()
            
            # Convert scheme to asyncpg format
            # Handle postgresql:// and postgres://
            if url.startswith('postgresql://'):
                url = url.replace('postgresql://', 'postgresql+asyncpg://', 1)
            elif url.startswith('postgres://'):
                url = url.replace('postgres://', 'postgresql+asyncpg://', 1)
            elif not url.startswith('postgresql+asyncpg://'):
                # If it's already asyncpg or unknown, try to ensure it's correct
                if '+asyncpg' not in url.split('://')[0]:
                    # Unknown scheme, try to add asyncpg
                    parts = url.split('://', 1)
                    if len(parts) == 2:
                        url = f"{parts[0]}+asyncpg://{parts[1]}"
            
            # Remove any sslmode query parameters (asyncpg doesn't use URL params for SSL)
            if '?sslmode=' in url or '&sslmode=' in url:
                from urllib.parse import urlparse, urlencode, parse_qs
                parsed = urlparse(url)
                query_params = parse_qs(parsed.query)
                query_params.pop('sslmode', None)  # Remove sslmode if present
                query_string = urlencode(query_params, doseq=True)
                url = f"{parsed.scheme}://{parsed.netloc}{parsed.path}"
                if query_string:
                    url = f"{url}?{query_string}"
            
            return url
        elif all([self.DATABASE_USER, self.DATABASE_PASSWORD, self.DATABASE_HOST, self.DATABASE_NAME]):
            # Fallback to individual components
            url = f"postgresql+asyncpg://{self.DATABASE_USER}:{self.DATABASE_PASSWORD}@{self.DATABASE_HOST}:{self.DATABASE_PORT}/{self.DATABASE_NAME}"
            return url
        else:
            raise ValueError(
                "Either DATABASE_URL or all individual database components (DATABASE_USER, DATABASE_PASSWORD, DATABASE_HOST, DATABASE_NAME) must be provided"
            )
    
    @property
    def sync_database_url(self) -> str:
        """Returns the sync database URL, parsing from DATABASE_URL if provided."""
        return self.DATABASE_URL.replace("postgresql://", "postgresql+psycopg://", 1)

    # Check if SSL is required
    @property
    def requires_ssl(self) -> bool:
        """Check if SSL is required (e.g., for Supabase connections)."""
        # Check for explicit SSL mode setting first
        if self.DATABASE_SSL_MODE:
            ssl_mode = self.DATABASE_SSL_MODE.lower().strip()
            if ssl_mode in ('require', 'prefer', 'verify-ca', 'verify-full'):
                return True
            elif ssl_mode == 'disable':
                return False
        
        # Auto-detect for Supabase (always requires SSL)
        if self.DATABASE_URL:
            return 'supabase.co' in self.DATABASE_URL.lower()
        elif self.DATABASE_HOST:
            return 'supabase.co' in self.DATABASE_HOST.lower()
        
        return False

    # App settings
    APP_NAME: str = "FormosaStay"
    DEBUG: bool = True

    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"

# Singleton instance
settings = Settings()