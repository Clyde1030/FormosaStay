#!/usr/bin/env python3
"""
Database Management Script for FormosaStay

This script provides utilities to backup, reset, and restore the database.

Usage:
    uv run python database/db_manager.py backup [--output <file>]
    uv run python database/db_manager.py reset [--skip-seed]
    uv run python database/db_manager.py restore <backup_file>
    uv run python database/db_manager.py status
    
    Or from the backend directory:
    uv run python -m database.db_manager backup [--output <file>]
    uv run python -m database.db_manager reset [--skip-seed]
    uv run python -m database.db_manager restore <backup_file>
    uv run python -m database.db_manager status
"""

import argparse
import os
import subprocess
import sys
from pathlib import Path
from datetime import datetime
from urllib.parse import urlparse, parse_qs
import logging

# Add parent directory to path to import app modules
SCRIPT_DIR = Path(__file__).parent
BACKEND_DIR = SCRIPT_DIR.parent
sys.path.insert(0, str(BACKEND_DIR))

from app.config import settings
import psycopg

logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)


class DatabaseManager:
    """Manages database operations: backup, reset, and restore."""
    
    def __init__(self):
        self.db_url = settings.DATABASE_URL
        if not self.db_url:
            raise ValueError("DATABASE_URL must be set in environment variables")
        
        # Parse database URL to extract connection parameters
        parsed = urlparse(self.db_url)
        self.db_user = parsed.username
        self.db_password = parsed.password
        self.db_host = parsed.hostname
        self.db_port = parsed.port or 5432
        self.db_name = parsed.path.lstrip('/')
        
        # Extract SSL mode from query parameters if present
        query_params = parse_qs(parsed.query)
        self.ssl_mode = query_params.get('sslmode', [None])[0]
        
        # Paths
        self.backend_dir = BACKEND_DIR
        self.alembic_dir = self.backend_dir / 'alembic'
        self.alembic_sql_dir = self.alembic_dir / 'sql'
        self.backups_dir = SCRIPT_DIR / 'backups'
        self.backups_dir.mkdir(exist_ok=True)
    
    def _get_connection_params(self):
        """Get connection parameters for psycopg3."""
        params = {
            'host': self.db_host,
            'port': self.db_port,
            'user': self.db_user,
            'password': self.db_password,
            'dbname': self.db_name,  # psycopg3 accepts 'dbname' (also accepts 'database')
        }
        
        # Add SSL parameters for psycopg3
        # psycopg3 uses 'sslmode' in connection string or as parameter
        if self.ssl_mode:
            params['sslmode'] = self.ssl_mode
        elif 'supabase.co' in self.db_host.lower():
            # Auto-detect SSL requirement for Supabase
            params['sslmode'] = 'require'
        
        return params
    
    def _get_pg_dump_env(self):
        """Get environment variables for pg_dump command."""
        env = os.environ.copy()
        env['PGPASSWORD'] = self.db_password
        return env
    
    def _get_pg_restore_env(self):
        """Get environment variables for pg_restore command."""
        return self._get_pg_dump_env()
    
    def _get_pg_dump_args(self, output_file=None, backup_format='custom'):
        """Get pg_dump command arguments."""
        args = ['pg_dump']
        
        # Connection parameters
        args.extend(['-h', self.db_host])
        args.extend(['-p', str(self.db_port)])
        args.extend(['-U', self.db_user])
        args.extend(['-d', self.db_name])
        
        # Format
        if backup_format == 'custom':
            args.append('-Fc')  # Custom format (compressed, allows selective restore)
        elif backup_format == 'plain':
            args.append('-Fp')  # Plain SQL format
        elif backup_format == 'tar':
            args.append('-Ft')  # Tar format
        
        # SSL mode
        if self.ssl_mode:
            args.extend(['--no-password'])  # Use PGPASSWORD env var
        
        # Output file
        if output_file:
            args.extend(['-f', str(output_file)])
        
        return args
    
    def backup(self, output_file=None, backup_format='custom'):
        """
        Backup the database.
        
        Args:
            output_file: Path to output file. If None, generates timestamped filename.
            backup_format: Backup format ('custom', 'plain', or 'tar')
        """
        if output_file is None:
            timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
            filename = f'formosastay_backup_{timestamp}'
            if backup_format == 'custom':
                filename += '.dump'
            elif backup_format == 'plain':
                filename += '.sql'
            elif backup_format == 'tar':
                filename += '.tar'
            output_file = self.backups_dir / filename
        else:
            output_file = Path(output_file)
            if not output_file.is_absolute():
                output_file = self.backups_dir / output_file
        
        logger.info("Starting database backup to %s...", output_file)
        
        try:
            args = self._get_pg_dump_args(output_file, backup_format)
            env = self._get_pg_dump_env()
            
            subprocess.run(
                args,
                env=env,
                capture_output=True,
                text=True,
                check=True
            )
            
            file_size = output_file.stat().st_size / (1024 * 1024)  # MB
            logger.info("✓ Backup completed successfully!")
            logger.info("  File: %s", output_file)
            logger.info("  Size: %.2f MB", file_size)
            return str(output_file)
            
        except subprocess.CalledProcessError as e:
            logger.error("✗ Backup failed: %s", e.stderr)
            sys.exit(1)
        except Exception as e:
            logger.error("✗ Backup failed: %s", e)
            sys.exit(1)
    
    def reset(self, skip_seed=False):
        """
        Reset the database by dropping all tables, running migrations, and seeding data.
        
        Args:
            skip_seed: If True, skip running seed SQL files
        """
        logger.info("Starting database reset...")
        
        try:
            # Connect to database
            params = self._get_connection_params()
            conn = psycopg.connect(**params, autocommit=True)
            cursor = conn.cursor()
            
            # Drop all tables and views
            logger.info("Dropping all tables and views...")
            cursor.execute("""
                DO $$ DECLARE
                    r RECORD;
                BEGIN
                    -- Drop all views
                    FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP TABLE IF EXISTS ' || quote_ident(r.tablename) || ' CASCADE';
                    END LOOP;
                    
                    -- Drop all views
                    FOR r IN (SELECT viewname FROM pg_views WHERE schemaname = 'public') LOOP
                        EXECUTE 'DROP VIEW IF EXISTS ' || quote_ident(r.viewname) || ' CASCADE';
                    END LOOP;
                    
                    -- Drop all sequences
                    FOR r IN (SELECT sequence_name FROM information_schema.sequences WHERE sequence_schema = 'public') LOOP
                        EXECUTE 'DROP SEQUENCE IF EXISTS ' || quote_ident(r.sequence_name) || ' CASCADE';
                    END LOOP;
                END $$;
            """)
            logger.info("✓ All tables, views, and sequences dropped")
            
            cursor.close()
            conn.close()
            
            # Run Alembic migrations using uv
            logger.info("Running Alembic migrations...")
            os.chdir(self.backend_dir)
            subprocess.run(
                ['uv', 'run', 'alembic', 'upgrade', 'head'],
                capture_output=True,
                text=True,
                check=True
            )
            logger.info("✓ Migrations completed")
            
            # Run seed SQL files if not skipped
            if not skip_seed:
                logger.info("Running seed SQL files...")
                self._run_seed_files()
                logger.info("✓ Seed data loaded")
            
            logger.info("✓ Database reset completed successfully!")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"✗ Reset failed during migrations: {e.stderr}")
            sys.exit(1)
        except psycopg.Error as e:
            logger.error(f"✗ Reset failed: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"✗ Reset failed: {e}")
            sys.exit(1)
    
    def _run_seed_files(self):
        """Run seed SQL files in order."""
        seed_files = [
            '0001_seed.sql',
            '0002_v_lease_status.sql',
            '0002_v_room_availability.sql',
            '0002_v_room_current_tenant.sql',
            '0002_v_room_dashboard_summary.sql',
            '0002_v_room_electricity_history.sql',
            '0002_v_room_payment_history.sql',
            '0002_v_tenant_complete.sql',
            '0002_v_tenant_lease.sql',
            '0002_v_user_account.sql',
            '0003_insert_lease.sql',
            '0003_insert_transations.sql',
        ]
        
        params = self._get_connection_params()
        conn = psycopg.connect(**params, autocommit=True)
        cursor = conn.cursor()
        
        for seed_file in seed_files:
            seed_path = self.alembic_sql_dir / seed_file
            if seed_path.exists():
                logger.info(f"  Running {seed_file}...")
                with open(seed_path, 'r', encoding='utf-8') as f:
                    sql = f.read()
                    cursor.execute(sql)
            else:
                logger.warning(f"  Seed file not found: {seed_file}")
        
        cursor.close()
        conn.close()
    
    def restore(self, backup_file):
        """
        Restore the database from a backup file.
        
        Args:
            backup_file: Path to backup file
        """
        backup_path = Path(backup_file)
        if not backup_path.is_absolute():
            # Try in backups directory first
            backup_path = self.backups_dir / backup_file
            if not backup_path.exists():
                # Try as direct path
                backup_path = Path(backup_file)
        
        if not backup_path.exists():
            logger.error(f"✗ Backup file not found: {backup_path}")
            sys.exit(1)
        
        logger.info(f"Starting database restore from {backup_path}...")
        logger.warning("⚠ This will overwrite all existing data in the database!")
        
        try:
            # Determine backup format from file extension
            if backup_path.suffix == '.dump':
                backup_format = 'custom'
                args = ['pg_restore']
            elif backup_path.suffix == '.sql':
                backup_format = 'plain'
                args = ['psql']
            elif backup_path.suffix == '.tar':
                backup_format = 'tar'
                args = ['pg_restore']
            else:
                # Try to detect format
                logger.warning("Could not determine backup format from extension, assuming custom format")
                backup_format = 'custom'
                args = ['pg_restore']
            
            env = self._get_pg_restore_env()
            
            # Build restore command
            if backup_format == 'custom' or backup_format == 'tar':
                args.extend(['-h', self.db_host])
                args.extend(['-p', str(self.db_port)])
                args.extend(['-U', self.db_user])
                args.extend(['-d', self.db_name])
                args.extend(['--clean', '--if-exists'])  # Drop objects before creating
                args.extend(['--no-owner', '--no-acl'])  # Don't restore ownership/ACL
                args.append(str(backup_path))
                
                subprocess.run(
                    args,
                    env=env,
                    capture_output=True,
                    text=True,
                    check=True
                )
            else:  # plain SQL
                args.extend(['-h', self.db_host])
                args.extend(['-p', str(self.db_port)])
                args.extend(['-U', self.db_user])
                args.extend(['-d', self.db_name])
                # For plain SQL, read from stdin
                with open(backup_path, 'r', encoding='utf-8') as f:
                    subprocess.run(
                        args,
                        env=env,
                        stdin=f,
                        capture_output=True,
                        text=True,
                        check=True
                    )
            
            logger.info("✓ Database restore completed successfully!")
            
        except subprocess.CalledProcessError as e:
            logger.error(f"✗ Restore failed: {e.stderr}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"✗ Restore failed: {e}")
            sys.exit(1)
    
    def status(self):
        """Display database connection status and information."""
        logger.info("Checking database status...")
        
        try:
            params = self._get_connection_params()
            conn = psycopg.connect(**params)
            cursor = conn.cursor()
            
            # Get database info
            cursor.execute("SELECT version();")
            version = cursor.fetchone()[0]
            
            cursor.execute("SELECT current_database();")
            db_name = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.tables 
                WHERE table_schema = 'public';
            """)
            table_count = cursor.fetchone()[0]
            
            cursor.execute("""
                SELECT COUNT(*) FROM information_schema.views 
                WHERE table_schema = 'public';
            """)
            view_count = cursor.fetchone()[0]
            
            # Check Alembic version
            cursor.execute("""
                SELECT version_num FROM alembic_version LIMIT 1;
            """)
            alembic_version = cursor.fetchone()[0] if cursor.rowcount > 0 else "No migrations applied"
            
            cursor.close()
            conn.close()
            
            logger.info("✓ Database connection successful!")
            print(f"\nDatabase Information:")
            print(f"  Name: {db_name}")
            print(f"  Host: {self.db_host}:{self.db_port}")
            print(f"  Version: {version.split(',')[0]}")
            print(f"  Tables: {table_count}")
            print(f"  Views: {view_count}")
            print(f"  Alembic Version: {alembic_version}")
            
        except psycopg.Error as e:
            logger.error(f"✗ Connection failed: {e}")
            sys.exit(1)
        except Exception as e:
            logger.error(f"✗ Status check failed: {e}")
            sys.exit(1)


def main():
    parser = argparse.ArgumentParser(
        description='Database management utility for FormosaStay',
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  uv run python database/db_manager.py backup
  uv run python database/db_manager.py backup --output my_backup.dump
  uv run python database/db_manager.py reset
  uv run python database/db_manager.py reset --skip-seed
  uv run python database/db_manager.py restore backups/formosastay_backup_20240101_120000.dump
  uv run python database/db_manager.py status
        """
    )
    
    subparsers = parser.add_subparsers(dest='command', help='Command to execute')
    
    # Backup command
    backup_parser = subparsers.add_parser('backup', help='Backup the database')
    backup_parser.add_argument(
        '--output', '-o',
        type=str,
        help='Output file path (default: auto-generated timestamped filename)'
    )
    backup_parser.add_argument(
        '--format', '-f',
        choices=['custom', 'plain', 'tar'],
        default='custom',
        help='Backup format (default: custom)'
    )
    
    # Reset command
    reset_parser = subparsers.add_parser('reset', help='Reset the database (drop all, migrate, seed)')
    reset_parser.add_argument(
        '--skip-seed',
        action='store_true',
        help='Skip running seed SQL files'
    )
    
    # Restore command
    restore_parser = subparsers.add_parser('restore', help='Restore database from backup')
    restore_parser.add_argument(
        'backup_file',
        type=str,
        help='Path to backup file'
    )
    
    # Status command
    subparsers.add_parser('status', help='Check database connection status')
    
    args = parser.parse_args()
    
    if not args.command:
        parser.print_help()
        sys.exit(1)
    
    try:
        manager = DatabaseManager()
        
        if args.command == 'backup':
            manager.backup(output_file=args.output, backup_format=args.format)
        elif args.command == 'reset':
            manager.reset(skip_seed=args.skip_seed)
        elif args.command == 'restore':
            manager.restore(args.backup_file)
        elif args.command == 'status':
            manager.status()
            
    except KeyboardInterrupt:
        logger.info("\n✗ Operation cancelled by user")
        sys.exit(1)
    except Exception as e:
        logger.error(f"✗ Error: {e}")
        sys.exit(1)


if __name__ == '__main__':
    main()

