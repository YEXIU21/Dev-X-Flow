import tkinter as tk
from tkinter import ttk, messagebox, filedialog
import subprocess
import os
import json
import threading
import webbrowser
import re
import requests
import sys
import shutil
import sqlite3

class DatabaseAdapter:
    def test_connection(self):
        raise NotImplementedError()

    def list_databases(self):
        raise NotImplementedError()

    def list_tables(self, database):
        raise NotImplementedError()

    def import_sql_file(self, sql_file, database):
        raise NotImplementedError()

    def export_schema_to_dir(self, export_dir, database):
        raise NotImplementedError()

    def run_sql(self, sql_text, database=None, timeout=30):
        raise NotImplementedError()

    def create_database(self, name):
        raise NotImplementedError()

    def drop_database(self, name):
        raise NotImplementedError()


class MySQLCliAdapter(DatabaseAdapter):
    def __init__(self, app):
        self.app = app

    def _quote_ident(self, name):
        n = (name or "").strip()
        if not n:
            return "``"
        return "`" + n.replace("`", "``") + "`"

    def get_client(self):
        return self.app._get_mysql_client()

    def build_mysql_args(self, database=None):
        mysql_client = self.get_client()
        if not mysql_client:
            return None

        mysql_args = [mysql_client, "-h", self.app.db_host.get(), "-u", self.app.db_user.get()]

        if self.app.db_use_custom_port.get():
            port = self.app.db_port.get()
            if port and port != "3306":
                mysql_args.extend(["-P", port])

        if self.app.db_password.get():
            mysql_args.extend(["-p" + self.app.db_password.get()])

        if database:
            mysql_args.extend(["-D", database])

        return mysql_args

    def run_mysql_command(self, args, database=None, show_error=True, timeout=30):
        mysql_args = self.build_mysql_args(database=database)
        if not mysql_args:
            error_msg = self.app._mysql_not_found_message()
            if show_error:
                messagebox.showerror("MySQL Client Missing", error_msg)
            return f"Error: {error_msg}"

        mysql_args.extend(args)

        kwargs = {"capture_output": True, "text": True, "timeout": timeout}
        if sys.platform == "win32":
            kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW

        try:
            result = subprocess.run(mysql_args, **kwargs)
        except FileNotFoundError:
            error_msg = self.app._mysql_not_found_message()
            if show_error:
                messagebox.showerror("MySQL Client Missing", error_msg)
            return f"Error: {error_msg}"

        if result.returncode != 0:
            error_msg = f"MySQL Error: {result.stderr}"
            if show_error:
                messagebox.showerror("MySQL Error", error_msg)
            return error_msg

        return result.stdout.strip()

    def import_sql_file(self, sql_file, database):
        try:
            if not os.path.exists(sql_file):
                return "Error: SQL file not found."
            mysql_args = self.build_mysql_args(database=database)
            if not mysql_args:
                return "Error: MySQL client not found."
            
            kwargs = {"stdin": open(sql_file, 'r', encoding='utf-8', errors='ignore'), 
                      "capture_output": True, "text": True, "timeout": 300}
            if sys.platform == "win32":
                kwargs["creationflags"] = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(mysql_args, **kwargs)
            if result.returncode != 0:
                return f"Error: {result.stderr}"
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def export_schema_to_dir(self, export_dir, database):
        try:
            os.makedirs(export_dir, exist_ok=True)
            # Get tables
            result = self.run_mysql_command(["-e", "SHOW TABLES;"], database=database, show_error=False)
            if result.startswith("Error"):
                return f"Error: {result}"
            
            tables = [line.strip() for line in result.split('\n') if line.strip() and not line.startswith('Tables_in')]
            exported = 0
            
            for table in tables:
                out_file = os.path.join(export_dir, f"{table}.txt")
                with open(out_file, 'w', encoding='utf-8') as f:
                    f.write(f"=== SCHEMA: {table} ===\n\n")
                    schema = self.run_mysql_command(["-e", f"SHOW CREATE TABLE {table};"], database=database, show_error=False)
                    f.write(schema + "\n\n")
                    f.write(f"=== SAMPLE DATA (First 50 rows) ===\n\n")
                    data = self.run_mysql_command(["-e", f"SELECT * FROM {table} LIMIT 50;"], database=database, show_error=False)
                    f.write(data + "\n")
                exported += 1
            return exported
        except Exception as e:
            return f"Error: {e}"

    def run_sql(self, sql_text, database=None, timeout=30):
        try:
            if not (sql_text or "").strip():
                return "Error: SQL is empty."
            args = ["-e", sql_text]
            result = self.run_mysql_command(args, database=database, show_error=False, timeout=timeout)
            if isinstance(result, str) and result.startswith("Error"):
                return result
            return result or "OK"
        except Exception as e:
            return f"Error: {e}"

    def create_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        return self.run_sql(f"CREATE DATABASE {self._quote_ident(n)};", database=None, timeout=30)

    def drop_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        return self.run_sql(f"DROP DATABASE {self._quote_ident(n)};", database=None, timeout=30)


