import os
from dataclasses import dataclass
from dotenv import load_dotenv

load_dotenv()

@dataclass
class Config:
    app_env: str = os.getenv("APP_ENV", "development")
    database_url: str = os.getenv("DATABASE_URL", "sqlite:///./wordpress_mcp.db")
    app_secret_key: str = os.getenv(
        "APP_SECRET_KEY",
        os.getenv("MCP_AUTH_TOKEN", "change-me-in-production"),
    )
    bootstrap_wp_base_url: str = os.getenv("WP_BASE_URL", "")
    bootstrap_wp_username: str = os.getenv("WP_USERNAME", "")
    bootstrap_wp_app_password: str = os.getenv("WP_APP_PASSWORD", "")
    mcp_auth_token: str = os.getenv("MCP_AUTH_TOKEN", "")
    admin_username: str = os.getenv("ADMIN_USERNAME", "admin")
    admin_password: str = os.getenv("ADMIN_PASSWORD", "")
    request_timeout: int = int(os.getenv("REQUEST_TIMEOUT", "60"))
    max_upload_size: int = int(os.getenv("MAX_UPLOAD_SIZE", "26214400"))
    wc_consumer_key: str = os.getenv("WC_CONSUMER_KEY", "")
    wc_consumer_secret: str = os.getenv("WC_CONSUMER_SECRET", "")
    mcp_public_url: str = os.getenv("MCP_PUBLIC_URL", "http://localhost:8000")

settings = Config()
