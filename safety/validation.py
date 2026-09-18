from urllib.parse import urlparse

ALLOWED_STATUSES = {"draft", "publish", "pending", "private"}

def validate_status(status):
    if status not in ALLOWED_STATUSES:
        raise ValueError(f"Invalid status. Allowed: {', '.join(sorted(ALLOWED_STATUSES))}")
    return status

def validate_url(url):
    parsed = urlparse(url)
    if parsed.scheme not in {"http", "https"} or not parsed.netloc:
        raise ValueError("A valid http/https site URL is required.")
    return url.rstrip("/")