class SQLiteAdapter(DatabaseAdapter):
    def __init__(self, app):
        self.app = app

    def _get_db_path(self):
        p = (self.app.sqlite_db_path.get() or "").strip()
        return p or None

    def test_connection(self):
        p = self._get_db_path()
        if not p:
            return "Error: SQLite database path not set."
        if not os.path.exists(p):
            return "Error: SQLite database file not found."
        try:
            conn = sqlite3.connect(p, timeout=5)
            conn.execute("SELECT 1;")
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def run_sql(self, sql_text, database=None, timeout=30):
        p = self._get_db_path()
        if not p:
            return "Error: SQLite database path not set."
        if not os.path.exists(p):
            return "Error: SQLite database file not found."
        if not (sql_text or "").strip():
            return "Error: SQL is empty."
        try:
            conn = sqlite3.connect(p, timeout=max(1, int(timeout)))
            conn.executescript(sql_text)
            conn.commit()
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def create_database(self, name):
        return "Error: SQLite does not support CREATE DATABASE. Create/select a .db file instead."

    def drop_database(self, name):
        return "Error: SQLite does not support DROP DATABASE. Delete the .db file instead."

    def import_sql_file(self, sql_file, database=None):
        p = self._get_db_path()
        if not p:
            return "Error: SQLite database path not set."
        if not os.path.exists(p):
            return "Error: SQLite database file not found."
        if not os.path.exists(sql_file):
            return "Error: SQL file not found."
        try:
            with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
                sql_text = f.read()
            return self.run_sql(sql_text)
        except Exception as e:
            return f"Error: {e}"

    def list_databases(self):
        return ["(sqlite)"]

    def list_tables(self):
        p = self._get_db_path()
        if not p:
            return "Error: SQLite database path not set."
        if not os.path.exists(p):
            return "Error: SQLite database file not found."
        try:
            conn = sqlite3.connect(p, timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name;")
            rows = cur.fetchall()
            conn.close()
            return [r[0] for r in rows]
        except Exception as e:
            return f"Error: {e}"

    def export_schema_and_samples(self, export_dir, max_rows=50):
        p = self._get_db_path()
        if not p:
            return "Error: SQLite database path not set."
        if not os.path.exists(p):
            return "Error: SQLite database file not found."
        try:
            os.makedirs(export_dir, exist_ok=True)
            conn = sqlite3.connect(p)
            cur = conn.cursor()
            cur.execute("SELECT name, sql FROM sqlite_master WHERE type='table' ORDER BY name;")
            tables = cur.fetchall()

            exported = 0
            for table_name, create_sql in tables:
                out_file = os.path.join(export_dir, f"{table_name}.txt")
                with open(out_file, 'w', encoding='utf-8') as f:
                    f.write(f"=== SCHEMA: {table_name} ===\n\n")
                    f.write((create_sql or "") + "\n\n")
                    f.write(f"=== SAMPLE DATA (First {max_rows} rows) ===\n\n")

                    try:
                        cur.execute(f"SELECT * FROM {table_name} LIMIT {int(max_rows)};")
                        cols = [d[0] for d in (cur.description or [])]
                        if cols:
                            f.write("\t".join(cols) + "\n")
                        for row in cur.fetchall():
                            f.write("\t".join([str(x) for x in row]) + "\n")
                    except Exception as e:
                        f.write(f"(Failed to read sample rows: {e})\n")

                exported += 1

            conn.close()
            return exported
        except Exception as e:
            return f"Error: {e}"

    def export_schema_to_dir(self, export_dir, database):
        return self.export_schema_and_samples(export_dir)


class PostgreSQLAdapter(DatabaseAdapter):
    def __init__(self, app):
        self.app = app

    def _get_connector(self):
        try:
            import psycopg  # type: ignore
            return ("psycopg", psycopg)
        except Exception:
            pass
        try:
            import psycopg2  # type: ignore
            return ("psycopg2", psycopg2)
        except Exception:
            return (None, None)

    def _connect(self, database=None, timeout=5):
        name, mod = self._get_connector()
        if not mod:
            raise RuntimeError("Missing dependency: install psycopg or psycopg2")

        dbname = database or (self.app.db_name.get() or "postgres")
        host = self.app.db_host.get() or "127.0.0.1"
        user = self.app.db_user.get() or "postgres"
        password = self.app.db_password.get() or ""
        port = int(self.app.db_port.get() or "5432")

        # psycopg(3) and psycopg2 both accept these keyword args
        conn = mod.connect(
            dbname=dbname,
            host=host,
            user=user,
            password=password,
            port=port,
            connect_timeout=timeout,
        )
        return conn

    def test_connection(self):
        try:
            conn = self._connect(timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT version();")
            ver = cur.fetchone()
            conn.close()
            return ("OK", ver[0] if ver else "OK")
        except Exception as e:
            return ("Error", str(e))

    def list_databases(self):
        try:
            conn = self._connect(database="postgres", timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT datname FROM pg_database WHERE datistemplate = false ORDER BY datname;")
            rows = cur.fetchall()
            conn.close()
            return [r[0] for r in rows]
        except Exception as e:
            return f"Error: {e}"

    def list_tables(self, database):
        try:
            conn = self._connect(database=database, timeout=5)
            cur = conn.cursor()
            cur.execute(
                "SELECT table_schema, table_name FROM information_schema.tables "
                "WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') "
                "ORDER BY table_schema, table_name;"
            )
            rows = cur.fetchall()
            conn.close()
            return [f"{r[0]}.{r[1]}" for r in rows]
        except Exception as e:
            return f"Error: {e}"

    def import_sql_file(self, sql_file, database):
        try:
            if not os.path.exists(sql_file):
                return "Error: SQL file not found."

            conn = self._connect(database=database, timeout=10)
            cur = conn.cursor()

            with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
                sql_text = f.read()

            # Best-effort: split by ';' (may fail for functions/DO blocks)
            statements = [s.strip() for s in sql_text.split(';') if s.strip()]
            for stmt in statements:
                cur.execute(stmt)

            conn.commit()
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def export_schema_to_dir(self, export_dir, database):
        try:
            os.makedirs(export_dir, exist_ok=True)
            conn = self._connect(database=database, timeout=10)
            cur = conn.cursor()
            cur.execute(
                "SELECT table_schema, table_name FROM information_schema.tables "
                "WHERE table_type='BASE TABLE' AND table_schema NOT IN ('pg_catalog','information_schema') "
                "ORDER BY table_schema, table_name;"
            )
            tables = cur.fetchall()
            exported = 0

            for schema, table in tables:
                safe_name = f"{schema}.{table}".replace('/', '_')
                out_file = os.path.join(export_dir, f"{safe_name}.txt")
                with open(out_file, 'w', encoding='utf-8') as f:
                    f.write(f"=== TABLE: {schema}.{table} ===\n\n")
                    cur.execute(
                        "SELECT column_name, data_type, is_nullable "
                        "FROM information_schema.columns "
                        "WHERE table_schema=%s AND table_name=%s "
                        "ORDER BY ordinal_position;",
                        (schema, table),
                    )
                    cols = cur.fetchall()
                    f.write("Columns:\n")
                    for c in cols:
                        f.write(f"- {c[0]} {c[1]} NULLABLE={c[2]}\n")

                    f.write("\nSample rows (first 50):\n")
                    try:
                        cur.execute(f'SELECT * FROM "{schema}"."{table}" LIMIT 50;')
                        rows = cur.fetchall()
                        colnames = [d[0] for d in (cur.description or [])]
                        if colnames:
                            f.write("\t".join(colnames) + "\n")
                        for r in rows:
                            f.write("\t".join([str(x) for x in r]) + "\n")
                    except Exception as e:
                        f.write(f"(Failed to read sample rows: {e})\n")

                exported += 1

            conn.close()
            return exported
        except Exception as e:
            return f"Error: {e}"

    def run_sql(self, sql_text, database=None, timeout=30):
        try:
            if not (sql_text or "").strip():
                return "Error: SQL is empty."

            conn = self._connect(database=database, timeout=max(1, int(timeout)))
            cur = conn.cursor()

            statements = [s.strip() for s in sql_text.split(';') if s.strip()]
            for stmt in statements:
                cur.execute(stmt)

            conn.commit()
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def create_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        try:
            conn = self._connect(database="postgres", timeout=10)
            try:
                conn.autocommit = True
            except Exception:
                try:
                    conn.set_isolation_level(0)
                except Exception:
                    pass
            cur = conn.cursor()
            safe = n.replace('"', '""')
            cur.execute(f'CREATE DATABASE "{safe}";')
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def drop_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        try:
            conn = self._connect(database="postgres", timeout=10)
            try:
                conn.autocommit = True
            except Exception:
                try:
                    conn.set_isolation_level(0)
                except Exception:
                    pass
            cur = conn.cursor()
            safe = n.replace('"', '""')
            cur.execute(f'DROP DATABASE "{safe}";')
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"


class SQLServerAdapter(DatabaseAdapter):
    def __init__(self, app):
        self.app = app

    def _get_pyodbc(self):
        try:
            import pyodbc  # type: ignore
            return pyodbc
        except Exception:
            return None

    def _connect(self, database=None, timeout=5):
        pyodbc = self._get_pyodbc()
        if not pyodbc:
            raise RuntimeError("Missing dependency: install pyodbc + Microsoft ODBC Driver for SQL Server")

        host = self.app.db_host.get() or "127.0.0.1"
        port = (self.app.db_port.get() or "").strip()
        server = host if not port else f"{host},{port}"

        user = self.app.db_user.get() or "sa"
        password = self.app.db_password.get() or ""
        dbname = database or (self.app.db_name.get() or "master")
        driver = (self.app.sqlserver_driver.get() or "ODBC Driver 17 for SQL Server").strip()

        conn_str = (
            f"DRIVER={{{driver}}};"
            f"SERVER={server};"
            f"DATABASE={dbname};"
            f"UID={user};"
            f"PWD={password};"
            "TrustServerCertificate=yes;"
        )
        return pyodbc.connect(conn_str, timeout=timeout)

    def test_connection(self):
        try:
            conn = self._connect(timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT @@VERSION;")
            ver = cur.fetchone()
            conn.close()
            return ("OK", ver[0] if ver else "OK")
        except Exception as e:
            return ("Error", str(e))

    def list_databases(self):
        try:
            conn = self._connect(database="master", timeout=5)
            cur = conn.cursor()
            cur.execute("SELECT name FROM sys.databases ORDER BY name;")
            rows = cur.fetchall()
            conn.close()
            return [r[0] for r in rows]
        except Exception as e:
            return f"Error: {e}"

    def list_tables(self, database):
        try:
            conn = self._connect(database=database, timeout=5)
            cur = conn.cursor()
            cur.execute(
                "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME;"
            )
            rows = cur.fetchall()
            conn.close()
            return [f"{r[0]}.{r[1]}" for r in rows]
        except Exception as e:
            return f"Error: {e}"

    def export_schema_to_dir(self, export_dir, database):
        try:
            os.makedirs(export_dir, exist_ok=True)
            conn = self._connect(database=database, timeout=10)
            cur = conn.cursor()
            cur.execute(
                "SELECT TABLE_SCHEMA, TABLE_NAME FROM INFORMATION_SCHEMA.TABLES "
                "WHERE TABLE_TYPE='BASE TABLE' ORDER BY TABLE_SCHEMA, TABLE_NAME;"
            )
            tables = cur.fetchall()
            exported = 0

            for schema, table in tables:
                safe_name = f"{schema}.{table}".replace('/', '_')
                out_file = os.path.join(export_dir, f"{safe_name}.txt")
                with open(out_file, 'w', encoding='utf-8') as f:
                    f.write(f"=== TABLE: {schema}.{table} ===\n\n")
                    cur.execute(
                        "SELECT COLUMN_NAME, DATA_TYPE, IS_NULLABLE "
                        "FROM INFORMATION_SCHEMA.COLUMNS "
                        "WHERE TABLE_SCHEMA=? AND TABLE_NAME=? ORDER BY ORDINAL_POSITION;",
                        (schema, table),
                    )
                    cols = cur.fetchall()
                    f.write("Columns:\n")
                    for c in cols:
                        f.write(f"- {c[0]} {c[1]} NULLABLE={c[2]}\n")

                    f.write("\nSample rows (first 50):\n")
                    try:
                        cur.execute(f"SELECT TOP 50 * FROM [{schema}].[{table}];")
                        rows = cur.fetchall()
                        colnames = [d[0] for d in (cur.description or [])]
                        if colnames:
                            f.write("\t".join(colnames) + "\n")
                        for r in rows:
                            f.write("\t".join([str(x) for x in r]) + "\n")
                    except Exception as e:
                        f.write(f"(Failed to read sample rows: {e})\n")

                exported += 1

            conn.close()
            return exported
        except Exception as e:
            return f"Error: {e}"

    def import_sql_file(self, sql_file, database):
        try:
            if not os.path.exists(sql_file):
                return "Error: SQL file not found."

            with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
                sql_text = f.read()

            batches = [
                b.strip() for b in re.split(r'^\s*GO\s*$', sql_text, flags=re.IGNORECASE | re.MULTILINE)
                if b.strip()
            ]

            conn = self._connect(database=database, timeout=10)
            cur = conn.cursor()

            for batch in batches:
                cur.execute(batch)
                try:
                    while cur.nextset():
                        pass
                except Exception:
                    pass

            conn.commit()
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def run_sql(self, sql_text, database=None, timeout=30):
        try:
            if not (sql_text or "").strip():
                return "Error: SQL is empty."

            batches = [
                b.strip() for b in re.split(r'^\s*GO\s*$', sql_text, flags=re.IGNORECASE | re.MULTILINE)
                if b.strip()
            ]

            conn = self._connect(database=database, timeout=max(1, int(timeout)))
            cur = conn.cursor()

            for batch in batches:
                cur.execute(batch)
                try:
                    while cur.nextset():
                        pass
                except Exception:
                    pass

            conn.commit()
            conn.close()
            return "OK"
        except Exception as e:
            return f"Error: {e}"

    def create_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        safe = n.replace(']', ']]')
        return self.run_sql(f"CREATE DATABASE [{safe}];", database="master", timeout=30)

    def drop_database(self, name):
        n = (name or "").strip()
        if not n:
            return "Error: Database name is required."
        safe = n.replace(']', ']]')
        return self.run_sql(f"DROP DATABASE [{safe}];", database="master", timeout=30)


class GitGUI:
    def __init__(self, root):
        self.root = root
        self.root.title("Dev-X-Flow-Pro v7.1.2")
        
        # Set window icon - handle both script and bundled exe modes
        try:
            icon_path = self._get_resource_path("window_icon.png")
            if os.path.exists(icon_path):
                icon_img = tk.PhotoImage(file=icon_path)
                self.root.iconphoto(True, icon_img)
                self.window_icon = icon_img  # Keep reference
                print(f"Icon loaded successfully from: {icon_path}")
            else:
                print(f"Icon file not found at: {icon_path}")
        except Exception as e:
            print(f"Could not load icon: {e}")
        
        # Show splash screen
        self.show_splash()
        self.root.geometry("900x950")
        self.root.configure(bg="#1e1e1e")
        
        # Modern Colors
        self.colors = {
            "bg": "#1e1e1e",
            "fg": "#ffffff",
            "accent": "#007acc",
            "accent_hover": "#005f9e",
            "secondary": "#252526",
            "text_bg": "#1e1e1e",
            "border": "#3e3e42",
            "success": "#4ec9b0",
            "warning": "#ce9178",
            "danger": "#f48771"
        }

        self.setup_styles()
        
        # Configuration file for persisting last repository
        self.config_file = os.path.join(os.path.expanduser("~"), ".git_helper_config.json")
        self.history_file = os.path.join(os.path.expanduser("~"), ".git_helper_terminal_history.json")
        
        # Terminal state
        self.command_history = []
        self.history_index = -1
        self.current_process = None
        self.project_type = tk.StringVar()
        self.suggestions_enabled = tk.BooleanVar(value=True)
        
        # Debug state
        self.log_file_path = None
        self.last_log_position = 0
        self.log_auto_refresh = tk.BooleanVar(value=True)
        self.log_refresh_timer = None
        
        # AI Configuration
        self.ai_api_key = None
        self.ai_provider = tk.StringVar(value="openai")  # Default provider
        self.ai_config_file = os.path.join(os.path.expanduser("~"), ".gitflow_ai_config.json")
        self.load_ai_config()
        
        # Database Configuration
        self.db_type = tk.StringVar(value="MySQL/MariaDB")
        self.db_host = tk.StringVar(value="127.0.0.1")
        self.db_port = tk.StringVar(value="3306")
        self.db_use_custom_port = tk.BooleanVar(value=False)
        self.db_user = tk.StringVar(value="root")
        self.db_password = tk.StringVar(value="")
        self.db_name = tk.StringVar(value="")
        self.db_new_name = tk.StringVar(value="")
        self.sql_file_path = tk.StringVar(value="")
        self.sqlite_db_path = tk.StringVar(value="")
        self.sqlserver_driver = tk.StringVar(value="ODBC Driver 17 for SQL Server")
        self.db_config_file = os.path.join(os.path.expanduser("~"), ".gitflow_db_config.json")
        self.load_db_config()

        # MySQL client executable (auto-detected)
        self.mysql_exe = self._get_saved_mysql_exe() or self._detect_mysql_executable()

        self.db_adapter = None
        self.set_db_adapter()

        self.db_type.trace_add('write', lambda *_: self.set_db_adapter())

        # AI Provider configurations
        self.ai_providers = {
            "openai": {
                "name": "OpenAI",
                "url": "https://platform.openai.com/api-keys",
                "endpoint": "https://api.openai.com/v1/chat/completions",
                "model": "gpt-3.5-turbo",
                "headers": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "model": model,
                    "messages": [
                        {"role": "system", "content": "You are a helpful assistant that generates git commit messages."},
                        {"role": "user", "content": prompt}
                    ],
                    "max_tokens": 100,
                    "temperature": 0.3
                },
                "extract_response": lambda r: r.json()["choices"][0]["message"]["content"].strip()
            },
            "google": {
                "name": "Google Gemini",
                "url": "https://makersuite.google.com/app/apikey",
                "endpoint_template": "https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent?key={key}",
                "model": "gemini-pro",
                "headers": lambda key: {"Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "contents": [{"parts": [{"text": prompt}]}],
                    "generationConfig": {"temperature": 0.3, "maxOutputTokens": 100}
                },
                "extract_response": lambda r: r.json()["candidates"][0]["content"]["parts"][0]["text"].strip()
            },
            "anthropic": {
                "name": "Anthropic Claude",
                "url": "https://console.anthropic.com/settings/keys",
                "endpoint": "https://api.anthropic.com/v1/messages",
                "model": "claude-3-haiku-20240307",
                "headers": lambda key: {
                    "x-api-key": key,
                    "Content-Type": "application/json",
                    "anthropic-version": "2023-06-01"
                },
                "payload": lambda prompt, model: {
                    "model": model,
                    "max_tokens": 100,
                    "temperature": 0.3,
                    "messages": [{"role": "user", "content": prompt}]
                },
                "extract_response": lambda r: r.json()["content"][0]["text"].strip()
            },
            "kimi": {
                "name": "Moonshot Kimi",
                "url": "https://platform.moonshot.cn/console/api-keys",
                "endpoint": "https://api.moonshot.cn/v1/chat/completions",
                "model": "moonshot-v1-8k",
                "headers": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                "extract_response": lambda r: r.json()["choices"][0]["message"]["content"].strip()
            },
            "glm": {
                "name": "ChatGLM",
                "url": "https://open.bigmodel.cn/usercenter/apikeys",
                "endpoint": "https://open.bigmodel.cn/api/paas/v4/chat/completions",
                "model": "glm-4",
                "headers": lambda key: {"Authorization": key, "Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                "extract_response": lambda r: r.json()["choices"][0]["message"]["content"].strip()
            },
            "deepseek": {
                "name": "DeepSeek",
                "url": "https://platform.deepseek.com/api_keys",
                "endpoint": "https://api.deepseek.com/chat/completions",
                "model": "deepseek-chat",
                "headers": lambda key: {"Authorization": f"Bearer {key}", "Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "model": model,
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                "extract_response": lambda r: r.json()["choices"][0]["message"]["content"].strip()
            },
            "azure": {
                "name": "Azure OpenAI",
                "url": "https://portal.azure.com/#view/Microsoft_Azure_ProjectOxford/CognitiveServicesHub/~/OpenAI",
                "endpoint_template": "https://{resource}.openai.azure.com/openai/deployments/{deployment}/chat/completions?api-version=2024-02-15-preview",
                "model": "gpt-35-turbo",
                "headers": lambda key: {"api-key": key, "Content-Type": "application/json"},
                "payload": lambda prompt, model: {
                    "messages": [{"role": "user", "content": prompt}],
                    "temperature": 0.3,
                    "max_tokens": 100
                },
                "extract_response": lambda r: r.json()["choices"][0]["message"]["content"].strip()
            }
        }

        # Command templates for different project types
        self.command_templates = {
            "Laravel": [
                "php artisan serve",
                "php artisan migrate",
                "php artisan migrate:fresh",
                "php artisan migrate:refresh",
                "php artisan migrate:rollback",
                "php artisan db:seed",
                "php artisan make:controller",
                "php artisan make:model",
                "php artisan make:migration",
                "php artisan make:seeder",
                "php artisan make:middleware",
                "php artisan make:request",
                "php artisan make:resource",
                "php artisan route:list",
                "php artisan cache:clear",
                "php artisan config:clear",
                "php artisan view:clear",
                "php artisan optimize:clear",
                "php artisan queue:work",
                "php artisan tinker",
                "composer install",
                "composer update",
                "composer dump-autoload",
            ],
            "Node.js": [
                "npm install",
                "npm run dev",
                "npm run build",
                "npm run watch",
                "npm run prod",
                "npm start",
                "npm test",
                "npm run lint",
                "yarn install",
                "yarn dev",
                "yarn build",
                "yarn start",
                "node index.js",
                "npx vite",
                "npx webpack",
            ],
            "Python": [
                "python manage.py runserver",
                "python manage.py migrate",
                "python manage.py makemigrations",
                "python manage.py createsuperuser",
                "flask run",
                "pip install -r requirements.txt",
                "pip install",
                "pip freeze > requirements.txt",
                "python -m venv venv",
                "pytest",
            ],
            "General": [
                "git status",
                "git log",
                "git pull",
                "git push",
                "git branch",
                "dir",
                "cls",
                "cd ..",
            ]
        }

        # Initialize repository directory
        self.repo_dir = self.load_last_repo() or os.getcwd()
        self.is_git_repo = tk.BooleanVar(value=False)
        self.current_branch = tk.StringVar()

        self.load_command_history()
        self.create_widgets()
        self.check_git_repo()
        self.detect_project_type()

    def _apply_dark_combobox_popdown(self, combobox):
        try:
            popdown = combobox.tk.eval(f"ttk::combobox::PopdownWindow {combobox}")
            listbox_path = f"{popdown}.f.l"
            combobox.tk.call(
                listbox_path,
                "configure",
                "-background",
                self.colors["secondary"],
                "-foreground",
                "white",
                "-selectbackground",
                self.colors["accent"],
                "-selectforeground",
                "white",
                "-highlightthickness",
                "0",
                "-borderwidth",
                "0",
                "-relief",
                "flat",
            )
        except Exception:
            pass

    def _bind_dark_combobox(self, combobox):
        self._apply_dark_combobox_popdown(combobox)
        combobox.bind(
            "<Button-1>",
            lambda _e, cb=combobox: self._apply_dark_combobox_popdown(cb),
            add="+",
        )

    def _ensure_mysql_db_selected(self):
        if self.db_type.get() != "MySQL/MariaDB":
            messagebox.showwarning(
                "Not Implemented",
                "Selected database type is not implemented yet.\n\n"
                "Current supported: MySQL/MariaDB (including XAMPP).",
            )
            return False
        return True

    def set_db_adapter(self):
        t = self.db_type.get()
        if t == "MySQL/MariaDB":
            self.db_adapter = MySQLCliAdapter(self)
        elif t == "SQLite":
            self.db_adapter = SQLiteAdapter(self)
        elif t == "PostgreSQL":
            self.db_adapter = PostgreSQLAdapter(self)
        elif t == "SQL Server":
            self.db_adapter = SQLServerAdapter(self)
        else:
            self.db_adapter = None

        if hasattr(self, 'conn_frame_title_label'):
            if t == "MySQL/MariaDB":
                self.conn_frame_title_label.config(text="  MySQL Connection  ")
            elif t == "SQLite":
                self.conn_frame_title_label.config(text="  SQLite Connection  ")
            else:
                self.conn_frame_title_label.config(text="  DB Connection  ")

    def _detect_mysql_executable(self):
        """Return path to mysql client executable or None if not found."""
        mysql_path = shutil.which("mysql")
        if mysql_path:
            return mysql_path

        candidates = [
            r"C:\\xampp\\mysql\\bin\\mysql.exe",
            r"C:\\XAMPP\\mysql\\bin\\mysql.exe",
            r"C:\\Program Files\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
            r"C:\\Program Files\\MySQL\\MySQL Server 5.7\\bin\\mysql.exe",
            r"C:\\Program Files (x86)\\MySQL\\MySQL Server 8.0\\bin\\mysql.exe",
            r"C:\\Program Files (x86)\\MySQL\\MySQL Server 5.7\\bin\\mysql.exe",
        ]

        for p in candidates:
            if os.path.exists(p):
                return p

        return None

    def _get_saved_mysql_exe(self):
        """Return user-saved mysql.exe path from config if present and valid."""
        try:
            if os.path.exists(self.db_config_file):
                with open(self.db_config_file, 'r') as f:
                    config = json.load(f)
                saved = config.get('mysql_exe')
                if saved and os.path.exists(saved):
                    return saved
        except Exception:
            pass
        return None

    def _get_mysql_client(self):
        """Get mysql client executable path, re-detecting if needed."""
        if self.mysql_exe and os.path.exists(self.mysql_exe):
            return self.mysql_exe
        self.mysql_exe = self._detect_mysql_executable()
        return self.mysql_exe

    def _mysql_not_found_message(self):
        return (
            "MySQL client executable not found.\n\n"
            "Install MySQL client or XAMPP and ensure mysql.exe is in PATH, or located at:\n"
            "- C:\\xampp\\mysql\\bin\\mysql.exe\n\n"
            "Then restart Dev-X-Flow-Pro."
        )

    def _get_resource_path(self, relative_path):
        """Get absolute path to resource, works for both dev and PyInstaller"""
        try:
            # PyInstaller creates a temp folder and stores path in _MEIPASS
            base_path = sys._MEIPASS
            # In PyInstaller, files are in the root of the bundle
            full_path = os.path.join(base_path, relative_path)
            if os.path.exists(full_path):
                return full_path
            # Try Dev-X-Flow-Pro subdirectory (for --add-data with semicolon syntax)
            full_path = os.path.join(base_path, "Dev-X-Flow-Pro", relative_path)
            if os.path.exists(full_path):
                return full_path
            return full_path  # Return anyway, let caller handle missing file
        except Exception:
            # Running in normal Python environment
            base_path = os.path.dirname(os.path.abspath(__file__))
            return os.path.join(base_path, relative_path)

    def show_splash(self):
        """Show splash screen on startup"""
        splash = tk.Toplevel(self.root)
        splash.overrideredirect(True)  # No window decorations
        
        # Set splash screen size
        splash_width = 400
        splash_height = 300
        
        # Center on screen
        screen_width = self.root.winfo_screenwidth()
        screen_height = self.root.winfo_screenheight()
        x = (screen_width - splash_width) // 2
        y = (screen_height - splash_height) // 2
        splash.geometry(f"{splash_width}x{splash_height}+{x}+{y}")
        
        # Try to load and display icon
        try:
            icon_path = self._get_resource_path("devXflowpro.png")
            if os.path.exists(icon_path):
                # Load and resize image for splash
                from PIL import Image, ImageTk
                img = Image.open(icon_path)
                img = img.resize((150, 150), Image.Resampling.LANCZOS)
                photo = ImageTk.PhotoImage(img)
                
                label = tk.Label(splash, image=photo, bg="#1e1e1e")
                label.image = photo  # Keep reference
                label.pack(expand=True)
            else:
                # Fallback to text
                label = tk.Label(splash, text="Dev-X-Flow-Pro", font=("Segoe UI", 24, "bold"), 
                                bg="#1e1e1e", fg="#007acc")
                label.pack(expand=True)
        except Exception as e:
            # Fallback to text
            label = tk.Label(splash, text="Dev-X-Flow-Pro", font=("Segoe UI", 24, "bold"), 
                            bg="#1e1e1e", fg="#007acc")
            label.pack(expand=True)
        
        # Version text
        version_label = tk.Label(splash, text="v7.1.2", font=("Segoe UI", 12), 
                                  bg="#1e1e1e", fg="#888888")
        version_label.pack()
        
        # Loading text
        loading_label = tk.Label(splash, text="Loading...", font=("Segoe UI", 10), 
                                bg="#1e1e1e", fg="#4ec9b0")
        loading_label.pack(pady=10)
        
        # Configure splash background
        splash.configure(bg="#1e1e1e")
        
        # Raise splash and make sure it's on top
        splash.lift()
        splash.attributes('-topmost', True)
        
        # Hide main window until splash closes
        self.root.withdraw()
        
        # Close splash after 2.5 seconds and show main window
        def close_splash():
            splash.destroy()
            self.root.deiconify()  # Show main window
            self.root.lift()
            self.root.attributes('-topmost', True)
            self.root.after(100, lambda: self.root.attributes('-topmost', False))
        
        self.root.after(2500, close_splash)

    def load_last_repo(self):
        """Load last opened repository from config"""
        try:
            if os.path.exists(self.config_file):
                with open(self.config_file, 'r') as f:
                    config = json.load(f)
                    return config.get('last_repo')
        except:
            pass
        return None

    def save_last_repo(self):
        """Save current repository to config"""
        try:
            with open(self.config_file, 'w') as f:
                json.dump({'last_repo': self.repo_dir}, f)
        except:
            pass

    def run_git_command(self, args, show_error=True):
        """Runs a git command and returns the output"""
        try:
            result = subprocess.run(
                ["git"] + args, 
                cwd=self.repo_dir, 
                capture_output=True, 
                text=True, 
                check=True,
                encoding='utf-8', 
                errors='replace'
            )
            return result.stdout.strip()
        except subprocess.CalledProcessError as e:
            error_msg = f"Error: {e.stderr}"
            if show_error:
                messagebox.showerror("Git Error", error_msg)
            return error_msg
        except Exception as e:
            error_msg = f"Execution Error: {str(e)}"
            if show_error:
                messagebox.showerror("Error", error_msg)
            return error_msg

    def setup_styles(self):
        style = ttk.Style()
        style.theme_use('clam')
        
        # General Frame styling
        style.configure("TFrame", background=self.colors["bg"])
        style.configure("TLabel", background=self.colors["bg"], foreground=self.colors["fg"], font=("Segoe UI", 10))
        style.configure("TLabelframe", background=self.colors["bg"], foreground=self.colors["fg"], bordercolor=self.colors["border"])
        style.configure("TLabelframe.Label", background=self.colors["bg"], foreground=self.colors["accent"], font=("Segoe UI", 11, "bold"))

        # Buttons
        style.configure("TButton", 
            background=self.colors["accent"], 
            foreground="white", 
            borderwidth=0, 
            focuscolor=self.colors["bg"],
            font=("Segoe UI", 10, "bold"),
            padding=8
        )
        style.map("TButton", 
            background=[('active', self.colors["accent_hover"]), ('disabled', self.colors["secondary"])],
            foreground=[('disabled', '#888888')]
        )
        
        # Specialized Buttons
        style.configure("Action.TButton", font=("Segoe UI", 11, "bold"), padding=12)
        style.configure("Secondary.TButton", background=self.colors["secondary"], foreground=self.colors["fg"])
        style.map("Secondary.TButton", background=[('active', '#3e3e42')])
        
        style.configure("Success.TButton", background=self.colors["success"], foreground="#000000")
        style.map("Success.TButton", background=[('active', '#3da890')])
        
        style.configure("Danger.TButton", background=self.colors["danger"], foreground="white")
        style.map("Danger.TButton", background=[('active', '#d96f5d')])

        # Notebook (Tabs)
        style.configure("TNotebook", background=self.colors["bg"], borderwidth=0)
        style.configure("TNotebook.Tab", background=self.colors["secondary"], foreground=self.colors["fg"], 
                       padding=[15, 8], font=("Segoe UI", 10))
        style.map("TNotebook.Tab", background=[('selected', self.colors["accent"])], 
                 foreground=[('selected', 'white')])

        style.configure(
            "TCombobox",
            fieldbackground=self.colors["secondary"],
            background=self.colors["secondary"],
            foreground="white",
            arrowcolor="white",
            selectbackground=self.colors["accent"],
            selectforeground="white",
        )
        style.map(
            "TCombobox",
            fieldbackground=[("readonly", self.colors["secondary"]), ("!disabled", self.colors["secondary"])],
            foreground=[("readonly", "white"), ("!disabled", "white")],
        )

    def create_widgets(self):
        # Main Container
        main_container = ttk.Frame(self.root, padding=15)
        main_container.pack(fill="both", expand=True)

        # --- Repository Selection Section ---
        repo_frame = tk.Frame(main_container, bg=self.colors["secondary"], bd=1, relief="flat")
        repo_frame.pack(fill="x", pady=(0, 15), ipady=8, ipadx=10)
        
        tk.Label(repo_frame, text="REPOSITORY PATH", bg=self.colors["secondary"], 
                fg="#888888", font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=10, pady=(5,0))
        
        repo_path_frame = tk.Frame(repo_frame, bg=self.colors["secondary"])
        repo_path_frame.pack(fill="x", padx=10, pady=(5, 10))
        
        self.repo_path_label = tk.Label(repo_path_frame, text=self.repo_dir, 
                                        bg=self.colors["secondary"], fg=self.colors["success"], 
                                        font=("Consolas", 10), anchor="w")
        self.repo_path_label.pack(side="left", fill="x", expand=True)
        
        # Repository action buttons
        btn_container = tk.Frame(repo_path_frame, bg=self.colors["secondary"])
        btn_container.pack(side="right")
        
        ttk.Button(btn_container, text="📁 Browse", command=self.browse_folder, 
                  style="Secondary.TButton", width=10).pack(side="left", padx=2)
        
        self.init_btn = ttk.Button(btn_container, text="⚡ Init Repo", 
                                   command=self.init_repository, style="Success.TButton", width=12)
        self.init_btn.pack(side="left", padx=2)
        
        # Repository status indicator
        self.repo_status_label = tk.Label(repo_frame, text="● Not a Git Repository", 
                                         bg=self.colors["secondary"], fg=self.colors["danger"],
                                         font=("Segoe UI", 9, "bold"))
        self.repo_status_label.pack(anchor="w", padx=10, pady=(0, 5))

        # --- Branch Info ---
        branch_card = tk.Frame(main_container, bg=self.colors["secondary"], bd=1, relief="flat")
        branch_card.pack(fill="x", pady=(0, 15), ipady=8, ipadx=10)
        
        tk.Label(branch_card, text="CURRENT BRANCH", bg=self.colors["secondary"], 
                fg="#888888", font=("Segoe UI", 8, "bold")).pack(anchor="w", padx=10, pady=(5,0))
        
        branch_row = tk.Frame(branch_card, bg=self.colors["secondary"])
        branch_row.pack(fill="x", padx=10, pady=(0, 5))
        
        branch_val = tk.Label(branch_row, textvariable=self.current_branch, 
                             bg=self.colors["secondary"], fg=self.colors["success"], 
                             font=("Segoe UI", 14, "bold"))
        branch_val.pack(side="left")

        # --- Tabbed Interface ---
        self.notebook = ttk.Notebook(main_container)
        self.notebook.pack(fill="both", expand=True)
        
        # Tab 1: Status & Commit
        self.create_status_tab()
        
        # Tab 2: History
        self.create_history_tab()
        
        # Tab 3: Remote
        self.create_remote_tab()
        
        # Tab 4: Stash
        self.create_stash_tab()
        
        # Tab 5: Terminal
        self.create_terminal_tab()
        
        # Tab 6: Debug
        self.create_debug_tab()
        
        # Tab 7: Diff Viewer
        self.create_diff_tab()
        
        # Tab 8: Merge Conflict Resolver
        self.create_merge_tab()
        
        # Tab 9: Interactive Rebase
        self.create_rebase_tab()
        
        # Tab 10: Database Import
        self.create_database_tab()

    def create_status_tab(self):
        """Create the Status & Commit tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Status & Commit")
        
        # Branch Controls
        controls_frame = ttk.Frame(tab)
        controls_frame.pack(fill="x", pady=(0, 10))
        
        ttk.Button(controls_frame, text="+ New Branch", command=self.create_branch, 
                  style="Secondary.TButton").pack(side="left", padx=(0, 5))
        ttk.Button(controls_frame, text="⇄ Switch Branch", command=self.switch_branch, 
                  style="Secondary.TButton").pack(side="left", padx=5)
        ttk.Button(controls_frame, text="🗑 Delete Branch", command=self.delete_branch,
                  style="Danger.TButton").pack(side="left", padx=5)
        ttk.Button(controls_frame, text="👤 Git Author", command=self.configure_git_author,
                  style="Secondary.TButton").pack(side="left", padx=5)
        ttk.Button(controls_frame, text="↻ Refresh", command=self.refresh_all, 
                  style="Secondary.TButton").pack(side="right")

        # Status Display
        status_frame = ttk.LabelFrame(tab, text="  Git Status  ")
        status_frame.pack(fill="both", expand=True, pady=(0, 10))

        self.status_text = tk.Text(status_frame, 
            height=12, 
            bg=self.colors["text_bg"], 
            fg="#d4d4d4", 
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            selectbackground=self.colors["accent"],
            insertbackground="white"
        )
        self.status_text.pack(fill="both", expand=True, side="left")
        
        scrollbar = ttk.Scrollbar(status_frame, orient="vertical", command=self.status_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.status_text.config(yscrollcommand=scrollbar.set)

        # Commit Section
        action_frame = ttk.LabelFrame(tab, text="  Commit & Push  ")
        action_frame.pack(fill="x")

        msg_frame = ttk.Frame(action_frame, padding=(10, 5))
        msg_frame.pack(fill="x")
        
        # Commit message label with AI button
        msg_header = ttk.Frame(msg_frame)
        msg_header.pack(fill="x", pady=(0, 5))
        ttk.Label(msg_header, text="Commit Message").pack(side="left")
        ttk.Button(msg_header, text="✨ AI Generate", command=self.generate_commit_message,
                  style="Success.TButton").pack(side="right")
        
        self.commit_msg_entry = tk.Entry(msg_frame, 
            bg=self.colors["secondary"], 
            fg="white", 
            insertbackground="white",
            relief="flat",
            font=("Segoe UI", 10),
        )
        self.commit_msg_entry.config(bd=5)
        self.commit_msg_entry.pack(fill="x", ipady=4)

        # Action Buttons
        btn_grid = ttk.Frame(action_frame, padding=10)
        btn_grid.pack(fill="x")

        ttk.Button(btn_grid, text="1. Stage All", command=self.stage_all, 
                  style="Action.TButton").pack(side="left", expand=True, fill="x", padx=(0, 5))
        ttk.Button(btn_grid, text="2. Commit", command=self.commit, 
                  style="Action.TButton").pack(side="left", expand=True, fill="x", padx=5)
        ttk.Button(btn_grid, text="3. Push", command=self.push, 
                  style="Action.TButton").pack(side="left", expand=True, fill="x", padx=(5, 0))
        
        # Sync to Main Workflow
        sync_frame = ttk.Frame(action_frame, padding=(10, 5, 10, 10))
        sync_frame.pack(fill="x")
        
        ttk.Label(sync_frame, text="Quick Workflow:", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0, 10))
        ttk.Button(sync_frame, text="⚡ Sync to Main (Commit → Merge → Push → Pull)", 
                  command=self.sync_to_main, style="Success.TButton").pack(side="left", expand=True, fill="x")

    def create_history_tab(self):
        """Create the History tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="History")
        
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        ttk.Button(controls, text="📜 Refresh Log", command=self.refresh_history).pack(side="left")
        
        # History Display
        history_frame = ttk.LabelFrame(tab, text="  Commit History  ")
        history_frame.pack(fill="both", expand=True)

        self.history_text = tk.Text(history_frame, 
            bg=self.colors["text_bg"], 
            fg="#d4d4d4", 
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="none"
        )
        self.history_text.pack(fill="both", expand=True, side="left")
        
        scrollbar = ttk.Scrollbar(history_frame, orient="vertical", command=self.history_text.yview)
        scrollbar.pack(side="right", fill="y")
        self.history_text.config(yscrollcommand=scrollbar.set)

    def create_remote_tab(self):
        """Create the Remote tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Remote")
        
        # Pull Section
        pull_frame = ttk.LabelFrame(tab, text="  Pull Changes  ")
        pull_frame.pack(fill="x", pady=(0, 10))
        
        pull_controls = ttk.Frame(pull_frame, padding=10)
        pull_controls.pack(fill="x")
        
        ttk.Button(pull_controls, text="⬇ Pull (Merge)", command=self.pull_merge, 
                  style="Success.TButton").pack(side="left", padx=(0, 5))
        ttk.Button(pull_controls, text="⬇ Pull (Rebase)", command=self.pull_rebase,
                  style="Success.TButton").pack(side="left", padx=5)
        ttk.Button(pull_controls, text="↓ Fetch", command=self.fetch,
                  style="Secondary.TButton").pack(side="left", padx=5)

        # Remote List
        remote_frame = ttk.LabelFrame(tab, text="  Configured Remotes  ")
        remote_frame.pack(fill="both", expand=True, pady=(0, 10))
        
        self.remote_text = tk.Text(remote_frame, 
            height=8,
            bg=self.colors["text_bg"], 
            fg="#d4d4d4", 
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10
        )
        self.remote_text.pack(fill="both", expand=True)
        
        # Remote Actions
        remote_actions = ttk.Frame(tab)
        remote_actions.pack(fill="x")
        
        ttk.Button(remote_actions, text="+ Add Remote", command=self.add_remote,
                  style="Secondary.TButton").pack(side="left", padx=(0, 5))
        ttk.Button(remote_actions, text="↻ Refresh Remotes", command=self.refresh_remotes,
                  style="Secondary.TButton").pack(side="left")

    def create_stash_tab(self):
        """Create the Stash tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Stash")
        
        # Stash Controls
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        ttk.Button(controls, text="💾 Stash Changes", command=self.stash_save,
                  style="Success.TButton").pack(side="left", padx=(0, 5))
        ttk.Button(controls, text="↩ Pop Stash", command=self.stash_pop,
                  style="Secondary.TButton").pack(side="left", padx=5)
        ttk.Button(controls, text="↻ Refresh List", command=self.refresh_stash,
                  style="Secondary.TButton").pack(side="left", padx=5)

        # Stash List
        stash_frame = ttk.LabelFrame(tab, text="  Stashed Changes  ")
        stash_frame.pack(fill="both", expand=True)
        
        self.stash_text = tk.Text(stash_frame, 
            bg=self.colors["text_bg"], 
            fg="#d4d4d4", 
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10
        )
        self.stash_text.pack(fill="both", expand=True)

    # ===== Repository Management =====
    
    def browse_folder(self):
        """Browse for a folder"""
        folder = filedialog.askdirectory(initialdir=self.repo_dir, title="Select Repository Folder")
        if folder:
            self.repo_dir = folder
            self.repo_path_label.config(text=folder)
            self.save_last_repo()
            self.check_git_repo()
    
    def check_git_repo(self):
        """Check if current directory is a git repository"""
        git_dir = os.path.join(self.repo_dir, ".git")
        is_repo = os.path.isdir(git_dir)
        self.is_git_repo.set(is_repo)
        
        if is_repo:
            self.repo_status_label.config(text="● Git Repository", fg=self.colors["success"])
            self.init_btn.config(state="disabled")
            self.refresh_all()
        else:
            self.repo_status_label.config(text="● Not a Git Repository", fg=self.colors["danger"])
            self.init_btn.config(state="normal")
            self.current_branch.set("N/A")
            self.clear_all_text_widgets()
    
    def init_repository(self):
        """Initialize a new git repository"""
        confirm = messagebox.askyesno("Initialize Repository", 
                                      f"Initialize a new Git repository in:\n{self.repo_dir}?")
        if not confirm:
            return
        
        try:
            output = self.run_git_command(["init"], show_error=False)
            messagebox.showinfo("Success", f"Repository initialized!\n\n{output}")
            self.check_git_repo()
        except Exception as e:
            messagebox.showerror("Error", f"Failed to initialize repository:\n{str(e)}")

    # ===== Core Git Operations =====
    
    def refresh_all(self):
        """Refresh all information"""
        if not self.is_git_repo.get():
            return
        
        self.get_current_branch()
        self.get_status()
        self.refresh_remotes()
        self.refresh_stash()

    def get_current_branch(self):
        """Get current branch name"""
        branch = self.run_git_command(["branch", "--show-current"], show_error=False)
        self.current_branch.set(branch if branch and not branch.startswith("Error") else "Detached HEAD")

    def get_status(self):
        """Get repository status"""
        status = self.run_git_command(["status"], show_error=False)
        self.status_text.config(state="normal")
        self.status_text.delete(1.0, tk.END)
        self.status_text.insert(tk.END, status)
        self.status_text.config(state="disabled")

    # ===== Branch Operations =====
    
    def create_branch(self):
        """Create a new branch with autocomplete"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
            
        current_branches_raw = self.run_git_command(["branch", "--format=%(refname:short)"], show_error=False)
        current_branches = [b.strip() for b in current_branches_raw.split('\n') if b.strip()]

        dialog = tk.Toplevel(self.root)
        dialog.title("Create New Branch")
        dialog.geometry("450x350")
        dialog.configure(bg=self.colors["bg"])
        dialog.transient(self.root)
        dialog.grab_set()

        # Center dialog
        self.center_window(dialog, 450, 350)

        ttk.Label(dialog, text="Enter new branch name:", font=("Segoe UI", 10)).pack(pady=(15, 5), padx=15, anchor="w")
        ttk.Label(dialog, text="(Type to see suggestions from existing branches)", 
                 font=("Segoe UI", 8), foreground="#888888").pack(pady=(0, 5), padx=15, anchor="w")

        entry_var = tk.StringVar()
        entry = tk.Entry(dialog, 
            textvariable=entry_var,
            bg=self.colors["secondary"], 
            fg="white", 
            insertbackground="white",
            relief="flat",
            font=("Consolas", 11)
        )
        entry.config(bd=5)
        entry.pack(fill="x", padx=15, pady=5)
        entry.focus_set()

        # Suggestions List
        list_frame = ttk.Frame(dialog)
        list_frame.pack(fill="both", expand=True, padx=15, pady=5)

        scrollbar = ttk.Scrollbar(list_frame, orient="vertical")
        suggestion_list = tk.Listbox(list_frame, 
            bg=self.colors["secondary"], 
            fg="#cccccc", 
            selectbackground=self.colors["accent"],
            selectforeground="white",
            font=("Consolas", 10),
            bd=0,
            highlightthickness=0,
            yscrollcommand=scrollbar.set
        )
        scrollbar.config(command=suggestion_list.yview)
        
        suggestion_list.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        def update_suggestions(*args):
            typed = entry_var.get().lower()
            suggestion_list.delete(0, tk.END)
            
            matches = [b for b in current_branches if typed in b.lower()]
            
            prefixes = set()
            for b in current_branches:
                if '/' in b:
                    parts = b.split('/')
                    prefix = parts[0] + '/'
                    if prefix.lower().startswith(typed) and prefix.lower() != typed:
                        prefixes.add(prefix)
            
            for p in sorted(prefixes):
                suggestion_list.insert(tk.END, p)
                
            for m in matches:
                if m not in prefixes:
                    suggestion_list.insert(tk.END, m)

        entry_var.trace('w', update_suggestions)
        update_suggestions()

        def use_suggestion(event):
            selection = suggestion_list.curselection()
            if selection:
                val = suggestion_list.get(selection[0])
                entry_var.set(val)
                entry.icursor(tk.END)
                
        suggestion_list.bind("<ButtonRelease-1>", use_suggestion)

        def confirm_create(event=None):
            new_branch_name = entry_var.get().strip()
            if not new_branch_name:
                return
            
            dialog.destroy()
            output = self.run_git_command(["checkout", "-b", new_branch_name])
            messagebox.showinfo("Result", output)
            self.refresh_all()

        entry.bind("<Return>", confirm_create)

        btn_frame = ttk.Frame(dialog, padding=15)
        btn_frame.pack(fill="x")
        
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy, 
                  style="Secondary.TButton").pack(side="right", padx=5)
        ttk.Button(btn_frame, text="Create Branch", command=confirm_create).pack(side="right", padx=5)

        self.root.wait_window(dialog)

    def switch_branch(self):
        """Switch to a different branch"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
            
        branches_raw = self.run_git_command(["branch", "--format=%(refname:short)"], show_error=False)
        branches = [b.strip() for b in branches_raw.split('\n') if b.strip()]
        
        if not branches:
            messagebox.showinfo("Info", "No branches found.")
            return

        dialog = tk.Toplevel(self.root)
        dialog.title("Switch Branch")
        dialog.geometry("400x300")
        dialog.configure(bg=self.colors["bg"])
        dialog.transient(self.root)
        dialog.grab_set()
        
        self.center_window(dialog, 400, 300)

        ttk.Label(dialog, text="Select a branch to checkout:", font=("Segoe UI", 10)).pack(pady=10, padx=10, anchor="w")

        list_frame = ttk.Frame(dialog)
        list_frame.pack(fill="both", expand=True, padx=10)
        
        scrollbar = ttk.Scrollbar(list_frame, orient="vertical")
        branch_listbox = tk.Listbox(list_frame, 
            bg=self.colors["secondary"], 
            fg="white", 
            selectbackground=self.colors["accent"],
            selectforeground="white",
            font=("Consolas", 11),
            bd=0,
            highlightthickness=1,
            highlightbackground=self.colors["border"],
            yscrollcommand=scrollbar.set
        )
        scrollbar.config(command=branch_listbox.yview)
        
        branch_listbox.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")

        for branch in branches:
            branch_listbox.insert(tk.END, branch)

        current = self.current_branch.get()
        try:
            cur_idx = branches.index(current)
            branch_listbox.select_set(cur_idx)
            branch_listbox.see(cur_idx)
        except ValueError:
            pass
            
        def confirm_selection(event=None):
            selection = branch_listbox.curselection()
            if selection:
                target_branch = branch_listbox.get(selection[0])
                dialog.destroy()
                
                output = self.run_git_command(["checkout", target_branch])
                messagebox.showinfo("Result", output)
                self.refresh_all()

        branch_listbox.bind("<Double-Button-1>", confirm_selection)
        branch_listbox.bind("<Return>", confirm_selection)
        
        btn_frame = ttk.Frame(dialog, padding=10)
        btn_frame.pack(fill="x")
        
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy, 
                  style="Secondary.TButton").pack(side="right", padx=5)
        ttk.Button(btn_frame, text="Checkout", command=confirm_selection).pack(side="right", padx=5)

        branch_listbox.focus_set()
        self.root.wait_window(dialog)

    def delete_branch(self):
        """Delete a local branch"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
            
        branches_raw = self.run_git_command(["branch", "--format=%(refname:short)"], show_error=False)
        branches = [b.strip() for b in branches_raw.split('\n') if b.strip()]
        current = self.current_branch.get()
        
        # Remove current branch from list
        branches = [b for b in branches if b != current]
        
        if not branches:
            messagebox.showinfo("Info", "No other branches to delete.")
            return

        branch = tk.simpledialog.askstring("Delete Branch", 
                                          "Enter branch name to delete:\n\nAvailable branches:\n" + "\n".join(branches))
        if branch and branch in branches:
            confirm = messagebox.askyesno("Confirm Delete", f"Delete branch '{branch}'?")
            if confirm:
                output = self.run_git_command(["branch", "-d", branch])
                messagebox.showinfo("Result", output)
                self.refresh_all()

    # ===== Commit Operations =====
    
    def stage_all(self):
        """Stage all changes"""
        if not self.is_git_repo.get():
            return
            
        output = self.run_git_command(["add", "."], show_error=False)
        if not output: 
            output = "Staged all changes."
        self.status_text.config(state="normal")
        self.status_text.insert(tk.END, f"\n\n--- Stage All ---\n{output}")
        self.status_text.see(tk.END)
        self.status_text.config(state="disabled")
        self.get_status()

    def commit(self):
        """Commit staged changes"""
        if not self.is_git_repo.get():
            return
            
        msg = self.commit_msg_entry.get()
        if not msg:
            messagebox.showwarning("Warning", "Please enter a commit message.")
            return
        
        output = self.run_git_command(["commit", "-m", msg])
        messagebox.showinfo("Commit Result", output)
        self.commit_msg_entry.delete(0, tk.END)
        self.refresh_all()

    def push(self):
        """Push commits to remote"""
        if not self.is_git_repo.get():
            return
            
        branch = self.current_branch.get()
        if not branch or branch.startswith("Error") or branch == "Detached HEAD":
            messagebox.showerror("Error", "Cannot determine current branch.")
            return

        confirm = messagebox.askyesno("Confirm Push", f"Push commits to origin/{branch}?")
        if confirm:
            def do_push():
                self.root.config(cursor="wait")
                self.root.update()
                
                output = self.run_git_command(["push", "origin", branch], show_error=False)
                
                self.root.config(cursor="")
                self.root.after(0, lambda: messagebox.showinfo("Push Result", output))
            
            threading.Thread(target=do_push, daemon=True).start()

    # ===== AI Commit Message Generation =====
    
    def load_ai_config(self):
        """Load AI API configuration from file"""
        try:
            if os.path.exists(self.ai_config_file):
                with open(self.ai_config_file, 'r') as f:
                    config = json.load(f)
                    self.ai_api_key = config.get('api_key')
                    # Load provider if saved, otherwise default to openai
                    saved_provider = config.get('provider', 'openai')
                    if saved_provider in self.ai_providers:
                        self.ai_provider.set(saved_provider)
                    # Load custom model if specified
                    self.ai_custom_model = config.get('custom_model', '')
        except:
            self.ai_api_key = None
            self.ai_provider.set('openai')
            self.ai_custom_model = ''
    
    def save_ai_config(self):
        """Save AI API configuration to file"""
        try:
            config = {
                'api_key': self.ai_api_key,
                'provider': self.ai_provider.get(),
                'custom_model': getattr(self, 'ai_custom_model', '')
            }
            with open(self.ai_config_file, 'w') as f:
                json.dump(config, f)
        except:
            pass
    
    def get_git_diff(self):
        """Get staged git diff for AI context"""
        if not self.is_git_repo.get():
            return None
        
        # Get staged diff
        diff = self.run_git_command(['diff', '--cached'], show_error=False)
        if not diff or diff.startswith('Error'):
            # Try unstaged diff if no staged changes
            diff = self.run_git_command(['diff'], show_error=False)
        
        if not diff or diff.startswith('Error'):
            return None
        
        return diff
    
    def generate_commit_message(self):
        """Generate commit message using AI API"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
        
        # Check if API key is configured
        if not self.ai_api_key:
            result = messagebox.askyesno("AI API Key Required", 
                "No API key configured. Would you like to configure it now?")
            if result:
                self.configure_ai_api()
            return
        
        # Get git diff
        diff = self.get_git_diff()
        if not diff:
            messagebox.showinfo("Info", "No changes detected. Stage some changes first.")
            return
        
        # Show loading state
        self.root.config(cursor="wait")
        self.commit_msg_entry.delete(0, tk.END)
        self.commit_msg_entry.insert(0, "Generating commit message...")
        self.root.update()
        
        def do_generate():
            try:
                # Get provider configuration
                provider_key = self.ai_provider.get()
                provider = self.ai_providers.get(provider_key)
                
                if not provider:
                    raise Exception(f"Unknown provider: {provider_key}")
                
                # Prepare AI prompt
                prompt = f"""Analyze the following git diff and generate a concise, professional commit message.
                Follow conventional commits format (type: description).
                Keep it under 72 characters.
                
                Git diff:
                {diff[:4000]}
                
                Generate only the commit message, nothing else."""
                
                # Determine model to use
                model = getattr(self, 'ai_custom_model', '') or provider['model']
                
                # Build request
                headers = provider['headers'](self.ai_api_key)
                payload = provider['payload'](prompt, model)
                
                # Determine endpoint
                if 'endpoint_template' in provider:
                    if provider_key == 'google':
                        endpoint = provider['endpoint_template'].format(model=model, key=self.ai_api_key)
                    elif provider_key == 'azure':
                        # For Azure, user would need to set custom model as "resource/deployment"
                        parts = model.split('/') if '/' in model else ['your-resource', model]
                        endpoint = f"https://{parts[0]}.openai.azure.com/openai/deployments/{parts[1]}/chat/completions?api-version=2024-02-15-preview"
                    else:
                        endpoint = provider['endpoint']
                else:
                    endpoint = provider['endpoint']
                
                # Make API request
                response = requests.post(
                    endpoint,
                    headers=headers,
                    json=payload,
                    timeout=30
                )
                
                if response.status_code == 200:
                    message = provider['extract_response'](response)
                    
                    # Clean up the message
                    message = message.replace('"', '').replace("'", "")
                    message = message.split('\n')[0][:72]  # First line, max 72 chars
                    
                    self.root.after(0, lambda: self._update_commit_message(message))
                else:
                    error_msg = f"API Error {response.status_code}: {response.text[:200]}"
                    self.root.after(0, lambda: self._update_commit_message(error_msg, is_error=True))
                    
            except Exception as e:
                error_msg = f"Error: {str(e)}"
                self.root.after(0, lambda: self._update_commit_message(error_msg, is_error=True))
            finally:
                self.root.after(0, lambda: self.root.config(cursor=""))
        
        threading.Thread(target=do_generate, daemon=True).start()
    
    def _update_commit_message(self, message, is_error=False):
        """Update commit message entry with generated message"""
        self.commit_msg_entry.delete(0, tk.END)
        if is_error:
            self.commit_msg_entry.insert(0, message)
            messagebox.showerror("AI Generation Failed", message)
        else:
            self.commit_msg_entry.insert(0, message)
            self.commit_msg_entry.focus_set()
    
    def configure_ai_api(self):
        """Open dialog to configure AI API key and provider"""
        dialog = tk.Toplevel(self.root)
        dialog.title("Configure AI API")
        dialog.geometry("500x350")
        dialog.configure(bg=self.colors["bg"])
        dialog.transient(self.root)
        dialog.grab_set()
        
        self.center_window(dialog, 500, 350)
        
        # Provider selection
        ttk.Label(dialog, text="AI Provider:", font=("Segoe UI", 10, "bold")).pack(pady=(15, 5), padx=20, anchor="w")
        
        provider_frame = ttk.Frame(dialog)
        provider_frame.pack(fill="x", padx=20, pady=5)
        
        provider_combo = ttk.Combobox(provider_frame, 
                                      textvariable=self.ai_provider,
                                      values=list(self.ai_providers.keys()),
                                      state="readonly",
                                      width=20)
        provider_combo.pack(side="left", fill="x", expand=True)
        self._bind_dark_combobox(provider_combo)
        
        # Provider info label
        provider_info = tk.Label(dialog, text="", 
                                  bg=self.colors["bg"], 
                                  fg=self.colors["accent"],
                                  font=("Segoe UI", 9))
        provider_info.pack(pady=(0, 10), padx=20, anchor="w")
        
        def update_provider_info(*args):
            key = self.ai_provider.get()
            if key in self.ai_providers:
                info = self.ai_providers[key]
                provider_info.config(text=f"{info['name']} - Model: {info['model']}")
        
        self.ai_provider.trace('w', update_provider_info)
        update_provider_info()
        
        # API Key input
        ttk.Label(dialog, text="API Key:", font=("Segoe UI", 10, "bold")).pack(pady=(10, 5), padx=20, anchor="w")
        
        api_entry = tk.Entry(dialog, 
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 10),
            show="•"
        )
        api_entry.pack(fill="x", padx=20, pady=5, ipady=5)
        
        if self.ai_api_key:
            api_entry.insert(0, self.ai_api_key)
        
        # Custom model input (optional)
        ttk.Label(dialog, text="Custom Model (optional):", font=("Segoe UI", 9)).pack(pady=(10, 5), padx=20, anchor="w")
        
        model_entry = tk.Entry(dialog, 
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 10)
        )
        model_entry.pack(fill="x", padx=20, pady=5, ipady=5)
        model_entry.insert(0, getattr(self, 'ai_custom_model', ''))
        
        ttk.Label(dialog, text="Leave empty to use default model for selected provider",
                 font=("Segoe UI", 8), foreground="#888888").pack(pady=(0, 5), padx=20, anchor="w")
        
        # Help link
        def open_provider_url():
            key = self.ai_provider.get()
            if key in self.ai_providers:
                import webbrowser
                webbrowser.open(self.ai_providers[key]['url'])
        
        ttk.Button(dialog, text="🔑 Get API Key", command=open_provider_url,
                  style="Secondary.TButton").pack(pady=(5, 0), padx=20, anchor="w")
        
        def save_api():
            key = api_entry.get().strip()
            custom_model = model_entry.get().strip()
            
            if not key:
                messagebox.showwarning("Warning", "Please enter an API key.")
                return
            
            self.ai_api_key = key
            self.ai_custom_model = custom_model
            self.save_ai_config()
            dialog.destroy()
            messagebox.showinfo("Success", f"API configuration saved for {self.ai_providers[self.ai_provider.get()]['name']}!")
        
        btn_frame = ttk.Frame(dialog, padding=20)
        btn_frame.pack(fill="x", side="bottom")
        
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy, 
                  style="Secondary.TButton").pack(side="right", padx=5)
        ttk.Button(btn_frame, text="Save", command=save_api).pack(side="right", padx=5)
        
        api_entry.focus_set()
        api_entry.bind("<Return>", lambda e: save_api())

    # ===== Pull Operations =====
    
    def pull_merge(self):
        """Pull with merge strategy"""
        if not self.is_git_repo.get():
            return
        
        def do_pull():
            self.root.config(cursor="wait")
            self.root.update()
            
            output = self.run_git_command(["pull"], show_error=False)
            
            self.root.config(cursor="")
            self.root.after(0, lambda: messagebox.showinfo("Pull Result", output))
            self.root.after(100, self.refresh_all)
        
        threading.Thread(target=do_pull, daemon=True).start()

    def pull_rebase(self):
        """Pull with rebase strategy"""
        if not self.is_git_repo.get():
            return
        
        def do_pull():
            self.root.config(cursor="wait")
            self.root.update()
            
            output = self.run_git_command(["pull", "--rebase"], show_error=False)
            
            self.root.config(cursor="")
            self.root.after(0, lambda: messagebox.showinfo("Pull Result", output))
            self.root.after(100, self.refresh_all)
        
        threading.Thread(target=do_pull, daemon=True).start()

    def fetch(self):
        """Fetch updates from remote"""
        if not self.is_git_repo.get():
            return
        
        def do_fetch():
            self.root.config(cursor="wait")
            self.root.update()
            
            output = self.run_git_command(["fetch", "--all"], show_error=False)
            
            self.root.config(cursor="")
            self.root.after(0, lambda: messagebox.showinfo("Fetch Result", output if output else "Fetch completed."))
            self.root.after(100, self.refresh_all)
        
        threading.Thread(target=do_fetch, daemon=True).start()

    # ===== Remote Operations =====
    
    def refresh_remotes(self):
        """Refresh remote list"""
        if not self.is_git_repo.get():
            self.remote_text.config(state="normal")
            self.remote_text.delete(1.0, tk.END)
            self.remote_text.insert(tk.END, "Not a git repository")
            self.remote_text.config(state="disabled")
            return
            
        output = self.run_git_command(["remote", "-v"], show_error=False)
        self.remote_text.config(state="normal")
        self.remote_text.delete(1.0, tk.END)
        self.remote_text.insert(tk.END, output if output else "No remotes configured")
        self.remote_text.config(state="disabled")

    def add_remote(self):
        """Add a new remote"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
        
        name = tk.simpledialog.askstring("Add Remote", "Enter remote name (e.g., origin):")
        if not name:
            return
        
        url = tk.simpledialog.askstring("Add Remote", "Enter remote URL:")
        if not url:
            return
        
        output = self.run_git_command(["remote", "add", name, url])
        messagebox.showinfo("Result", output if output else f"Remote '{name}' added successfully")
        self.refresh_remotes()

    # ===== Stash Operations =====
    
    def stash_save(self):
        """Stash current changes"""
        if not self.is_git_repo.get():
            return
        
        message = tk.simpledialog.askstring("Stash Changes", "Enter stash message (optional):")
        if message is None:  # User cancelled
            return
        
        if message:
            output = self.run_git_command(["stash", "save", message])
        else:
            output = self.run_git_command(["stash"])
        
        messagebox.showinfo("Stash Result", output)
        self.refresh_all()

    def stash_pop(self):
        """Pop the most recent stash"""
        if not self.is_git_repo.get():
            return
        
        confirm = messagebox.askyesno("Pop Stash", "Apply and remove the most recent stash?")
        if confirm:
            output = self.run_git_command(["stash", "pop"])
            messagebox.showinfo("Stash Pop Result", output)
            self.refresh_all()

    def refresh_stash(self):
        """Refresh stash list"""
        if not self.is_git_repo.get():
            self.stash_text.config(state="normal")
            self.stash_text.delete(1.0, tk.END)
            self.stash_text.insert(tk.END, "Not a git repository")
            self.stash_text.config(state="disabled")
            return
            
        output = self.run_git_command(["stash", "list"], show_error=False)
        self.stash_text.config(state="normal")
        self.stash_text.delete(1.0, tk.END)
        self.stash_text.insert(tk.END, output if output else "No stashes saved")
        self.stash_text.config(state="disabled")

    # ===== History Operations =====
    
    def refresh_history(self):
        """Refresh commit history"""
        if not self.is_git_repo.get():
            self.history_text.config(state="normal")
            self.history_text.delete(1.0, tk.END)
            self.history_text.insert(tk.END, "Not a git repository")
            self.history_text.config(state="disabled")
            return
            
        output = self.run_git_command(["log", "--oneline", "--graph", "--all", "--decorate", "-20"], show_error=False)
        self.history_text.config(state="normal")
        self.history_text.delete(1.0, tk.END)
        self.history_text.insert(tk.END, output if output else "No commits yet")
        self.history_text.config(state="disabled")

    # ===== Workflow Automation =====
    
    def sync_to_main(self):
        """Automated workflow: Stage → Commit → Switch to main → Merge → Push → Pull"""
        if not self.is_git_repo.get():
            messagebox.showwarning("Warning", "Not a git repository")
            return
        
        current = self.current_branch.get()
        if current == "main" or current == "master":
            messagebox.showinfo("Info", "You are already on the main branch. Use regular Pull/Push instead.")
            return
        
        # Check for commit message
        msg = self.commit_msg_entry.get().strip()
        if not msg:
            messagebox.showwarning("Warning", "Please enter a commit message for your changes.")
            return
        
        # Confirm the workflow
        confirm_msg = f"""This will perform the following steps:

