import base64
import hashlib
import sqlite3
from pathlib import Path

from cryptography.fernet import Fernet

from config import settings

DB_PATH = Path("./wordpress_mcp.db")


def _encryption_key():
    secret = (
        settings.app_secret_key
        or settings.mcp_auth_token
        or settings.admin_password
        or "wordpress-mcp-local-dev"
    ).strip()
    digest = hashlib.sha256(secret.encode("utf-8")).digest()
    return base64.urlsafe_b64encode(digest)


def _cipher():
    return Fernet(_encryption_key())


def _encrypt_secret(value):
    if value is None:
        return ""
    value = str(value)
    if value == "":
        return ""
    return _cipher().encrypt(value.encode("utf-8")).decode("utf-8")


def _decrypt_secret(value):
    if value in (None, ""):
        return ""
    try:
        return _cipher().decrypt(value.encode("utf-8")).decode("utf-8")
    except Exception:
        return value


def _decrypt_site_row(row):
    if row is None:
        return None
    row = dict(row)
    for field in ("wp_app_password", "wc_consumer_secret"):
        if field in row:
            row[field] = _decrypt_secret(row.get(field) or "")
    return row


def init_db():
    with sqlite3.connect(DB_PATH) as db:
        db.execute("""
        CREATE TABLE IF NOT EXISTS sites (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            base_url TEXT NOT NULL,
            wp_username TEXT NOT NULL,
            wp_app_password TEXT NOT NULL,
            wc_consumer_key TEXT DEFAULT '',
            wc_consumer_secret TEXT DEFAULT '',
            active INTEGER DEFAULT 0,
            created_at TEXT DEFAULT CURRENT_TIMESTAMP,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS settings (
            key TEXT PRIMARY KEY,
            value TEXT NOT NULL,
            updated_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)
        db.execute("""
        CREATE TABLE IF NOT EXISTS activity_logs (
            id INTEGER PRIMARY KEY AUTOINCREMENT,
            tool TEXT NOT NULL,
            action TEXT NOT NULL,
            site_id INTEGER,
            target TEXT DEFAULT '',
            status TEXT NOT NULL,
            details TEXT DEFAULT '',
            created_at TEXT DEFAULT CURRENT_TIMESTAMP
        )
        """)
        db.commit()

def get_setting(key, default=None):
    with sqlite3.connect(DB_PATH) as db:
        row = db.execute("SELECT value FROM settings WHERE key=?", (key,)).fetchone()
        return row[0] if row else default

def set_setting(key, value):
    with sqlite3.connect(DB_PATH) as db:
        db.execute("""
        INSERT INTO settings(key,value,updated_at) VALUES(?,?,CURRENT_TIMESTAMP)
        ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP
        """, (key, value))
        db.commit()

def ensure_bootstrap_site():
    with sqlite3.connect(DB_PATH) as db:
        count = db.execute("SELECT COUNT(*) FROM sites").fetchone()[0]
        if count == 0 and settings.bootstrap_wp_base_url and settings.bootstrap_wp_username and settings.bootstrap_wp_app_password:
            db.execute("""
            INSERT INTO sites(name,base_url,wp_username,wp_app_password,wc_consumer_key,wc_consumer_secret,active)
            VALUES(?,?,?,?,?,?,1)
            """, (
                "Xhunta",
                settings.bootstrap_wp_base_url.rstrip("/"),
                settings.bootstrap_wp_username,
                _encrypt_secret(settings.bootstrap_wp_app_password),
                settings.wc_consumer_key,
                _encrypt_secret(settings.wc_consumer_secret),
            ))
            db.commit()

def get_active_site():
    ensure_bootstrap_site()
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM sites WHERE active=1 ORDER BY id LIMIT 1").fetchone()
        return _decrypt_site_row(row)


def list_sites():
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        return [_decrypt_site_row(r) for r in db.execute("SELECT * FROM sites ORDER BY active DESC,id DESC").fetchall()]


def get_site(site_id):
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        row = db.execute("SELECT * FROM sites WHERE id=?", (site_id,)).fetchone()
        return _decrypt_site_row(row)


def save_site(data, site_id=None):
    with sqlite3.connect(DB_PATH) as db:
        encrypted_password = _encrypt_secret(data.get("wp_app_password", ""))
        encrypted_wc_secret = _encrypt_secret(data.get("wc_consumer_secret", ""))
        if site_id:
            db.execute("""
            UPDATE sites SET name=?,base_url=?,wp_username=?,wp_app_password=?,
            wc_consumer_key=?,wc_consumer_secret=?,updated_at=CURRENT_TIMESTAMP WHERE id=?
            """, (
                data["name"], data["base_url"].rstrip("/"), data["wp_username"], encrypted_password,
                data.get("wc_consumer_key", ""), encrypted_wc_secret, site_id
            ))
        else:
            db.execute("""
            INSERT INTO sites(name,base_url,wp_username,wp_app_password,wc_consumer_key,wc_consumer_secret,active)
            VALUES(?,?,?,?,?,?,0)
            """, (
                data["name"], data["base_url"].rstrip("/"), data["wp_username"], encrypted_password,
                data.get("wc_consumer_key", ""), encrypted_wc_secret
            ))
        db.commit()

def activate_site(site_id):
    with sqlite3.connect(DB_PATH) as db:
        db.execute("UPDATE sites SET active=0")
        db.execute("UPDATE sites SET active=1,updated_at=CURRENT_TIMESTAMP WHERE id=?", (site_id,))
        db.commit()

def delete_site(site_id):
    with sqlite3.connect(DB_PATH) as db:
        db.execute("DELETE FROM sites WHERE id=?", (site_id,))
        db.commit()

def log_activity(tool, action, site_id, target, status, details=""):
    with sqlite3.connect(DB_PATH) as db:
        db.execute("""
        INSERT INTO activity_logs(tool,action,site_id,target,status,details)
        VALUES(?,?,?,?,?,?)
        """, (tool, action, site_id, target, status, details[:4000]))
        db.commit()

def recent_logs(limit=100):
    with sqlite3.connect(DB_PATH) as db:
        db.row_factory = sqlite3.Row
        return [dict(r) for r in db.execute(
            "SELECT * FROM activity_logs ORDER BY id DESC LIMIT ?", (limit,)
        ).fetchall()]
