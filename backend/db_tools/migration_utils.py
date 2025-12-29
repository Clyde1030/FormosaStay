"""
Utility functions for Alembic migrations.

This module provides reusable functions for common migration tasks,
such as executing SQL files with multiple statements.
"""
from pathlib import Path
from typing import TYPE_CHECKING
from sqlalchemy import text

if TYPE_CHECKING:
    from alembic.operations import Operations


def execute_sql_file(op: "Operations", filename: str) -> None:
    """
    Execute a SQL file with multiple statements in an Alembic migration.
    
    This function splits SQL files into individual statements and executes them
    sequentially, properly handling dollar-quoted strings (e.g., $$...$$).
    
    Args:
        op: Alembic Operations object (from migration context)
        filename: Name of the SQL file relative to alembic/sql/ directory
        
    Example:
        from database.migration_utils import execute_sql_file
        
        def upgrade():
            execute_sql_file(op, "0001_seed.sql")
    """
    # Get the path to the SQL file (relative to alembic/sql/)
    # This assumes the migration file is in alembic/versions/
    migration_file = Path(__file__).resolve()
    # Navigate: database/ -> backend/ -> alembic/sql/
    sql_path = migration_file.parent.parent / "alembic" / "sql" / filename
    
    if not sql_path.exists():
        raise FileNotFoundError(f"SQL file not found: {sql_path}")
    
    with open(sql_path, "r", encoding="utf-8") as f:
        sql_content = f.read()
    
    # Get the connection from alembic
    connection = op.get_bind()
    
    # Split SQL into statements, handling dollar-quoted strings
    statements = []
    current_stmt = []
    in_dollar_quote = False
    dollar_tag = None
    i = 0
    
    while i < len(sql_content):
        char = sql_content[i]
        
        # Detect dollar quote boundaries ($tag$ or $$)
        if char == '$':
            # Look ahead to find the complete dollar tag
            tag_start = i
            j = i + 1
            # Find the closing $ of the tag (could be immediate $$ or $tag$)
            while j < len(sql_content) and sql_content[j] != '$':
                j += 1
            if j < len(sql_content):
                tag = sql_content[tag_start:j+1]
                
                if not in_dollar_quote:
                    # Opening dollar quote
                    in_dollar_quote = True
                    dollar_tag = tag
                    current_stmt.append(tag)
                    i = j + 1
                    continue
                elif tag == dollar_tag:
                    # Closing dollar quote
                    in_dollar_quote = False
                    dollar_tag = None
                    current_stmt.append(tag)
                    i = j + 1
                    continue
        
        current_stmt.append(char)
        
        # Split on semicolon if not inside dollar quote
        if char == ';' and not in_dollar_quote:
            stmt = ''.join(current_stmt).strip()
            if stmt:
                statements.append(stmt)
            current_stmt = []
        
        i += 1
    
    # Add any remaining statement
    if current_stmt:
        stmt = ''.join(current_stmt).strip()
        if stmt:
            statements.append(stmt)
    
    # Execute each statement
    for statement in statements:
        if statement.strip():
            connection.execute(text(statement))