1. Stage all changes
2. Commit with message: "{msg}"
3. Push '{current}' to remote
4. Switch to 'main' branch
5. Merge '{current}' into main
6. Push main to remote
7. Pull latest changes from main
8. Switch back to '{current}'

Continue?"""
        
        if not messagebox.askyesno("Confirm Sync to Main", confirm_msg):
            return
        
        def do_sync():
            self.root.config(cursor="wait")
            self.root.update()
            
            steps = []
            errors = []
            
            try:
                # Step 1: Stage all
                steps.append("[1/8] Staging all changes...")
                result = self.run_git_command(["add", "."], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Stage failed: {result}")
                    raise Exception("Stage failed")
                
                # Step 2: Commit
                steps.append("[2/8] Committing changes...")
                result = self.run_git_command(["commit", "-m", msg], show_error=False)
                if result and result.startswith("Error"):
                    # Check if it's "nothing to commit" which is OK
                    if "nothing to commit" not in result:
                        errors.append(f"Commit failed: {result}")
                        raise Exception("Commit failed")
                
                # Step 3: Push current branch
                steps.append(f"[3/8] Pushing '{current}' to remote...")
                result = self.run_git_command(["push", "origin", current], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Push {current} failed: {result}")
                    raise Exception("Push failed")
                
                # Step 4: Switch to main
                steps.append("[4/8] Switching to main branch...")
                result = self.run_git_command(["checkout", "main"], show_error=False)
                if result and result.startswith("Error"):
                    # Try 'master' if 'main' doesn't exist
                    result = self.run_git_command(["checkout", "master"], show_error=False)
                    if result and result.startswith("Error"):
                        errors.append(f"Switch to main failed: {result}")
                        raise Exception("Switch to main failed")
                    main_branch = "master"
                else:
                    main_branch = "main"
                
                # Step 5: Merge feature branch into main
                steps.append(f"[5/8] Merging '{current}' into {main_branch}...")
                result = self.run_git_command(["merge", current, "--no-ff", "-m", f"Merge {current} into {main_branch}"], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Merge failed: {result}")
                    raise Exception("Merge failed")
                
                # Step 6: Push main
                steps.append(f"[6/8] Pushing {main_branch} to remote...")
                result = self.run_git_command(["push", "origin", main_branch], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Push {main_branch} failed: {result}")
                    raise Exception("Push main failed")
                
                # Step 7: Pull latest from main
                steps.append(f"[7/8] Pulling latest changes from {main_branch}...")
                result = self.run_git_command(["pull", "origin", main_branch], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Pull {main_branch} failed: {result}")
                    # Continue anyway as main is already updated
                
                # Step 8: Switch back to original branch
                steps.append(f"[8/8] Switching back to '{current}'...")
                result = self.run_git_command(["checkout", current], show_error=False)
                if result and result.startswith("Error"):
                    errors.append(f"Switch back to {current} failed: {result}")
                    raise Exception("Switch back failed")
                
                steps.append("\n✅ Sync to Main completed successfully!")
                
            except Exception as e:
                steps.append(f"\n❌ Sync failed at step: {str(e)}")
            
            self.root.config(cursor="")
            
            # Show results
            result_msg = "\n".join(steps)
            if errors:
                result_msg += "\n\nErrors encountered:\n" + "\n".join(errors)
            
            self.root.after(0, lambda: messagebox.showinfo("Sync to Main Result", result_msg))
            self.root.after(100, self.refresh_all)
            self.root.after(100, lambda: self.commit_msg_entry.delete(0, tk.END))
        
        threading.Thread(target=do_sync, daemon=True).start()

    # ===== Helper Methods =====
    
    def center_window(self, window, width, height):
        """Center a window on the parent"""
        root_x = self.root.winfo_x()
        root_y = self.root.winfo_y()
        root_w = self.root.winfo_width()
        root_h = self.root.winfo_height()
        pos_x = root_x + (root_w // 2) - (width // 2)
        pos_y = root_y + (root_h // 2) - (height // 2)
        window.geometry(f"+{pos_x}+{pos_y}")

    def clear_all_text_widgets(self):
        """Clear all text display widgets"""
        widgets = [self.status_text, self.history_text, self.remote_text, self.stash_text]
        for widget in widgets:
            widget.config(state="normal")
            widget.delete(1.0, tk.END)
            widget.insert(tk.END, "Not a git repository")
            widget.config(state="disabled")
    
    # ===== Terminal Operations =====
    
    def create_terminal_tab(self):
        """Create the Terminal tab with command execution and suggestions"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Terminal")
        
        # Controls Frame
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        # Project Type Selection
        ttk.Label(controls, text="Project Type:", font=("Segoe UI", 9, "bold")).pack(side="left", padx=(0, 5))
        project_combo = ttk.Combobox(controls, textvariable=self.project_type, 
                                     values=["Laravel", "Node.js", "Python", "General"],
                                     state="readonly", width=12)
        project_combo.pack(side="left", padx=5)
        self._bind_dark_combobox(project_combo)
        project_combo.bind("<<ComboboxSelected>>", lambda e: self.update_terminal_suggestions())
        
        # Suggestions Toggle
        tk.Checkbutton(
            controls,
            text="Enable Suggestions",
            variable=self.suggestions_enabled,
            command=self.toggle_suggestions,
            bg=self.colors["bg"],
            fg=self.colors["fg"],
            activebackground=self.colors["bg"],
            activeforeground=self.colors["fg"],
            selectcolor=self.colors["bg"],
            highlightthickness=0,
            bd=0,
        ).pack(side="left", padx=10)
        
        # Refresh & Clear Buttons
        ttk.Button(controls, text="↻ Detect Project", command=self.detect_project_type,
                  style="Secondary.TButton").pack(side="right", padx=2)
        ttk.Button(controls, text="🗑 Clear", command=self.clear_terminal,
                  style="Secondary.TButton").pack(side="right", padx=2)
        
        # Main Terminal Frame
        terminal_frame = ttk.Frame(tab)
        terminal_frame.pack(fill="both", expand=True)
        
        # Left: Suggestions Panel
        suggestions_frame = ttk.LabelFrame(terminal_frame, text="  Quick Commands  ", width=250)
        suggestions_frame.pack(side="left", fill="both", padx=(0, 5))
        suggestions_frame.pack_propagate(False)
        
        # Suggestion List
        suggestion_scroll = ttk.Scrollbar(suggestions_frame, orient="vertical")
        self.suggestion_list = tk.Listbox(suggestions_frame,
            bg=self.colors["secondary"],
            fg="#cccccc",
            selectbackground=self.colors["accent"],
            selectforeground="white",
            font=("Consolas", 9),
            bd=0,
            highlightthickness=0,
            yscrollcommand=suggestion_scroll.set
        )
        suggestion_scroll.config(command=self.suggestion_list.yview)
        self.suggestion_list.pack(side="left", fill="both", expand=True)
        suggestion_scroll.pack(side="right", fill="y")
        
        # Bind double-click to insert command
        self.suggestion_list.bind("<Double-Button-1>", self.insert_suggestion_to_terminal)
        
        # Right: Terminal Output and Input
        right_frame = ttk.Frame(terminal_frame)
        right_frame.pack(side="right", fill="both", expand=True)
        
        # Terminal Output Display
        output_frame = ttk.LabelFrame(right_frame, text="  Terminal Output  ")
        output_frame.pack(fill="both", expand=True, pady=(0, 10))
        
        self.terminal_output = tk.Text(output_frame,
            bg=self.colors["text_bg"],
            fg="#d4d4d4",
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="word",
            state="disabled"
        )
        self.terminal_output.pack(side="left", fill="both", expand=True)
        
        # Configure color tags for terminal output
        self.terminal_output.tag_config("error", foreground=self.colors["danger"])
        self.terminal_output.tag_config("success", foreground=self.colors["success"])
        self.terminal_output.tag_config("warning", foreground=self.colors["warning"])
        self.terminal_output.tag_config("info", foreground=self.colors["accent"])
        
        # Configure clickable URL tag
        self.terminal_output.tag_config("url", foreground="#569cd6", underline=False)
        self.terminal_output.tag_bind("url", "<Button-1>", self.open_url_from_terminal)
        self.terminal_output.tag_bind("url", "<Enter>", lambda e: self.terminal_output.config(cursor="hand2"))
        self.terminal_output.tag_bind("url", "<Leave>", lambda e: self.terminal_output.config(cursor=""))
        
        terminal_scroll = ttk.Scrollbar(output_frame, orient="vertical", command=self.terminal_output.yview)
        terminal_scroll.pack(side="right", fill="y")
        self.terminal_output.config(yscrollcommand=terminal_scroll.set)
        
        # Command Input Frame
        input_frame = ttk.LabelFrame(right_frame, text="  Command  ")
        input_frame.pack(fill="x")
        
        input_container = ttk.Frame(input_frame, padding=10)
        input_container.pack(fill="x")
        
        self.terminal_input = tk.Entry(input_container,
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 10)
        )
        self.terminal_input.config(bd=5)
        self.terminal_input.pack(side="left", fill="x", expand=True, ipady=4, padx=(0, 5))
        self.terminal_input.bind("<Return>", lambda e: self.execute_terminal_command())
        self.terminal_input.bind("<Up>", self.navigate_history_up)
        self.terminal_input.bind("<Down>", self.navigate_history_down)
        self.terminal_input.bind("<KeyRelease>", self.filter_suggestions)
        
        ttk.Button(input_container, text="▶ Run", command=self.execute_terminal_command,
                  style="Success.TButton", width=8).pack(side="left")
        
        # Initialize suggestions
        self.update_terminal_suggestions()
    
    def detect_project_type(self):
        """Automatically detect project type based on files in directory"""
        if not os.path.exists(self.repo_dir):
            self.project_type.set("General")
            return
        
        files = os.listdir(self.repo_dir)
        
        # Check for Laravel
        if "composer.json" in files and "artisan" in files:
            self.project_type.set("Laravel")
        # Check for Node.js
        elif "package.json" in files:
            self.project_type.set("Node.js")
        # Check for Python
        elif "requirements.txt" in files or "setup.py" in files or "manage.py" in files:
            self.project_type.set("Python")
        else:
            self.project_type.set("General")
        
        self.update_terminal_suggestions()
    
    def update_terminal_suggestions(self):
        """Update suggestion list based on project type"""
        ptype = self.project_type.get()
        commands = self.command_templates.get(ptype, [])
        
        self.suggestion_list.delete(0, tk.END)
        for cmd in commands:
            self.suggestion_list.insert(tk.END, cmd)
    
    def toggle_suggestions(self):
        """Toggle suggestion panel visibility"""
        # Simply update the list to show/hide suggestions
        if self.suggestions_enabled.get():
            self.update_terminal_suggestions()
        else:
            self.suggestion_list.delete(0, tk.END)
    
    def filter_suggestions(self, event=None):
        """Filter suggestions based on input text"""
        if not self.suggestions_enabled.get():
            return
        
        typed = self.terminal_input.get().lower()
        if not typed:
            self.update_terminal_suggestions()
            return
        
        ptype = self.project_type.get()
        all_commands = self.command_templates.get(ptype, [])
        
        # Filter commands that contain the typed text
        filtered = [cmd for cmd in all_commands if typed in cmd.lower()]
        
        self.suggestion_list.delete(0, tk.END)
        for cmd in filtered:
            self.suggestion_list.insert(tk.END, cmd)
    
    def insert_suggestion_to_terminal(self, event=None):
        """Insert selected suggestion into terminal input"""
        selection = self.suggestion_list.curselection()
        if selection:
            cmd = self.suggestion_list.get(selection[0])
            self.terminal_input.delete(0, tk.END)
            self.terminal_input.insert(0, cmd)
            self.terminal_input.focus_set()
    
    def execute_terminal_command(self):
        """Execute command from terminal input"""
        command = self.terminal_input.get().strip()
        if not command:
            return
        
        # Add to history
        if not self.command_history or self.command_history[-1] != command:
            self.command_history.append(command)
            if len(self.command_history) > 50:  # Keep last 50 commands
                self.command_history.pop(0)
            self.save_command_history()
        
        self.history_index = len(self.command_history)
        
        # Display command in output
        self.append_to_terminal(f"\n> {command}\n", "info")
        
        # Clear input
        self.terminal_input.delete(0, tk.END)
        
        # Execute command asynchronously
        def run_command():
            try:
                # Use shell=True on Windows for proper command execution
                process = subprocess.Popen(
                    command,
                    cwd=self.repo_dir,
                    shell=True,
                    stdout=subprocess.PIPE,
                    stderr=subprocess.PIPE,
                    text=True,
                    encoding='utf-8',
                    errors='replace'
                )
                
                self.current_process = process
                
                # Read output in real-time
                for line in process.stdout:
                    self.root.after(0, lambda l=line: self.append_to_terminal(l, "success"))
                
                # Read errors
                stderr_output = process.stderr.read()
                if stderr_output:
                    self.root.after(0, lambda e=stderr_output: self.append_to_terminal(e, "error"))
                
                # Wait for completion
                process.wait()
                
                self.current_process = None
                
                if process.returncode == 0:
                    self.root.after(0, lambda: self.append_to_terminal("\n✓ Command completed successfully\n", "success"))
                else:
                    self.root.after(0, lambda: self.append_to_terminal(f"\n✗ Command exited with code {process.returncode}\n", "error"))
                    
            except Exception as e:
                self.root.after(0, lambda: self.append_to_terminal(f"\nError executing command: {str(e)}\n", "error"))
        
        # Run in background thread
        threading.Thread(target=run_command, daemon=True).start()
    
    def append_to_terminal(self, text, tag=None):
        """Append text to terminal output with optional color tag and URL detection"""
        self.terminal_output.config(state="normal")
        
        # Detect URLs in the text
        url_pattern = r'https?://[^\s]+|http://[^\s]+'
        urls = list(re.finditer(url_pattern, text))
        
        if urls:
            # Insert text with URLs as clickable links
            last_end = 0
            for match in urls:
                # Insert text before URL
                if match.start() > last_end:
                    before_text = text[last_end:match.start()]
                    if tag:
                        self.terminal_output.insert(tk.END, before_text, tag)
                    else:
                        self.terminal_output.insert(tk.END, before_text)
                
                # Insert URL as clickable link
                url = match.group()
                # Store URL in a tag-specific way
                url_tag = f"url_{id(match)}"
                self.terminal_output.insert(tk.END, url, ("url", url_tag))
                # Store the URL data for later retrieval
                self.terminal_output.tag_bind(url_tag, "<Button-1>", 
                    lambda e, u=url: self.open_url_in_browser(u))
                
                last_end = match.end()
            
            # Insert remaining text after last URL
            if last_end < len(text):
                remaining = text[last_end:]
                if tag:
                    self.terminal_output.insert(tk.END, remaining, tag)
                else:
                    self.terminal_output.insert(tk.END, remaining)
        else:
            # No URLs found, insert normally
            if tag:
                self.terminal_output.insert(tk.END, text, tag)
            else:
                self.terminal_output.insert(tk.END, text)
        
        self.terminal_output.see(tk.END)
        self.terminal_output.config(state="disabled")
    
    def open_url_in_browser(self, url):
        """Open URL in default browser"""
        try:
            # Clean up URL (remove brackets or trailing punctuation)
            url = url.rstrip('.])')
            webbrowser.open(url)
            self.append_to_terminal(f"\n🌐 Opened {url} in browser\n", "info")
        except Exception as e:
            self.append_to_terminal(f"\nError opening URL: {str(e)}\n", "error")
    
    def open_url_from_terminal(self, event):
        """Handle click on URL in terminal - for generic url tag"""
        # This is a backup handler, specific URL handlers are bound per URL
        pass
    
    def clear_terminal(self):
        """Clear terminal output"""
        self.terminal_output.config(state="normal")
        self.terminal_output.delete(1.0, tk.END)
        self.terminal_output.config(state="disabled")
        self.append_to_terminal("Terminal cleared.\n\n", "info")
    
    def navigate_history_up(self, event):
        """Navigate to previous command in history"""
        if not self.command_history:
            return
        
        if self.history_index > 0:
            self.history_index -= 1
            self.terminal_input.delete(0, tk.END)
            self.terminal_input.insert(0, self.command_history[self.history_index])
    
    def navigate_history_down(self, event):
        """Navigate to next command in history"""
        if not self.command_history:
            return
        
        if self.history_index < len(self.command_history) - 1:
            self.history_index += 1
            self.terminal_input.delete(0, tk.END)
            self.terminal_input.insert(0, self.command_history[self.history_index])
        elif self.history_index == len(self.command_history) - 1:
            self.history_index = len(self.command_history)
            self.terminal_input.delete(0, tk.END)
    
    def load_command_history(self):
        """Load command history from file"""
        try:
            if os.path.exists(self.history_file):
                with open(self.history_file, 'r') as f:
                    data = json.load(f)
                    self.command_history = data.get('history', [])
        except:
            self.command_history = []
    
    def save_command_history(self):
        """Save command history to file"""
        try:
            with open(self.history_file, 'w') as f:
                json.dump({'history': self.command_history}, f)
        except:
            pass
    
    # ===== Debug Operations =====
    
    def create_debug_tab(self):
        """Create the Debug tab with Laravel log monitoring"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Debug")
        
        # Controls Frame
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        # Log file info
        self.log_info_label = tk.Label(controls, text="No log file detected",
                                       bg=self.colors["bg"], fg="#888888",
                                       font=("Segoe UI", 9))
        self.log_info_label.pack(side="left", padx=(0, 10))
        
        # Auto-refresh toggle
        tk.Checkbutton(
            controls,
            text="Auto-refresh",
            variable=self.log_auto_refresh,
            command=self.toggle_log_refresh,
            bg=self.colors["bg"],
            fg=self.colors["fg"],
            activebackground=self.colors["bg"],
            activeforeground=self.colors["fg"],
            selectcolor=self.colors["bg"],
            highlightthickness=0,
            bd=0,
        ).pack(side="left", padx=5)
        
        # Control buttons
        ttk.Button(controls, text="↻ Refresh Now", command=self.refresh_debug_logs,
                  style="Secondary.TButton").pack(side="right", padx=2)
        ttk.Button(controls, text="🗑 Clear Display", command=self.clear_debug_display,
                  style="Secondary.TButton").pack(side="right", padx=2)
        ttk.Button(controls, text="📂 Open Log File", command=self.open_log_file,
                  style="Secondary.TButton").pack(side="right", padx=2)
        
        # Error Summary Frame
        summary_frame = tk.Frame(tab, bg=self.colors["secondary"], bd=1, relief="flat")
        summary_frame.pack(fill="x", pady=(0, 10), ipady=5, ipadx=10)
        
        self.error_count_label = tk.Label(summary_frame, text="Errors: 0 | Warnings: 0 | Info: 0",
                                         bg=self.colors["secondary"], fg=self.colors["warning"],
                                         font=("Segoe UI", 9, "bold"))
        self.error_count_label.pack(side="left", padx=10)
        
        # Log Display
        log_frame = ttk.LabelFrame(tab, text="  Laravel Log Output  ")
        log_frame.pack(fill="both", expand=True)
        
        self.debug_log_text = tk.Text(log_frame,
            bg=self.colors["text_bg"],
            fg="#d4d4d4",
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="word",
            state="disabled"
        )
        self.debug_log_text.pack(side="left", fill="both", expand=True)
        
        # Configure color tags for different log levels
        self.debug_log_text.tag_config("error", foreground=self.colors["danger"], font=("Consolas", 9, "bold"))
        self.debug_log_text.tag_config("warning", foreground=self.colors["warning"])
        self.debug_log_text.tag_config("info", foreground=self.colors["accent"])
        self.debug_log_text.tag_config("success", foreground=self.colors["success"])
        self.debug_log_text.tag_config("timestamp", foreground="#888888")
        
        log_scroll = ttk.Scrollbar(log_frame, orient="vertical", command=self.debug_log_text.yview)
        log_scroll.pack(side="right", fill="y")
        self.debug_log_text.config(yscrollcommand=log_scroll.set)
        
        # Detect and load log file
        self.detect_laravel_log()
        self.refresh_debug_logs()
        
        # Start auto-refresh if enabled
        if self.log_auto_refresh.get():
            self.schedule_log_refresh()
    
    def create_diff_tab(self):
        """Create the Diff Viewer tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Diff Viewer")
        
        # Controls Frame
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        # File/Commit selection
        ttk.Label(controls, text="Compare:").pack(side="left", padx=(0, 5))
        
        self.diff_source = tk.StringVar(value="working")
        source_combo = ttk.Combobox(controls, textvariable=self.diff_source, 
                                   values=["working", "staged", "HEAD~1", "HEAD~2", "HEAD~3"],
                                   width=15, state="readonly")
        source_combo.pack(side="left", padx=5)
        self._bind_dark_combobox(source_combo)
        
        ttk.Label(controls, text="with").pack(side="left", padx=5)
        
        self.diff_target = tk.StringVar(value="HEAD")
        target_combo = ttk.Combobox(controls, textvariable=self.diff_target,
                                   values=["HEAD", "HEAD~1", "HEAD~2", "HEAD~3", "origin/main"],
                                   width=15, state="readonly")
        target_combo.pack(side="left", padx=5)
        self._bind_dark_combobox(target_combo)
        
        ttk.Button(controls, text="🔍 Show Diff", command=self.show_diff,
                  style="Action.TButton").pack(side="left", padx=(10, 5))
        ttk.Button(controls, text="↻ Refresh", command=self.show_diff,
                  style="Secondary.TButton").pack(side="left", padx=5)
        
        # File list
        list_frame = ttk.LabelFrame(tab, text="  Changed Files  ")
        list_frame.pack(fill="x", pady=(0, 10))
        
        self.diff_file_list = tk.Listbox(list_frame, height=6, bg=self.colors["secondary"],
                                        fg="white", font=("Consolas", 9),
                                        selectbackground=self.colors["accent"])
        self.diff_file_list.pack(fill="x", padx=5, pady=5)
        self.diff_file_list.bind('<<ListboxSelect>>', self.on_diff_file_select)
        
        # Diff display
        diff_frame = ttk.LabelFrame(tab, text="  Diff Output  ")
        diff_frame.pack(fill="both", expand=True)
        
        self.diff_text = tk.Text(diff_frame,
            bg=self.colors["text_bg"],
            fg="#d4d4d4",
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="none",
            state="disabled"
        )
        self.diff_text.pack(side="left", fill="both", expand=True)
        
        # Configure color tags for diff
        self.diff_text.tag_config("add", foreground="#4ec9b0", font=("Consolas", 9, "bold"))
        self.diff_text.tag_config("remove", foreground="#f48771", font=("Consolas", 9, "bold"))
        self.diff_text.tag_config("header", foreground="#ce9178", font=("Consolas", 9, "bold"))
        self.diff_text.tag_config("hunk", foreground="#007acc")
        
        diff_scroll = ttk.Scrollbar(diff_frame, orient="vertical", command=self.diff_text.yview)
        diff_scroll.pack(side="right", fill="y")
        self.diff_text.config(yscrollcommand=diff_scroll.set)
        
        # Load initial diff
        self.refresh_diff_files()
    
    def refresh_diff_files(self):
        """Refresh the list of changed files"""
        try:
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ["git", "diff", "--name-only"],
                cwd=self.repo_dir,
                **kwargs
            )
            files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            self.diff_file_list.delete(0, tk.END)
            for f in files:
                if f:
                    self.diff_file_list.insert(tk.END, f)
        except:
            pass
    
    def on_diff_file_select(self, event):
        """Show diff for selected file"""
        selection = self.diff_file_list.curselection()
        if selection:
            file_path = self.diff_file_list.get(selection[0])
            self.show_file_diff(file_path)
    
    def show_diff(self):
        """Show diff between selected commits/branches"""
        source = self.diff_source.get()
        target = self.diff_target.get()
        
        try:
            if source == "working":
                cmd = ["git", "diff", target]
            elif source == "staged":
                cmd = ["git", "diff", "--cached", target]
            else:
                cmd = ["git", "diff", source, target]
            
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                cmd,
                cwd=self.repo_dir,
                **kwargs
            )
            
            self.diff_text.config(state="normal")
            self.diff_text.delete(1.0, tk.END)
            
            lines = result.stdout.split('\n')
            for line in lines:
                if line.startswith('+'):
                    self.diff_text.insert(tk.END, line + '\n', "add")
                elif line.startswith('-'):
                    self.diff_text.insert(tk.END, line + '\n', "remove")
                elif line.startswith('@@'):
                    self.diff_text.insert(tk.END, line + '\n', "hunk")
                elif line.startswith('diff --git') or line.startswith('index ') or line.startswith('---') or line.startswith('+++'):
                    self.diff_text.insert(tk.END, line + '\n', "header")
                else:
                    self.diff_text.insert(tk.END, line + '\n')
            
            self.diff_text.config(state="disabled")
            self.diff_text.see(tk.END)
            self.refresh_diff_files()
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not show diff: {str(e)}")
    
    def show_file_diff(self, file_path):
        """Show diff for specific file"""
        try:
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ["git", "diff", "--", file_path],
                cwd=self.repo_dir,
                **kwargs
            )
            
            self.diff_text.config(state="normal")
            self.diff_text.delete(1.0, tk.END)
            
            lines = result.stdout.split('\n')
            for line in lines:
                if line.startswith('+'):
                    self.diff_text.insert(tk.END, line + '\n', "add")
                elif line.startswith('-'):
                    self.diff_text.insert(tk.END, line + '\n', "remove")
                elif line.startswith('@@'):
                    self.diff_text.insert(tk.END, line + '\n', "hunk")
                elif line.startswith('diff --git') or line.startswith('index ') or line.startswith('---') or line.startswith('+++'):
                    self.diff_text.insert(tk.END, line + '\n', "header")
                else:
                    self.diff_text.insert(tk.END, line + '\n')
            
            self.diff_text.config(state="disabled")
            self.diff_text.see(tk.END)
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not show file diff: {str(e)}")

    def create_merge_tab(self):
        """Create the Merge Conflict Resolver tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Merge Resolver")
        
        # Status Frame
        status_frame = tk.Frame(tab, bg=self.colors["secondary"], bd=1, relief="flat")
        status_frame.pack(fill="x", pady=(0, 10), ipady=5, ipadx=10)
        
        self.merge_status_label = tk.Label(status_frame, text="No merge conflicts detected",
                                         bg=self.colors["secondary"], fg=self.colors["success"],
                                         font=("Segoe UI", 10, "bold"))
        self.merge_status_label.pack(side="left", padx=10)
        
        ttk.Button(status_frame, text="🔍 Scan for Conflicts", command=self.scan_conflicts,
                  style="Secondary.TButton").pack(side="right", padx=5)
        
        # Conflicted Files List
        files_frame = ttk.LabelFrame(tab, text="  Conflicted Files  ")
        files_frame.pack(fill="x", pady=(0, 10))
        
        self.conflict_file_list = tk.Listbox(files_frame, height=5, bg=self.colors["secondary"],
                                            fg="white", font=("Consolas", 9),
                                            selectbackground=self.colors["accent"])
        self.conflict_file_list.pack(fill="x", padx=5, pady=5)
        self.conflict_file_list.bind('<<ListboxSelect>>', self.on_conflict_file_select)
        
        # 3-Way Merge Display
        merge_frame = ttk.LabelFrame(tab, text="  3-Way Merge View  ")
        merge_frame.pack(fill="both", expand=True, pady=(0, 10))
        
        # Create three panes for base, theirs, ours
        panes_frame = ttk.Frame(merge_frame)
        panes_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        # Configure grid
        panes_frame.columnconfigure(0, weight=1)
        panes_frame.columnconfigure(1, weight=1)
        panes_frame.columnconfigure(2, weight=1)
        panes_frame.rowconfigure(1, weight=1)
        
        # Headers
        tk.Label(panes_frame, text="BASE (Common Ancestor)", bg=self.colors["secondary"],
                fg="#888888", font=("Segoe UI", 9, "bold")).grid(row=0, column=0, sticky="ew", padx=2)
        tk.Label(panes_frame, text="THEIRS (Incoming Changes)", bg=self.colors["secondary"],
                fg=self.colors["warning"], font=("Segoe UI", 9, "bold")).grid(row=0, column=1, sticky="ew", padx=2)
        tk.Label(panes_frame, text="OURS (Your Changes)", bg=self.colors["secondary"],
                fg=self.colors["accent"], font=("Segoe UI", 9, "bold")).grid(row=0, column=2, sticky="ew", padx=2)
        
        # Text widgets
        self.base_text = tk.Text(panes_frame, height=10, bg=self.colors["text_bg"],
                                fg="#d4d4d4", font=("Consolas", 8), wrap="none",
                                state="disabled")
        self.base_text.grid(row=1, column=0, sticky="nsew", padx=2)
        
        self.theirs_text = tk.Text(panes_frame, height=10, bg=self.colors["text_bg"],
                                  fg="#d4d4d4", font=("Consolas", 8), wrap="none",
                                  state="disabled")
        self.theirs_text.grid(row=1, column=1, sticky="nsew", padx=2)
        
        self.ours_text = tk.Text(panes_frame, height=10, bg=self.colors["text_bg"],
                                fg="#d4d4d4", font=("Consolas", 8), wrap="none",
                                state="disabled")
        self.ours_text.grid(row=1, column=2, sticky="nsew", padx=2)
        
        # Resolution Buttons
        btn_frame = ttk.Frame(tab)
        btn_frame.pack(fill="x", pady=(0, 10))
        
        ttk.Button(btn_frame, text="✓ Accept Theirs", command=lambda: self.resolve_conflict("theirs"),
                  style="Success.TButton").pack(side="left", padx=5)
        ttk.Button(btn_frame, text="✓ Accept Ours", command=lambda: self.resolve_conflict("ours"),
                  style="Success.TButton").pack(side="left", padx=5)
        ttk.Button(btn_frame, text="✎ Edit Manually", command=self.manual_edit_conflict,
                  style="Secondary.TButton").pack(side="left", padx=5)
        ttk.Button(btn_frame, text="🗑 Mark Resolved", command=self.mark_resolved,
                  style="Action.TButton").pack(side="right", padx=5)
    
    def scan_conflicts(self):
        """Scan for merge conflicts in the repository"""
        try:
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            result = subprocess.run(
                ["git", "diff", "--name-only", "--diff-filter=U"],
                cwd=self.repo_dir,
                **kwargs
            )
            files = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            self.conflict_file_list.delete(0, tk.END)
            for f in files:
                if f:
                    self.conflict_file_list.insert(tk.END, f)
            
            if files and files[0]:
                self.merge_status_label.config(text=f"⚠️ {len(files)} file(s) with conflicts", fg=self.colors["warning"])
            else:
                self.merge_status_label.config(text="✓ No merge conflicts detected", fg=self.colors["success"])
                
        except Exception as e:
            messagebox.showerror("Error", f"Could not scan for conflicts: {str(e)}")
    
    def on_conflict_file_select(self, event):
        """Show 3-way merge view for selected file"""
        selection = self.conflict_file_list.curselection()
        if not selection:
            return
            
        file_path = self.conflict_file_list.get(selection[0])
        full_path = os.path.join(self.repo_dir, file_path)
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            # Parse conflict markers
            base_lines = []
            theirs_lines = []
            ours_lines = []
            
            current_section = None
            for line in content.split('\n'):
                if line.startswith('<<<<<<<'):
                    current_section = 'ours'
                elif line.startswith('======='):
                    current_section = 'theirs'
                elif line.startswith('>>>>>>>'):
                    current_section = None
                else:
                    if current_section == 'ours':
                        ours_lines.append(line)
                    elif current_section == 'theirs':
                        theirs_lines.append(line)
                    else:
                        base_lines.append(line)
                        if not current_section:
                            theirs_lines.append(line)
                            ours_lines.append(line)
            
            # Update text widgets
            self._update_merge_text(self.base_text, '\n'.join(base_lines))
            self._update_merge_text(self.theirs_text, '\n'.join(theirs_lines))
            self._update_merge_text(self.ours_text, '\n'.join(ours_lines))
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not load conflict file: {str(e)}")
    
    def _update_merge_text(self, text_widget, content):
        """Helper to update merge text widget"""
        text_widget.config(state="normal")
        text_widget.delete(1.0, tk.END)
        text_widget.insert(1.0, content)
        text_widget.config(state="disabled")
    
    def resolve_conflict(self, side):
        """Resolve conflict by accepting one side"""
        selection = self.conflict_file_list.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to resolve")
            return
        
        file_path = self.conflict_file_list.get(selection[0])
        full_path = os.path.join(self.repo_dir, file_path)
        
        try:
            with open(full_path, 'r', encoding='utf-8', errors='replace') as f:
                content = f.read()
            
            # Remove conflict markers, keep selected side
            resolved_lines = []
            in_conflict = False
            keep_theirs = False
            
            for line in content.split('\n'):
                if line.startswith('<<<<<<<'):
                    in_conflict = True
                    keep_theirs = (side == 'ours')  # If accepting ours, skip theirs section
                elif line.startswith('======='):
                    keep_theirs = (side == 'theirs')  # If accepting theirs, keep theirs section
                elif line.startswith('>>>>>>>'):
                    in_conflict = False
                    keep_theirs = False
                else:
                    if not in_conflict or (in_conflict and keep_theirs):
                        resolved_lines.append(line)
            
            with open(full_path, 'w', encoding='utf-8') as f:
                f.write('\n'.join(resolved_lines))
            
            messagebox.showinfo("Success", f"Conflict resolved with {side} version")
            self.scan_conflicts()
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not resolve conflict: {str(e)}")
    
    def manual_edit_conflict(self):
        """Open file for manual editing"""
        selection = self.conflict_file_list.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to edit")
            return
        
        file_path = self.conflict_file_list.get(selection[0])
        full_path = os.path.join(self.repo_dir, file_path)
        
        try:
            os.startfile(full_path)
        except Exception as e:
            messagebox.showerror("Error", f"Could not open file: {str(e)}")
    
    def mark_resolved(self):
        """Mark file as resolved and stage it"""
        selection = self.conflict_file_list.curselection()
        if not selection:
            messagebox.showwarning("Warning", "Please select a file to mark as resolved")
            return
        
        file_path = self.conflict_file_list.get(selection[0])
        
        try:
            kwargs = {}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            subprocess.run(
                ["git", "add", file_path],
                cwd=self.repo_dir,
                check=True,
                **kwargs
            )
            messagebox.showinfo("Success", f"{file_path} marked as resolved and staged")
            self.scan_conflicts()
        except Exception as e:
            messagebox.showerror("Error", f"Could not mark as resolved: {str(e)}")

    def create_rebase_tab(self):
        """Create the Interactive Rebase tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Rebase")
        
        # Controls Frame
        controls = ttk.Frame(tab)
        controls.pack(fill="x", pady=(0, 10))
        
        # Base commit selection
        ttk.Label(controls, text="Rebase from:").pack(side="left", padx=(0, 5))
        
        self.rebase_base = tk.StringVar(value="HEAD~5")
        base_combo = ttk.Combobox(controls, textvariable=self.rebase_base,
                                 values=["HEAD~3", "HEAD~5", "HEAD~10", "HEAD~20", "origin/main"],
                                 width=15, state="readonly")
        base_combo.pack(side="left", padx=5)
        self._bind_dark_combobox(base_combo)
        
        ttk.Button(controls, text="🔄 Load Commits", command=self.load_rebase_commits,
                  style="Secondary.TButton").pack(side="left", padx=(10, 5))
        
        # Action Buttons
        action_frame = ttk.Frame(tab)
        action_frame.pack(fill="x", pady=(0, 10))
        
        ttk.Button(action_frame, text="🔀 Start Rebase", command=self.start_interactive_rebase,
                  style="Action.TButton").pack(side="left", padx=5)
        ttk.Button(action_frame, text="⏹ Abort Rebase", command=self.abort_rebase,
                  style="Danger.TButton").pack(side="left", padx=5)
        ttk.Button(action_frame, text="✓ Continue", command=self.continue_rebase,
                  style="Success.TButton").pack(side="left", padx=5)
        
        # Commits List with Checkboxes
        commits_frame = ttk.LabelFrame(tab, text="  Commits to Rebase  ")
        commits_frame.pack(fill="both", expand=True)
        
        # Create a canvas with scrollbar for commits
        canvas_frame = ttk.Frame(commits_frame)
        canvas_frame.pack(fill="both", expand=True, padx=5, pady=5)
        
        self.rebase_canvas = tk.Canvas(canvas_frame, bg=self.colors["bg"], highlightthickness=0)
        scrollbar = ttk.Scrollbar(canvas_frame, orient="vertical", command=self.rebase_canvas.yview)
        
        self.rebase_canvas.pack(side="left", fill="both", expand=True)
        scrollbar.pack(side="right", fill="y")
        
        self.rebase_canvas.configure(yscrollcommand=scrollbar.set)
        
        # Frame inside canvas for commits
        self.rebase_commits_frame = ttk.Frame(self.rebase_canvas)
        self.rebase_canvas.create_window((0, 0), window=self.rebase_commits_frame, anchor="nw", width=800)
        
        self.rebase_commits_frame.bind("<Configure>", lambda e: self.rebase_canvas.configure(scrollregion=self.rebase_canvas.bbox("all")))
        
        # Store commit data
        self.rebase_commits = []
        self.rebase_checkboxes = []
    
    def load_rebase_commits(self):
        """Load commits for interactive rebase"""
        base = self.rebase_base.get()
        
        try:
            # Get commits since base
            result = subprocess.run(
                ["git", "log", "--oneline", "--reverse", f"{base}..HEAD"],
                cwd=self.repo_dir,
                capture_output=True,
                text=True
            )
            
            # Clear existing
            for widget in self.rebase_commits_frame.winfo_children():
                widget.destroy()
            self.rebase_commits = []
            self.rebase_checkboxes = []
            
            lines = result.stdout.strip().split('\n') if result.stdout.strip() else []
            
            for line in lines:
                if not line:
                    continue
                    
                parts = line.split(' ', 1)
                if len(parts) < 2:
                    continue
                    
                commit_hash = parts[0]
                commit_msg = parts[1]
                
                # Create row for each commit
                row = ttk.Frame(self.rebase_commits_frame)
                row.pack(fill="x", pady=2)
                
                # Checkbox for selection
                selected = tk.BooleanVar(value=True)
                cb = ttk.Checkbutton(row, variable=selected)
                cb.pack(side="left", padx=5)
                self.rebase_checkboxes.append(selected)
                
                # Action dropdown
                action = tk.StringVar(value="pick")
                action_combo = ttk.Combobox(row, textvariable=action,
                                          values=["pick", "reword", "edit", "squash", "fixup", "drop"],
                                          width=10, state="readonly")
                action_combo.pack(side="left", padx=5)
                self._bind_dark_combobox(action_combo)
                
                # Commit hash
                ttk.Label(row, text=commit_hash[:7], font=("Consolas", 9), 
                         foreground="#888888").pack(side="left", padx=5)
                
                # Commit message
                ttk.Label(row, text=commit_msg, font=("Segoe UI", 9)).pack(side="left", padx=5)
                
                self.rebase_commits.append({
                    'hash': commit_hash,
                    'message': commit_msg,
                    'action': action,
                    'selected': selected
                })
            
            if not lines:
                ttk.Label(self.rebase_commits_frame, text="No commits to rebase", 
                         font=("Segoe UI", 10, "italic")).pack(pady=20)
            
        except Exception as e:
            messagebox.showerror("Error", f"Could not load commits: {str(e)}")
    
    def start_interactive_rebase(self):
        """Start interactive rebase with selected actions"""
        if not self.rebase_commits:
            messagebox.showwarning("Warning", "No commits loaded. Click 'Load Commits' first.")
            return
        
        try:
            # Create todo file for git rebase
            todo_lines = []
            for commit in self.rebase_commits:
                if commit['selected'].get():
                    action = commit['action'].get()
                    todo_lines.append(f"{action} {commit['hash']} {commit['message']}")
            
            if not todo_lines:
                messagebox.showwarning("Warning", "No commits selected for rebase")
                return
            
            # Write git-rebase-todo file
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            git_dir = subprocess.run(
                ["git", "rev-parse", "--git-dir"],
                cwd=self.repo_dir,
                **kwargs
            ).stdout.strip()
            
            todo_path = os.path.join(git_dir, "rebase-merge", "git-rebase-todo")
            os.makedirs(os.path.dirname(todo_path), exist_ok=True)
            
            with open(todo_path, 'w') as f:
                f.write('\n'.join(todo_lines))
            
            # Start rebase
            subprocess.run(
                ["git", "rebase", "-i", self.rebase_base.get()],
                cwd=self.repo_dir,
                check=True,
                **kwargs
            )
            
            messagebox.showinfo("Success", "Interactive rebase started successfully")
            self.load_rebase_commits()  # Refresh list
            
        except Exception as e:
            messagebox.showerror("Error", f"Rebase failed: {str(e)}")
    
    def abort_rebase(self):
        """Abort ongoing rebase"""
        try:
            kwargs = {}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            subprocess.run(
                ["git", "rebase", "--abort"],
                cwd=self.repo_dir,
                check=True,
                **kwargs
            )
            messagebox.showinfo("Success", "Rebase aborted")
            self.load_rebase_commits()
        except Exception as e:
            messagebox.showerror("Error", f"Could not abort rebase: {str(e)}")
    
    def continue_rebase(self):
        """Continue rebase after resolving conflicts"""
        try:
            kwargs = {}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            subprocess.run(
                ["git", "rebase", "--continue"],
                cwd=self.repo_dir,
                check=True,
                **kwargs
            )
            messagebox.showinfo("Success", "Rebase continued")
            self.load_rebase_commits()
        except Exception as e:
            messagebox.showerror("Error", f"Could not continue rebase: {str(e)}")
    
    def detect_laravel_log(self):
        """Detect Laravel log file in the repository"""
        possible_paths = [
            os.path.join(self.repo_dir, "storage", "logs", "laravel.log"),
            os.path.join(self.repo_dir, "storage", "logs", "laravel-" + self.get_today_date() + ".log"),
        ]
        
        for path in possible_paths:
            if os.path.exists(path):
                self.log_file_path = path
                self.log_info_label.config(
                    text=f"📄 {os.path.basename(path)}",
                    fg=self.colors["success"]
                )
                return
        
        # Check entire logs directory
        logs_dir = os.path.join(self.repo_dir, "storage", "logs")
        if os.path.exists(logs_dir):
            log_files = [f for f in os.listdir(logs_dir) if f.endswith('.log')]
            if log_files:
                # Use the most recent log file
                log_files.sort(key=lambda x: os.path.getmtime(os.path.join(logs_dir, x)), reverse=True)
                self.log_file_path = os.path.join(logs_dir, log_files[0])
                self.log_info_label.config(
                    text=f"📄 {log_files[0]}",
                    fg=self.colors["success"]
                )
                return
        
        self.log_file_path = None
        self.log_info_label.config(
            text="⚠️ No Laravel log file found",
            fg=self.colors["warning"]
        )
    
    def get_today_date(self):
        """Get today's date in YYYY-MM-DD format"""
        from datetime import datetime
        return datetime.now().strftime("%Y-%m-%d")
    
    def refresh_debug_logs(self):
        """Refresh and display Laravel logs"""
        if not self.log_file_path or not os.path.exists(self.log_file_path):
            self.detect_laravel_log()
            if not self.log_file_path:
                self.debug_log_text.config(state="normal")
                self.debug_log_text.delete(1.0, tk.END)
                self.debug_log_text.insert(tk.END, "No Laravel log file found.\n\n", "warning")
                self.debug_log_text.insert(tk.END, "Expected location: storage/logs/laravel.log\n", "info")
                self.debug_log_text.config(state="disabled")
                return
        
        try:
            with open(self.log_file_path, 'r', encoding='utf-8', errors='replace') as f:
                # Read entire file for now (can optimize to read only new lines later)
                content = f.read()
            
            # Parse and display logs
            self.display_parsed_logs(content)
            
        except Exception as e:
            self.debug_log_text.config(state="normal")
            self.debug_log_text.delete(1.0, tk.END)
            self.debug_log_text.insert(tk.END, f"Error reading log file: {str(e)}\n", "error")
            self.debug_log_text.config(state="disabled")
    
    def display_parsed_logs(self, content):
        """Parse and display log content with highlighting"""
        self.debug_log_text.config(state="normal")
        self.debug_log_text.delete(1.0, tk.END)
        
        # Count errors by level
        error_count = content.count(".ERROR:")
        warning_count = content.count(".WARNING:")
        info_count = content.count(".INFO:")
        
        # Update summary
        self.error_count_label.config(
            text=f"Errors: {error_count} | Warnings: {warning_count} | Info: {info_count}"
        )
        
        # Split into lines and process
        lines = content.split('\n')
        
        # Show only last 500 lines to avoid performance issues
        if len(lines) > 500:
            self.debug_log_text.insert(tk.END, 
                f"... (showing last 500 of {len(lines)} lines) ...\n\n", "info")
            lines = lines[-500:]
        
        # Process each line
        for line in lines:
            if not line.strip():
                self.debug_log_text.insert(tk.END, "\n")
                continue
            
            # Detect log level and apply formatting
            if ".ERROR:" in line or "Exception:" in line or "Error:" in line:
                self.debug_log_text.insert(tk.END, line + "\n", "error")
            elif ".WARNING:" in line:
                self.debug_log_text.insert(tk.END, line + "\n", "warning")
            elif ".INFO:" in line:
                self.debug_log_text.insert(tk.END, line + "\n", "info")
            elif line.startswith("["):
                # Timestamp line
                self.debug_log_text.insert(tk.END, line + "\n", "timestamp")
            else:
                # Stack trace or additional info
                self.debug_log_text.insert(tk.END, line + "\n")
        
        # Auto-scroll to bottom to show latest logs
        self.debug_log_text.see(tk.END)
        self.debug_log_text.config(state="disabled")
    
    def toggle_log_refresh(self):
        """Toggle auto-refresh of logs"""
        if self.log_auto_refresh.get():
            self.schedule_log_refresh()
        else:
            if self.log_refresh_timer:
                self.root.after_cancel(self.log_refresh_timer)
                self.log_refresh_timer = None
    
    def schedule_log_refresh(self):
        """Schedule next log refresh"""
        if self.log_auto_refresh.get():
            self.refresh_debug_logs()
            # Refresh every 2 seconds
            self.log_refresh_timer = self.root.after(2000, self.schedule_log_refresh)
    
    def clear_debug_display(self):
        """Clear debug log display"""
        self.debug_log_text.config(state="normal")
        self.debug_log_text.delete(1.0, tk.END)
        self.debug_log_text.insert(tk.END, "Debug display cleared.\n\n", "info")
        self.debug_log_text.config(state="disabled")
    
    def open_log_file(self):
        """Open log file in default text editor"""
        if self.log_file_path and os.path.exists(self.log_file_path):
            try:
                os.startfile(self.log_file_path)
            except Exception as e:
                messagebox.showerror("Error", f"Could not open log file: {str(e)}")
        else:
            messagebox.showwarning("Warning", "No log file found to open.")

    def configure_git_author(self):
        """Configure Git author name and email"""
        # Check if dialog already exists and lift it to front
        if hasattr(self, '_author_dialog') and self._author_dialog.winfo_exists():
            self._author_dialog.lift()
            self._author_dialog.focus_force()
            return
        
        dialog = tk.Toplevel(self.root)
        self._author_dialog = dialog
        dialog.title("Configure Git Author")
        dialog.geometry("450x300")
        dialog.configure(bg=self.colors["bg"])
        dialog.transient(self.root)
        # Removed grab_set() to allow window management
        
        # Ensure dialog stays on top and handles minimize properly
        dialog.protocol("WM_DELETE_WINDOW", lambda: dialog.destroy())
        
        # Center dialog
        self.center_window(dialog, 450, 300)
        
        # Header
        tk.Label(dialog, text="Git Author Configuration", 
                font=("Segoe UI", 14, "bold"),
                bg=self.colors["bg"], fg=self.colors["accent"]).pack(pady=(15, 20))
        
        # Get current values
        try:
            kwargs = {'capture_output': True, 'text': True}
            if sys.platform == 'win32':
                kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
            
            current_name = subprocess.run(["git", "config", "user.name"], 
                                          **kwargs).stdout.strip()
            current_email = subprocess.run(["git", "config", "user.email"], 
                                           **kwargs).stdout.strip()
        except:
            current_name = ""
            current_email = ""
        
        # Author name input
        tk.Label(dialog, text="Author Name:", font=("Segoe UI", 10, "bold"),
                bg=self.colors["bg"], fg="white").pack(pady=(10, 5), padx=20, anchor="w")
        
        name_entry = tk.Entry(dialog, 
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 10)
        )
        name_entry.pack(fill="x", padx=20, pady=5, ipady=5)
        name_entry.insert(0, current_name)
        
        # Email input
        tk.Label(dialog, text="Email:", font=("Segoe UI", 10, "bold"),
                bg=self.colors["bg"], fg="white").pack(pady=(10, 5), padx=20, anchor="w")
        
        email_entry = tk.Entry(dialog, 
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            font=("Consolas", 10)
        )
        email_entry.pack(fill="x", padx=20, pady=5, ipady=5)
        email_entry.insert(0, current_email)
        
        # Buttons frame
        btn_frame = tk.Frame(dialog, bg=self.colors["bg"])
        btn_frame.pack(pady=20)
        
        def save_config():
            name = name_entry.get().strip()
            email = email_entry.get().strip()
            
            if not name or not email:
                messagebox.showwarning("Warning", "Please enter both name and email.")
                return
            
            try:
                # Set git config
                kwargs = {'check': True, 'capture_output': True}
                if sys.platform == 'win32':
                    kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
                
                subprocess.run(["git", "config", "--global", "user.name", name], 
                             **kwargs)
                subprocess.run(["git", "config", "--global", "user.email", email], 
                             **kwargs)
                
                messagebox.showinfo("Success", f"Git author configured:\n{name} <{email}>")
                dialog.destroy()
            except subprocess.CalledProcessError as e:
                messagebox.showerror("Error", f"Failed to configure git: {e.stderr}")
        
        ttk.Button(btn_frame, text="Save", command=save_config, 
                  style="Success.TButton").pack(side="left", padx=5)
        ttk.Button(btn_frame, text="Cancel", command=dialog.destroy,
                  style="Secondary.TButton").pack(side="left", padx=5)

    # ===== Database Import Operations =====
    
    def toggle_port_field(self):
        """Enable/disable port entry based on checkbox"""
        if self.db_use_custom_port.get():
            self.port_entry.config(state="normal")
        else:
            self.port_entry.config(state="disabled")
    
    def load_db_config(self):
        """Load database configuration from file"""
        try:
            if os.path.exists(self.db_config_file):
                with open(self.db_config_file, 'r') as f:
                    config = json.load(f)
                    self.db_type.set(config.get('db_type', 'MySQL/MariaDB'))
                    self.db_host.set(config.get('host', '127.0.0.1'))
                    self.db_port.set(config.get('port', '3306'))
                    self.db_use_custom_port.set(config.get('use_custom_port', False))
                    self.db_user.set(config.get('user', 'root'))
                    self.db_password.set(config.get('password', ''))
                    self.sqlite_db_path.set(config.get('sqlite_db_path', ''))
                    self.sqlserver_driver.set(config.get('sqlserver_driver', 'ODBC Driver 17 for SQL Server'))
        except:
            pass
    
    def save_db_config(self):
        """Save database configuration to file"""
        try:
            config = {
                'db_type': self.db_type.get(),
                'host': self.db_host.get(),
                'port': self.db_port.get(),
                'use_custom_port': self.db_use_custom_port.get(),
                'user': self.db_user.get(),
                'password': self.db_password.get(),
                'mysql_exe': self.mysql_exe,
                'sqlite_db_path': self.sqlite_db_path.get(),
                'sqlserver_driver': self.sqlserver_driver.get()
            }
            with open(self.db_config_file, 'w') as f:
                json.dump(config, f)
            self.append_db_output("✓ Database configuration saved", "success")
        except Exception as e:
            self.append_db_output(f"Failed to save config: {e}", "error")

    def browse_mysql_exe(self):
        file_path = filedialog.askopenfilename(
            title="Select mysql.exe",
            filetypes=[("MySQL Client", "mysql.exe"), ("Executable", "*.exe"), ("All Files", "*.*")]
        )
        if file_path:
            self.mysql_exe = file_path
            if hasattr(self, 'mysql_exe_label'):
                self.mysql_exe_label.config(text=file_path)
            self.append_db_output(f"✓ mysql.exe set to: {file_path}", "success")

    def browse_sqlite_db(self):
        file_path = filedialog.askopenfilename(
            title="Select SQLite database (.db)",
            filetypes=[("SQLite Database", "*.db"), ("SQLite", "*.sqlite"), ("All Files", "*.*")]
        )
        if file_path:
            self.sqlite_db_path.set(file_path)
            if hasattr(self, 'sqlite_db_label'):
                self.sqlite_db_label.config(text=file_path)
            self.append_db_output(f"✓ SQLite DB set to: {file_path}", "success")

    def test_mysql_connection(self):
        """Test MySQL connection with current settings"""
        if self.db_type.get() == "SQLite":
            result = self.db_adapter.test_connection() if self.db_adapter else "Error: SQLite adapter not ready"
            if result == "OK":
                self.append_db_output("✅ Connection successful!", "success")
                self.db_status_label.config(text="● Connection: OK", fg=self.colors["success"])
            else:
                self.append_db_output(f"❌ Connection failed: {result}", "error")
                self.db_status_label.config(text="● Connection: Failed", fg=self.colors["danger"])
            return

        if self.db_type.get() == "PostgreSQL":
            status, detail = self.db_adapter.test_connection() if self.db_adapter else ("Error", "PostgreSQL adapter not ready")
            if status == "OK":
                self.append_db_output("✅ Connection successful!", "success")
                self.append_db_output(f"   {detail}", "info")
                self.db_status_label.config(text="● Connection: OK", fg=self.colors["success"])
            else:
                self.append_db_output(f"❌ Connection failed: {detail}", "error")
                self.db_status_label.config(text="● Connection: Failed", fg=self.colors["danger"])
            return

        if self.db_type.get() == "SQL Server":
            status, detail = self.db_adapter.test_connection() if self.db_adapter else ("Error", "SQL Server adapter not ready")
            if status == "OK":
                self.append_db_output("✅ Connection successful!", "success")
                self.append_db_output(f"   {detail}", "info")
                self.db_status_label.config(text="● Connection: OK", fg=self.colors["success"])
            else:
                self.append_db_output(f"❌ Connection failed: {detail}", "error")
                self.db_status_label.config(text="● Connection: Failed", fg=self.colors["danger"])
            return

        if not self._ensure_mysql_db_selected():
            return
        def do_test():
            self.append_db_output("\n🔗 Testing MySQL connection...", "info")

            mysql_client = self._get_mysql_client()
            if not mysql_client:
                self.append_db_output(f"❌ {self._mysql_not_found_message()}", "error")
                self.db_status_label.config(text="● Connection: MySQL client missing", fg=self.colors["danger"])
                return
            
            # Build connection info string
            port_str = f":{self.db_port.get()}" if self.db_use_custom_port.get() else ""
            conn_info = f"{self.db_user.get()}@{self.db_host.get()}{port_str}"
            
            # Test with timeout
            mysql_args = [mysql_client, "-h", self.db_host.get(), "-u", self.db_user.get()]
            
            if self.db_use_custom_port.get():
                port = self.db_port.get()
                if port and port != "3306":
                    mysql_args.extend(["-P", port])
            
            if self.db_password.get():
                mysql_args.extend(["-p" + self.db_password.get()])
            
            mysql_args.extend(["-e", "SELECT 'Connected' as status, VERSION() as version;"])
            
            try:
                kwargs = {'capture_output': True, 'text': True, 'timeout': 10}
                if sys.platform == 'win32':
                    kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
                
                result = subprocess.run(mysql_args, **kwargs)
                
                if result.returncode == 0:
                    lines = result.stdout.strip().split('\n')
                    version = lines[-1] if len(lines) > 1 else "Unknown"
                    self.append_db_output(f"✅ Connection successful!", "success")
                    self.append_db_output(f"   Server: {version}", "info")
                    self.append_db_output(f"   Connection: {conn_info}", "info")
                    self.db_status_label.config(text="● Connection: OK", fg=self.colors["success"])
                else:
                    error = result.stderr.strip() if result.stderr else "Unknown error"
                    self.append_db_output(f"❌ Connection failed: {error}", "error")
                    self.db_status_label.config(text="● Connection: Failed", fg=self.colors["danger"])
                    
            except FileNotFoundError:
                self.append_db_output(f"❌ {self._mysql_not_found_message()}", "error")
                self.db_status_label.config(text="● Connection: MySQL client missing", fg=self.colors["danger"])
            except subprocess.TimeoutExpired:
                self.append_db_output("⏱️ Connection timeout (10s) - Server not responding", "error")
                self.db_status_label.config(text="● Connection: Timeout", fg=self.colors["warning"])
            except Exception as e:
                self.append_db_output(f"❌ Connection error: {str(e)}", "error")
                self.db_status_label.config(text="● Connection: Error", fg=self.colors["danger"])
        
        threading.Thread(target=do_test, daemon=True).start()

    def create_database_tab(self):
        """Create the Database Import tab"""
        tab = ttk.Frame(self.notebook, padding=10)
        self.notebook.add(tab, text="Database")
        
        # Connection Configuration Frame
        conn_frame = ttk.LabelFrame(tab, text="  MySQL Connection  ")
        conn_frame.pack(fill="x", pady=(0, 10))

        self.conn_frame_title_label = conn_frame
        
        # Host and User row
        row1 = ttk.Frame(conn_frame, padding=10)
        row1.pack(fill="x")

        ttk.Label(row1, text="DB Type:").pack(side="left", padx=(0, 5))
        db_type_cb = ttk.Combobox(
            row1,
            textvariable=self.db_type,
            values=["MySQL/MariaDB", "PostgreSQL", "SQL Server", "SQLite"],
            state="readonly",
            width=18,
        )
        db_type_cb.pack(side="left", padx=(0, 10))
        self._bind_dark_combobox(db_type_cb)
        
        ttk.Label(row1, text="Host:").pack(side="left", padx=(0, 5))
        host_entry = tk.Entry(row1, textvariable=self.db_host, 
                              bg=self.colors["secondary"], fg="white",
                              insertbackground="white", relief="flat", width=20)
        host_entry.pack(side="left", padx=(0, 15))
        
        ttk.Label(row1, text="User:").pack(side="left", padx=(0, 5))
        user_entry = tk.Entry(row1, textvariable=self.db_user,
                              bg=self.colors["secondary"], fg="white",
                              insertbackground="white", relief="flat", width=15)
        user_entry.pack(side="left", padx=(0, 15))
        
        ttk.Label(row1, text="Password:").pack(side="left", padx=(0, 5))
        pass_entry = tk.Entry(row1, textvariable=self.db_password, show="•",
                              bg=self.colors["secondary"], fg="white",
                              insertbackground="white", relief="flat", width=15)
        pass_entry.pack(side="left", padx=(0, 5))
        
        # Custom Port Toggle
        tk.Checkbutton(
            row1,
            text="Custom Port",
            variable=self.db_use_custom_port,
            command=self.toggle_port_field,
            bg=self.colors["bg"],
            fg=self.colors["fg"],
            activebackground=self.colors["bg"],
            activeforeground=self.colors["fg"],
            selectcolor=self.colors["bg"],
            highlightthickness=0,
            bd=0,
        ).pack(side="left", padx=(20, 5))
        
        self.port_entry = tk.Entry(row1, textvariable=self.db_port,
                                   bg=self.colors["secondary"], fg="white",
                                   insertbackground="white", relief="flat", width=6)
        self.port_entry.pack(side="left", padx=(0, 5))
        self.port_entry.config(state="disabled")  # Disabled by default
        
        ttk.Button(row1, text="💾 Save Config", command=self.save_db_config,
                  style="Secondary.TButton").pack(side="right", padx=5)
        ttk.Button(row1, text="🔗 Test Connection", command=self.test_mysql_connection,
                  style="Success.TButton").pack(side="right", padx=5)

        row2 = ttk.Frame(conn_frame, padding=(10, 0, 10, 10))
        row2.pack(fill="x")

        ttk.Label(row2, text="mysql.exe:").pack(side="left", padx=(0, 5))
        self.mysql_exe_label = ttk.Label(row2, text=self.mysql_exe or "(auto-detect)")
        self.mysql_exe_label.pack(side="left", fill="x", expand=True, padx=(0, 10))
        ttk.Button(row2, text="📂 Browse mysql.exe", command=self.browse_mysql_exe,
                  style="Secondary.TButton").pack(side="right")

        sqlite_row = ttk.Frame(conn_frame, padding=(10, 0, 10, 10))
        sqlite_row.pack(fill="x")
        ttk.Label(sqlite_row, text="SQLite .db:").pack(side="left", padx=(0, 5))
        self.sqlite_db_label = ttk.Label(sqlite_row, text=self.sqlite_db_path.get() or "(not set)")
        self.sqlite_db_label.pack(side="left", fill="x", expand=True, padx=(0, 10))
        ttk.Button(sqlite_row, text="📂 Browse SQLite DB", command=self.browse_sqlite_db,
                  style="Secondary.TButton").pack(side="right")

        sqlsrv_row = ttk.Frame(conn_frame, padding=(10, 0, 10, 10))
        sqlsrv_row.pack(fill="x")
        ttk.Label(sqlsrv_row, text="SQL Server Driver:").pack(side="left", padx=(0, 5))
        tk.Entry(sqlsrv_row, textvariable=self.sqlserver_driver,
                 bg=self.colors["secondary"], fg="white",
                 insertbackground="white", relief="flat").pack(side="left", fill="x", expand=True, padx=(0, 10))
        
        # Database Selection Frame
        db_frame = ttk.LabelFrame(tab, text="  Target Database  ")
        db_frame.pack(fill="x", pady=(0, 10))
        
        db_row = ttk.Frame(db_frame, padding=10)
        db_row.pack(fill="x")
        
        ttk.Label(db_row, text="Database:").pack(side="left", padx=(0, 5))
        self.db_dropdown = ttk.Combobox(
            db_row,
            textvariable=self.db_name,
            values=[],
            width=25,
            state="normal",
        )
        self.db_dropdown.pack(side="left", padx=(0, 10))
        self._bind_dark_combobox(self.db_dropdown)

        ttk.Label(db_row, text="New DB:").pack(side="left", padx=(10, 5))
        tk.Entry(
            db_row,
            textvariable=self.db_new_name,
            bg=self.colors["secondary"],
            fg="white",
            insertbackground="white",
            relief="flat",
            width=18,
        ).pack(side="left", padx=(0, 10))

        ttk.Button(db_row, text="🔄 Refresh List", command=self.refresh_mysql_databases,
                  style="Secondary.TButton").pack(side="left", padx=5)
        ttk.Button(db_row, text="➕ Create DB", command=self.create_database_action,
                  style="Success.TButton").pack(side="left", padx=5)
        ttk.Button(db_row, text="🗑 Drop DB", command=self.drop_database_action,
                  style="Danger.TButton").pack(side="left", padx=5)
        ttk.Button(db_row, text="📊 View Status", command=self.view_database_status,
                  style="Action.TButton").pack(side="left", padx=5)
        ttk.Button(db_row, text="🧱 Create Table", command=self.open_create_table_wizard,
                  style="Action.TButton").pack(side="left", padx=5)

        file_frame = ttk.LabelFrame(tab, text="  SQL File  ")
        file_frame.pack(fill="x", pady=(0, 10))
        
        file_row = ttk.Frame(file_frame, padding=10)
        file_row.pack(fill="x")
        
        self.sql_file_entry = tk.Entry(file_row, textvariable=self.sql_file_path,
                                       bg=self.colors["secondary"], fg="white",
                                       insertbackground="white", relief="flat")
        self.sql_file_entry.pack(side="left", fill="x", expand=True, padx=(0, 10))
        
        ttk.Button(file_row, text="📂 Browse SQL", command=self.browse_sql_file,
                  style="Secondary.TButton").pack(side="right", padx=5)
        
        # Action Buttons Frame
        action_frame = tk.Frame(tab, bg=self.colors["secondary"], bd=1, relief="flat")
        action_frame.pack(fill="x", pady=(0, 10), ipady=5, ipadx=10)
        
        self.db_status_label = tk.Label(action_frame, text="● Database System: Ready",
                                       bg=self.colors["secondary"], fg=self.colors["success"],
                                       font=("Segoe UI", 10, "bold"))
        self.db_status_label.pack(side="left", padx=10)
        
        # Import Actions
        import_frame = ttk.LabelFrame(tab, text="  Import Operations  ")
        import_frame.pack(fill="x", pady=(0, 10))
        
        import_row = ttk.Frame(import_frame, padding=10)
        import_row.pack(fill="x")
        
        ttk.Button(import_row, text="📥 Full Import", command=self.full_database_import,
                  style="Action.TButton").pack(side="left", expand=True, fill="x", padx=5)
        ttk.Button(import_row, text="🎯 Selective Restore", command=self.selective_restore_table,
                  style="Success.TButton").pack(side="left", expand=True, fill="x", padx=5)
        ttk.Button(import_row, text="📤 Export to TXT", command=self.export_database_to_txt,
                  style="Secondary.TButton").pack(side="left", expand=True, fill="x", padx=5)
        
        # Progress and Output
        output_frame = ttk.LabelFrame(tab, text="  Operation Output  ")
        output_frame.pack(fill="both", expand=True)
        
        self.db_output_text = tk.Text(output_frame,
            bg=self.colors["text_bg"],
            fg="#d4d4d4",
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="word",
            state="disabled"
        )
        self.db_output_text.pack(side="left", fill="both", expand=True)
        
        # Configure color tags
        self.db_output_text.tag_config("error", foreground=self.colors["danger"])
        self.db_output_text.tag_config("success", foreground=self.colors["success"])
        self.db_output_text.tag_config("warning", foreground=self.colors["warning"])
        self.db_output_text.tag_config("info", foreground=self.colors["accent"])
        
        output_scroll = ttk.Scrollbar(output_frame, orient="vertical", command=self.db_output_text.yview)
        output_scroll.pack(side="right", fill="y")
        self.db_output_text.config(yscrollcommand=output_scroll.set)

        console_frame = ttk.LabelFrame(tab, text="  SQL / DDL Console  ")
        console_frame.pack(fill="x", pady=(10, 0))

        console_toolbar = ttk.Frame(console_frame, padding=(10, 10, 10, 0))
        console_toolbar.pack(fill="x")

        ttk.Button(console_toolbar, text="▶ Run SQL", command=self.execute_sql_console,
                  style="Success.TButton").pack(side="left", padx=(0, 8))
        ttk.Button(console_toolbar, text="🧹 Clear", command=self.clear_sql_console,
                  style="Secondary.TButton").pack(side="left")

        console_body = ttk.Frame(console_frame, padding=10)
        console_body.pack(fill="x")

        self.sql_console_text = tk.Text(
            console_body,
            height=6,
            bg=self.colors["text_bg"],
            fg="#d4d4d4",
            insertbackground="#ffffff",
            font=("Consolas", 9),
            bd=0,
            padx=10,
            pady=10,
            wrap="word",
        )
        self.sql_console_text.pack(side="left", fill="x", expand=True)

        console_scroll = ttk.Scrollbar(console_body, orient="vertical", command=self.sql_console_text.yview)
        console_scroll.pack(side="right", fill="y")
        self.sql_console_text.config(yscrollcommand=console_scroll.set)
    
    def browse_sql_file(self):
        """Browse for SQL file to import"""
        file_path = filedialog.askopenfilename(
            initialdir=self.repo_dir,
            title="Select SQL Dump File",
            filetypes=[("SQL Files", "*.sql"), ("All Files", "*.*")]
        )
        if file_path:
            self.sql_file_path.set(file_path)

    def clear_sql_console(self):
        if not hasattr(self, 'sql_console_text'):
            return
        self.sql_console_text.delete("1.0", "end")

    def execute_sql_console(self):
        if not hasattr(self, 'sql_console_text'):
            return

        sql_text = self.sql_console_text.get("1.0", "end").strip()
        if not sql_text:
            self.append_db_output("Error: SQL is empty.", "error")
            return

        adapter = self.db_adapter
        if not adapter:
            self.append_db_output("Error: DB adapter not ready", "error")
            return

        db = (self.db_name.get() or "").strip() or None
        if self.db_type.get() == "PostgreSQL" and not db:
            db = "postgres"
        if self.db_type.get() == "SQL Server" and not db:
            db = "master"

        def do_run():
            try:
                self.root.after(0, lambda: self.append_db_output("\n▶ Running SQL...", "info"))
                result = adapter.run_sql(sql_text, database=db, timeout=30)
                if isinstance(result, str) and result.startswith("Error"):
                    self.root.after(0, lambda: self.append_db_output(result, "error"))
                else:
                    out = result if isinstance(result, str) and result.strip() else "OK"
                    self.root.after(0, lambda: self.append_db_output(out, "success"))
            except Exception as e:
                self.root.after(0, lambda: self.append_db_output(f"Error: {e}", "error"))

        threading.Thread(target=do_run, daemon=True).start()

    def create_database_action(self):
        adapter = self.db_adapter
        if not adapter:
            self.append_db_output("Error: DB adapter not ready", "error")
            return

        name = (self.db_new_name.get() or "").strip()
        if not name:
            self.append_db_output("Error: Database name is required.", "error")
            return

        ok, msg = self._validate_identifier(name)
        if not ok:
            self.append_db_output(msg, "error")
            return

        if not messagebox.askyesno("Create Database", f"Create database '{name}'?", icon="question"):
            return

        def do_create():
            try:
                self.root.after(0, lambda: self.append_db_output(f"\n➕ Creating database: {name}", "info"))
                result = adapter.create_database(name)
                if isinstance(result, str) and result.startswith("Error"):
                    self.root.after(0, lambda: self.append_db_output(result, "error"))
                    return
                self.root.after(0, lambda: self.append_db_output("OK", "success"))
                self.root.after(0, self.refresh_mysql_databases)
            except Exception as e:
                self.root.after(0, lambda: self.append_db_output(f"Error: {e}", "error"))

        threading.Thread(target=do_create, daemon=True).start()

    def drop_database_action(self):
        adapter = self.db_adapter
        if not adapter:
            self.append_db_output("Error: DB adapter not ready", "error")
            return

        name = (self.db_new_name.get() or "").strip() or (self.db_name.get() or "").strip()
        if not name:
            self.append_db_output("Error: Database name is required.", "error")
            return

        ok, msg = self._validate_identifier(name)
        if not ok:
            self.append_db_output(msg, "error")
            return

        if not messagebox.askyesno(
            "Drop Database",
            f"DROP DATABASE '{name}'?\n\nThis is destructive and cannot be undone.",
            icon="warning",
        ):
            return

        def do_drop():
            try:
                self.root.after(0, lambda: self.append_db_output(f"\n🗑 Dropping database: {name}", "warning"))
                result = adapter.drop_database(name)
                if isinstance(result, str) and result.startswith("Error"):
                    self.root.after(0, lambda: self.append_db_output(result, "error"))
                    return
                self.root.after(0, lambda: self.append_db_output("OK", "success"))
                self.root.after(0, self.refresh_mysql_databases)
            except Exception as e:
                self.root.after(0, lambda: self.append_db_output(f"Error: {e}", "error"))

        threading.Thread(target=do_drop, daemon=True).start()

    def _validate_identifier(self, name):
        n = (name or "").strip()
        if not n:
            return (False, "Error: Name is required.")
        if len(n) > 128:
            return (False, "Error: Name is too long.")
        if not re.match(r"^[A-Za-z_][A-Za-z0-9_]*$", n):
            return (False, "Error: Name must match ^[A-Za-z_][A-Za-z0-9_]*$ (simple safe identifier).")
        return (True, "OK")

    def _quote_ident(self, name):
        n = (name or "").strip()
        if self.db_type.get() == "MySQL/MariaDB":
            return "`" + n.replace("`", "``") + "`"
        if self.db_type.get() == "SQL Server":
            return "[" + n.replace("]", "]]" ) + "]"
        return '"' + n.replace('"', '""') + '"'

    def open_create_table_wizard(self):
        if hasattr(self, '_create_table_win') and self._create_table_win and self._create_table_win.winfo_exists():
            try:
                self._create_table_win.lift()
                self._create_table_win.focus_force()
            except Exception:
                pass
            return

        win = tk.Toplevel(self.root)
        self._create_table_win = win
        win.title("Create Table")
        win.configure(bg=self.colors["bg"])
        win.geometry("720x520")

        header = tk.Frame(win, bg=self.colors["secondary"], bd=1, relief="flat")
        header.pack(fill="x", padx=10, pady=(10, 0))
        tk.Label(header, text="Create Table Wizard", bg=self.colors["secondary"], fg=self.colors["fg"],
                 font=("Segoe UI", 11, "bold")).pack(side="left", padx=10, pady=10)

        body = tk.Frame(win, bg=self.colors["bg"])
        body.pack(fill="both", expand=True, padx=10, pady=10)

        top_row = tk.Frame(body, bg=self.colors["bg"])
        top_row.pack(fill="x")

        tk.Label(top_row, text="Database:", bg=self.colors["bg"], fg=self.colors["fg"]).pack(side="left", padx=(0, 5))
        db_display = tk.Label(top_row, text=(self.db_name.get() or "(default)"), bg=self.colors["bg"], fg=self.colors["accent"])
        db_display.pack(side="left", padx=(0, 20))

        tk.Label(top_row, text="Table name:", bg=self.colors["bg"], fg=self.colors["fg"]).pack(side="left", padx=(0, 5))
        self._ct_table_name = tk.StringVar(value="")
        tk.Entry(top_row, textvariable=self._ct_table_name,
                 bg=self.colors["secondary"], fg="white", insertbackground="white",
                 relief="flat", width=24).pack(side="left")

        cols_frame = ttk.LabelFrame(body, text="  Columns  ")
        cols_frame.pack(fill="both", expand=True, pady=(10, 10))

        cols_toolbar = tk.Frame(cols_frame, bg=self.colors["bg"])
        cols_toolbar.pack(fill="x", padx=10, pady=(10, 0))
        ttk.Button(cols_toolbar, text="+ Add Column", command=self._ct_add_column_row,
                  style="Secondary.TButton").pack(side="left")
        ttk.Button(cols_toolbar, text="- Remove Last", command=self._ct_remove_last_column_row,
                  style="Secondary.TButton").pack(side="left", padx=(8, 0))

        header_row = tk.Frame(cols_frame, bg=self.colors["bg"])
        header_row.pack(fill="x", padx=10, pady=(10, 0))
        tk.Label(header_row, text="Name", bg=self.colors["bg"], fg=self.colors["fg"], width=18, anchor="w").pack(side="left")
        tk.Label(header_row, text="Type", bg=self.colors["bg"], fg=self.colors["fg"], width=18, anchor="w").pack(side="left", padx=(5, 0))
        tk.Label(header_row, text="Nullable", bg=self.colors["bg"], fg=self.colors["fg"], width=10, anchor="w").pack(side="left", padx=(5, 0))
        tk.Label(header_row, text="PK", bg=self.colors["bg"], fg=self.colors["fg"], width=6, anchor="w").pack(side="left", padx=(5, 0))

        self._ct_cols_container = tk.Frame(cols_frame, bg=self.colors["bg"])
        self._ct_cols_container.pack(fill="both", expand=True, padx=10, pady=(5, 10))
        self._ct_col_rows = []

        self._ct_add_column_row()
        self._ct_add_column_row()

        bottom = tk.Frame(body, bg=self.colors["bg"])
        bottom.pack(fill="x")

        ttk.Button(bottom, text="Preview SQL", command=self._ct_preview_sql,
                  style="Action.TButton").pack(side="left")
        ttk.Button(bottom, text="Create Table", command=self._ct_execute_create_table,
                  style="Success.TButton").pack(side="left", padx=(8, 0))
        ttk.Button(bottom, text="Close", command=win.destroy,
                  style="Secondary.TButton").pack(side="right")

    def _ct_types_for_engine(self):
        t = self.db_type.get()
        if t == "MySQL/MariaDB":
            return ["INT", "BIGINT", "VARCHAR(255)", "TEXT", "DATETIME", "DATE", "DECIMAL(10,2)", "BOOLEAN"]
        if t == "PostgreSQL":
            return ["INTEGER", "BIGINT", "VARCHAR(255)", "TEXT", "TIMESTAMP", "DATE", "NUMERIC(10,2)", "BOOLEAN"]
        if t == "SQL Server":
            return ["INT", "BIGINT", "NVARCHAR(255)", "NVARCHAR(MAX)", "DATETIME2", "DATE", "DECIMAL(10,2)", "BIT"]
        return ["INTEGER", "TEXT", "REAL", "BLOB", "NUMERIC"]

    def _ct_add_column_row(self):
        row = tk.Frame(self._ct_cols_container, bg=self.colors["bg"])
        row.pack(fill="x", pady=3)

        name_var = tk.StringVar(value="")
        type_var = tk.StringVar(value=self._ct_types_for_engine()[0])
        nullable_var = tk.BooleanVar(value=True)
        pk_var = tk.BooleanVar(value=False)

        tk.Entry(row, textvariable=name_var,
                 bg=self.colors["secondary"], fg="white", insertbackground="white",
                 relief="flat", width=22).pack(side="left")

        type_cb = ttk.Combobox(row, textvariable=type_var, values=self._ct_types_for_engine(), state="readonly", width=18)
        type_cb.pack(side="left", padx=(5, 0))
        self._bind_dark_combobox(type_cb)

        tk.Checkbutton(
            row,
            variable=nullable_var,
            bg=self.colors["bg"],
            activebackground=self.colors["bg"],
            selectcolor=self.colors["bg"],
            highlightthickness=0,
            bd=0,
        ).pack(side="left", padx=(18, 0))

        tk.Checkbutton(
            row,
            variable=pk_var,
            bg=self.colors["bg"],
            activebackground=self.colors["bg"],
            selectcolor=self.colors["bg"],
            highlightthickness=0,
            bd=0,
        ).pack(side="left", padx=(30, 0))

        self._ct_col_rows.append((row, name_var, type_var, nullable_var, pk_var))

    def _ct_remove_last_column_row(self):
        if not getattr(self, '_ct_col_rows', None):
            return
        row, *_ = self._ct_col_rows.pop()
        try:
            row.destroy()
        except Exception:
            pass

    def _ct_build_sql(self):
        table = (self._ct_table_name.get() or "").strip()
        if not table:
            return (None, "Error: Table name is required.")

        ok, msg = self._validate_identifier(table)
        if not ok:
            return (None, msg)

        cols = []
        pk_cols = []
        for _, name_var, type_var, nullable_var, pk_var in getattr(self, '_ct_col_rows', []):
            cname = (name_var.get() or "").strip()
            if not cname:
                continue
            ok, msg = self._validate_identifier(cname)
            if not ok:
                return (None, msg)
            ctype = (type_var.get() or "").strip()
            null_sql = "" if nullable_var.get() else " NOT NULL"
            cols.append(f"{self._quote_ident(cname)} {ctype}{null_sql}")
            if pk_var.get():
                pk_cols.append(self._quote_ident(cname))

        if not cols:
            return (None, "Error: At least one column is required.")

        if pk_cols:
            cols.append(f"PRIMARY KEY ({', '.join(pk_cols)})")

        sql = f"CREATE TABLE {self._quote_ident(table)} (\n  " + ",\n  ".join(cols) + "\n);"
        return (sql, None)

    def _ct_preview_sql(self):
        sql, err = self._ct_build_sql()
        if err:
            self.append_db_output(err, "error")
            return
        self.append_db_output("\n" + sql, "info")

    def _ct_execute_create_table(self):
        adapter = self.db_adapter
        if not adapter:
            self.append_db_output("Error: DB adapter not ready", "error")
            return

        sql, err = self._ct_build_sql()
        if err:
            self.append_db_output(err, "error")
            return

        db = (self.db_name.get() or "").strip() or None
        if self.db_type.get() == "PostgreSQL" and not db:
            db = "postgres"
        if self.db_type.get() == "SQL Server" and not db:
            db = "master"

        if not messagebox.askyesno("Create Table", "Execute CREATE TABLE now?", icon="question"):
            return

        def do_run():
            try:
                self.root.after(0, lambda: self.append_db_output("\n🧱 Creating table...", "info"))
                result = adapter.run_sql(sql, database=db, timeout=60)
                if isinstance(result, str) and result.startswith("Error"):
                    self.root.after(0, lambda: self.append_db_output(result, "error"))
                    return
                self.root.after(0, lambda: self.append_db_output("OK", "success"))
                self.root.after(0, self.view_database_status)
            except Exception as e:
                self.root.after(0, lambda: self.append_db_output(f"Error: {e}", "error"))

        threading.Thread(target=do_run, daemon=True).start()
    
    def run_mysql_command(self, args, database=None, show_error=True, timeout=30):
        """Execute a MySQL command with timeout"""
        try:
            return self.db_adapter.run_mysql_command(args, database=database, show_error=show_error, timeout=timeout)
        except subprocess.TimeoutExpired:
            error_msg = f"MySQL timeout after {timeout}s - connection may be slow or server unreachable"
            if show_error:
                messagebox.showerror("Connection Timeout", error_msg)
            return f"Error: {error_msg}"
        except Exception as e:
            error_msg = f"MySQL execution error: {str(e)}"
            if show_error:
                messagebox.showerror("Error", error_msg)
            return error_msg
    
    def refresh_mysql_databases(self):
        """Fetch list of MySQL databases"""
        if self.db_type.get() == "SQLite":
            dbs = self.db_adapter.list_databases() if self.db_adapter else ["(sqlite)"]
            self.db_dropdown['values'] = dbs
            self.db_name.set(dbs[0] if dbs else "(sqlite)")
            self.append_db_output("Using SQLite database file.", "info")
            self.db_status_label.config(text="● SQLite Ready", fg=self.colors["success"])
            return

        if self.db_type.get() in ("PostgreSQL", "SQL Server"):
            if not self.db_adapter:
                self.append_db_output("Error: DB adapter not ready", "error")
                return
            dbs = self.db_adapter.list_databases()
            if isinstance(dbs, str) and dbs.startswith("Error"):
                self.append_db_output(dbs, "error")
                self.db_status_label.config(text="● Connection Error", fg=self.colors["danger"])
                return
            self.db_dropdown['values'] = dbs
            if dbs:
                self.db_name.set(dbs[0])
            self.append_db_output(f"Found {len(dbs)} databases", "success")
            self.db_status_label.config(text=f"● {len(dbs)} Databases Available", fg=self.colors["success"])
            return

        if not self._ensure_mysql_db_selected():
            return
        def do_refresh():
            self.db_status_label.config(text="● Loading databases...", fg=self.colors["warning"])
            self.root.update()
            
            result = self.run_mysql_command(["-e", "SHOW DATABASES;"], show_error=False)
            
            if result.startswith("Error"):
                self.append_db_output(f"Failed to fetch databases: {result}", "error")
                self.db_status_label.config(text="● Connection Error", fg=self.colors["danger"])
                return
            
            # Parse database list (skip system databases)
            system_dbs = ['information_schema', 'mysql', 'performance_schema', 'sys', 'phpmyadmin']
            databases = []
            for line in result.split('\n'):
                db_name = line.strip()
                if db_name and db_name not in system_dbs and not db_name.startswith('Database'):
                    databases.append(db_name)
            
            # Update dropdown
            self.db_dropdown['values'] = databases
            
            self.append_db_output(f"Found {len(databases)} databases: {', '.join(databases[:10])}{'...' if len(databases) > 10 else ''}", "success")
            self.db_status_label.config(text=f"● {len(databases)} Databases Available", fg=self.colors["success"])
        
        threading.Thread(target=do_refresh, daemon=True).start()
    
    def view_database_status(self):
        """View tables and sizes in selected database"""
        if self.db_type.get() == "SQLite":
            tables = self.db_adapter.list_tables() if self.db_adapter else "Error: SQLite adapter not ready"
            if isinstance(tables, str) and tables.startswith("Error"):
                self.append_db_output(tables, "error")
                return
            self.append_db_output(f"\n📊 SQLite tables ({len(tables)} total):\n", "info")
            for t in (tables or [])[:50]:
                self.append_db_output(f"  • {t}", "info")
            return

        if self.db_type.get() in ("PostgreSQL", "SQL Server"):
            if not self.db_adapter:
                self.append_db_output("Error: DB adapter not ready", "error")
                return
            db_name = self.db_name.get() or ("postgres" if self.db_type.get() == "PostgreSQL" else "master")
            tables = self.db_adapter.list_tables(db_name)
            if isinstance(tables, str) and tables.startswith("Error"):
                self.append_db_output(tables, "error")
                return
            self.append_db_output(f"\n📊 Tables in {db_name} ({len(tables)} total):\n", "info")
            for t in (tables or [])[:50]:
                self.append_db_output(f"  • {t}", "info")
            if len(tables) > 50:
                self.append_db_output(f"  ... and {len(tables) - 50} more", "warning")
            return

        if not self._ensure_mysql_db_selected():
            return
        db_name = self.db_name.get()
        if not db_name:
            messagebox.showwarning("Warning", "Please select a database first.")
            return
        
        def do_view():
            self.append_db_output(f"\n📊 Analyzing database: {db_name}\n", "info")
            
            # Get tables
            result = self.run_mysql_command(
                ["-e", "SHOW TABLES;"],
                database=db_name,
                show_error=False
            )
            
            if result.startswith("Error"):
                self.append_db_output(f"Error: {result}", "error")
                return
            
            tables = [line.strip() for line in result.split('\n') if line.strip() and not line.startswith('Tables_in')]
            
            self.append_db_output(f"Tables in {db_name} ({len(tables)} total):\n", "success")
            
            # Get table sizes
            for table in tables[:20]:  # Limit to first 20 tables
                size_result = self.run_mysql_command(
                    ["-e", f"SELECT ROUND(((data_length + index_length) / 1024 / 1024), 2) AS 'Size(MB)' FROM information_schema.tables WHERE table_schema = '{db_name}' AND table_name = '{table}';"],
                    show_error=False
                )
                size = size_result.strip().split('\n')[-1] if size_result else "0.00"
                self.append_db_output(f"  • {table} - {size} MB", "info")
            
            if len(tables) > 20:
                self.append_db_output(f"  ... and {len(tables) - 20} more tables", "warning")
        
        threading.Thread(target=do_view, daemon=True).start()
    
    def export_database_to_txt(self):
        """Export database schema and sample data to text files"""
        if self.db_type.get() == "SQLite":
            export_dir = os.path.join(self.repo_dir, "db_exports_sqlite")
            result = self.db_adapter.export_schema_and_samples(export_dir) if self.db_adapter else "Error: SQLite adapter not ready"
            if isinstance(result, str) and result.startswith("Error"):
                self.append_db_output(result, "error")
                return
            self.append_db_output(f"\n✅ Export complete! {result} tables exported to:\n{export_dir}", "success")
            return

        if self.db_type.get() in ("PostgreSQL", "SQL Server"):
            db_name = self.db_name.get() or ("postgres" if self.db_type.get() == "PostgreSQL" else "master")
            export_dir = os.path.join(self.repo_dir, f"db_exports_{self.db_type.get().replace(' ', '_').lower()}_{db_name}")
            if not self.db_adapter:
                self.append_db_output("Error: DB adapter not ready", "error")
                return
            result = self.db_adapter.export_schema_to_dir(export_dir, db_name)
            if isinstance(result, str) and result.startswith("Error"):
                self.append_db_output(result, "error")
                return
            self.append_db_output(f"\n✅ Export complete! {result} tables exported to:\n{export_dir}", "success")
            return

        if not self._ensure_mysql_db_selected():
            return
        db_name = self.db_name.get()
        if not db_name:
            messagebox.showwarning("Warning", "Please select a database first.")
            return
        
        def do_export():
            self.append_db_output(f"\n📤 Starting export for {db_name}...\n", "info")
            
            # Create export directory
            export_dir = os.path.join(self.repo_dir, f"db_exports_{db_name}")
            os.makedirs(export_dir, exist_ok=True)
            
            # Get tables
            result = self.run_mysql_command(
                ["-e", "SHOW TABLES;"],
                database=db_name,
                show_error=False
            )
            
            if result.startswith("Error"):
                self.append_db_output(f"Error: {result}", "error")
                return
            
            tables = [line.strip() for line in result.split('\n') if line.strip() and not line.startswith('Tables_in')]
            
            exported_count = 0
            for table in tables:
                try:
                    out_file = os.path.join(export_dir, f"{table}.txt")
                    with open(out_file, 'w', encoding='utf-8') as f:
                        f.write(f"=== SCHEMA: {table} ===\n\n")
                        
                        # Get schema
                        schema = self.run_mysql_command(
                            ["-e", f"SHOW CREATE TABLE {table};"],
                            database=db_name,
                            show_error=False
                        )
                        f.write(schema + "\n\n")
                        
                        f.write(f"=== SAMPLE DATA (First 50 rows) ===\n\n")
                        
                        # Get sample data
                        data = self.run_mysql_command(
                            ["-e", f"SELECT * FROM {table} LIMIT 50;"],
                            database=db_name,
                            show_error=False
                        )
                        f.write(data + "\n")
                    
                    exported_count += 1
                    self.append_db_output(f"  ✓ Exported {table}", "success")
                    
                except Exception as e:
                    self.append_db_output(f"  ✗ Failed to export {table}: {e}", "error")
            
            self.append_db_output(f"\n✅ Export complete! {exported_count} tables exported to:\n{export_dir}", "success")
        
        threading.Thread(target=do_export, daemon=True).start()
    
    def selective_restore_table(self):
        """Restore a specific table from SQL file"""
        if not self._ensure_mysql_db_selected():
            return
        sql_file = self.sql_file_path.get()
        db_name = self.db_name.get()
        
        if not sql_file:
            messagebox.showwarning("Warning", "Please select an SQL file first.")
            return
        
        if not os.path.exists(sql_file):
            messagebox.showerror("Error", "SQL file not found.")
            return
        
        if not db_name:
            # Ask user to confirm or enter database name
            db_name = tk.simpledialog.askstring("Target Database", 
                                                "Enter target database name:",
                                                initialvalue=self.db_name.get())
            if not db_name:
                return
            self.db_name.set(db_name)
        
        # Scan SQL file for table names
        def scan_and_restore():
            self.append_db_output(f"\n🔍 Scanning {os.path.basename(sql_file)} for tables...", "info")
            
            try:
                with open(sql_file, 'r', encoding='utf-8', errors='ignore') as f:
                    content = f.read()
                
                # Find CREATE TABLE statements
                import re
                tables = re.findall(r'CREATE TABLE\s+`?(\w+)`?', content, re.IGNORECASE)
                
                if not tables:
                    self.append_db_output("No tables found in SQL file.", "error")
                    return
                
                # Show tables found
                self.append_db_output(f"Found {len(tables)} tables: {', '.join(tables)}", "success")
                
                # For now, do full import (in a real implementation, we'd show a dialog)
                confirm = messagebox.askyesno("Confirm Selective Restore", 
                    f"Found {len(tables)} tables in the SQL file.\n\n"
                    f"Target database: {db_name}\n"
                    f"This will DROP existing tables and recreate them.\n\n"
                    f"Continue with restore?")
                
                if not confirm:
                    self.append_db_output("Restore cancelled.", "warning")
                    return
                
                self._execute_sql_import(sql_file, db_name)
                
            except Exception as e:
                self.append_db_output(f"Error: {str(e)}", "error")
        
        threading.Thread(target=scan_and_restore, daemon=True).start()
    
    def full_database_import(self):
        """Import entire SQL file to database"""
        if self.db_type.get() in ("PostgreSQL", "SQL Server"):
            sql_file = self.sql_file_path.get()
            db_name = self.db_name.get()
            if not sql_file:
                messagebox.showwarning("Warning", "Please select an SQL file first.")
                return
            if not os.path.exists(sql_file):
                messagebox.showerror("Error", "SQL file not found.")
                return
            if not db_name:
                messagebox.showwarning("Warning", "Please select a target database first.")
                return
            if not self.db_adapter:
                self.append_db_output("Error: DB adapter not ready", "error")
                return
            confirm = messagebox.askyesno(
                "Confirm Import",
                f"This will execute SQL statements into '{db_name}'.\n\nContinue?",
            )
            if not confirm:
                return
            self.append_db_output(f"\n🚀 Importing SQL into {db_name}...", "info")
            result = self.db_adapter.import_sql_file(sql_file, db_name)
            if result == "OK":
                self.append_db_output("✅ Import completed successfully!", "success")
            else:
                self.append_db_output(f"❌ Import failed: {result}", "error")
            return

        sql_file = self.sql_file_path.get()
        db_name = self.db_name.get()
        
        if not sql_file:
            messagebox.showwarning("Warning", "Please select an SQL file first.")
            return
        
        if not os.path.exists(sql_file):
            messagebox.showerror("Error", "SQL file not found.")
            return
        
        if not db_name:
            db_name = tk.simpledialog.askstring("Target Database",
                                                "Enter target database name:\n"
                                                "(Will be created if it doesn't exist)",
                                                initialvalue=self.db_name.get())
            if not db_name:
                return
            self.db_name.set(db_name)
        
        confirm = messagebox.askyesno("⚠️ Confirm Full Import",
            f"This will DESTROY and RECREATE database '{db_name}'\n\n"
            f"Source: {os.path.basename(sql_file)}\n"
            f"Target: {db_name}\n\n"
            f"Type 'EXECUTE' to proceed:",
            icon='warning')
        
        if not confirm:
            return
        
        def do_import():
            self._execute_sql_import(sql_file, db_name, drop_first=True)
        
        threading.Thread(target=do_import, daemon=True).start()
    
    def _execute_sql_import(self, sql_file, db_name, drop_first=False):
        """Internal method to execute SQL import with progress feedback"""
        try:
            # Get file info
            file_size = os.path.getsize(sql_file)
            file_size_mb = file_size / (1024 * 1024)
            
            self.append_db_output(f"\n🚀 Starting import to {db_name}...", "info")
            self.append_db_output(f"📄 SQL File: {os.path.basename(sql_file)} ({file_size_mb:.2f} MB)", "info")
            
            # Create database if it doesn't exist
            create_result = self.run_mysql_command(
                ["-e", f"CREATE DATABASE IF NOT EXISTS {db_name};"],
                show_error=False
            )
            
            if create_result.startswith("Error"):
                self.append_db_output(f"❌ Failed to create database: {create_result}", "error")
                return
            
            if drop_first:
                self.append_db_output(f"⚠️ Dropping and recreating {db_name}...", "warning")
                self.run_mysql_command(["-e", f"DROP DATABASE {db_name};"], show_error=False)
                self.run_mysql_command(["-e", f"CREATE DATABASE {db_name};"], show_error=False)
            
            mysql_client = self._get_mysql_client()
            if not mysql_client:
                self.append_db_output(f"❌ {self._mysql_not_found_message()}", "error")
                return

            # Execute SQL file with progress monitoring
            mysql_args = [mysql_client, "-h", self.db_host.get(), "-u", self.db_user.get()]
            
            # Add custom port if enabled
            if self.db_use_custom_port.get():
                port = self.db_port.get()
                if port and port != "3306":
                    mysql_args.extend(["-P", port])
            
            if self.db_password.get():
                mysql_args.extend(["-p" + self.db_password.get()])
            mysql_args.extend(["-D", db_name])
            
            self.append_db_output("⏳ Importing data... (large files may take several minutes)", "info")
            
            # For large files, show progress indicator
            if file_size_mb > 10:
                self.append_db_output(f"   Large file detected ({file_size_mb:.1f} MB). Please wait...", "warning")
            
            # Use longer timeout for large files (1 minute per 50MB, min 60s, max 600s)
            timeout = max(60, min(600, int(file_size_mb / 50 * 60)))
            
            # Open file with context manager to ensure proper closure
            with open(sql_file, 'r', encoding='utf-8', errors='ignore') as sql_f:
                kwargs = {'stdin': sql_f}
                if sys.platform == 'win32':
                    kwargs['creationflags'] = subprocess.CREATE_NO_WINDOW
                
                result = subprocess.run(mysql_args, **kwargs, capture_output=True, text=True, timeout=timeout)
            
            if result.returncode != 0:
                error_msg = result.stderr.strip() if result.stderr else "Unknown error"
                self.append_db_output(f"❌ Import failed:\n{error_msg[:500]}", "error")
                if "access denied" in error_msg.lower():
                    self.append_db_output("💡 Tip: Check username/password", "warning")
                elif "unknown database" in error_msg.lower():
                    self.append_db_output("💡 Tip: Database may not exist and couldn't be created", "warning")
                return
            
            self.append_db_output(f"\n✅ Import completed successfully!", "success")
            self.append_db_output(f"📊 Database '{db_name}' restored ({file_size_mb:.2f} MB)", "success")
            
            # Refresh database list
            self.refresh_mysql_databases()
            
        except subprocess.TimeoutExpired:
            self.append_db_output(f"⏱️ Import timeout - file too large or connection too slow", "error")
            self.append_db_output("💡 Tip: Try importing smaller chunks or use command line", "warning")
        except Exception as e:
            self.append_db_output(f"❌ Import error: {str(e)}", "error")
    
    def append_db_output(self, message, tag=None):
        """Append message to database output text"""
        def update():
            self.db_output_text.config(state="normal")
            if tag:
                self.db_output_text.insert(tk.END, message + "\n", tag)
            else:
                self.db_output_text.insert(tk.END, message + "\n")
            self.db_output_text.see(tk.END)
            self.db_output_text.config(state="disabled")
        
        self.root.after(0, update)

if __name__ == "__main__":
    root = tk.Tk()
    app = GitGUI(root)
    root.mainloop()
