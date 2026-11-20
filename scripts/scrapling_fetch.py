import json
import sys

TIMEOUT_SECONDS = 8
MAX_HTML_CHARS = 1_000_000


def read(url):
    from scrapling.fetchers import Fetcher

    page = Fetcher.get(url, impersonate="chrome", timeout=TIMEOUT_SECONDS, retries=1, follow_redirects=False)
    headers = {str(key).lower(): str(value) for key, value in dict(page.headers or {}).items()}
    body = page.body
    html = body.decode(page.encoding or "utf-8", "replace") if isinstance(body, bytes) else str(body)
    return {
        "url": str(page.url),
        "status": int(page.status),
        "location": headers.get("location", ""),
        "contentType": headers.get("content-type", ""),
        "title": page.css("title::text").get() or "",
        "html": html[:MAX_HTML_CHARS],
    }


def main():
    if len(sys.argv) != 2:
        result = {"error": "Give exactly one URL"}
    else:
        try:
            result = read(sys.argv[1])
        except ImportError:
            result = {"error": "Scrapling is not installed"}
        except Exception as error:
            result = {"error": type(error).__name__}
    sys.stdout.reconfigure(encoding="utf-8")
    sys.stdout.write(json.dumps(result, ensure_ascii=False))


main()
