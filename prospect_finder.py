
import json
import os
from pathlib import Path
from urllib.error import HTTPError, URLError
from urllib.request import Request, urlopen

from dotenv import load_dotenv


FIRECRAWL_SCRAPE_URL = "https://api.firecrawl.dev/v2/scrape"

INPUT_FILE = Path(__file__).with_name("prospects.json")
OUTPUT_FILE = Path(__file__).with_name("enriched_prospects.json")


def scrape_website(api_key: str, url: str) -> dict:
    """Scrape one business website with Firecrawl."""

    payload = json.dumps(
        {
            "url": url,
            "formats": ["markdown"],
        }
    ).encode("utf-8")

    request = Request(
        FIRECRAWL_SCRAPE_URL,
        data=payload,
        headers={
            "Authorization": f"Bearer {api_key}",
            "Content-Type": "application/json",
        },
        method="POST",
    )

    try:
        with urlopen(request, timeout=60) as response:
            return json.load(response)

    except HTTPError as error:
        return {
            "success": False,
            "error": f"HTTP {error.code}",
        }

    except URLError as error:
        return {
            "success": False,
            "error": f"Connection error: {error.reason}",
        }

    except Exception as error:
        return {
            "success": False,
            "error": str(error),
        }


def extract_content(result: dict) -> str:
    """Get the scraped Markdown content from Firecrawl's response."""

    data = result.get("data", {})

    if isinstance(data, dict):
        content = data.get("markdown")

        if isinstance(content, str):
            return content

    return ""


def main() -> None:
    load_dotenv()

    api_key = os.environ.get("FIRECRAWL_API_KEY")

    if not api_key:
        raise SystemExit(
            "FIRECRAWL_API_KEY was not found in your .env file."
        )

    if not INPUT_FILE.exists():
        raise SystemExit(
            f"Could not find {INPUT_FILE.name}. "
            "Run prospect_finder.py first."
        )

    prospects = json.loads(
        INPUT_FILE.read_text(encoding="utf-8")
    )

    if not isinstance(prospects, list):
        raise SystemExit(
            "prospects.json does not contain a list of prospects."
        )

    enriched_prospects = []

    print(f"Starting enrichment for {len(prospects)} prospects...")
    print()

    for number, prospect in enumerate(prospects, start=1):
        company_name = prospect.get("company_name", "Unknown company")
        website_url = prospect.get("website_url", "")

        print(
            f"[{number}/{len(prospects)}] "
            f"Scraping {company_name}..."
        )

        if not website_url:
            enriched_prospects.append(
                {
                    **prospect,
                    "scrape_success": False,
                    "scrape_error": "No website URL",
                    "website_content": "",
                }
            )
            continue

        result = scrape_website(api_key, website_url)

        if result.get("success") is False:
            error = result.get("error", "Unknown Firecrawl error")

            print(f"    Failed: {error}")

            enriched_prospects.append(
                {
                    **prospect,
                    "scrape_success": False,
                    "scrape_error": error,
                    "website_content": "",
                }
            )

            continue

        content = extract_content(result)

        print(
            f"    Success: {len(content):,} characters retrieved."
        )

        enriched_prospects.append(
            {
                **prospect,
                "scrape_success": True,
                "scrape_error": None,
                "website_content": content,
            }
        )

    OUTPUT_FILE.write_text(
        json.dumps(enriched_prospects, indent=2),
        encoding="utf-8",
    )

    successful = sum(
        1
        for prospect in enriched_prospects
        if prospect.get("scrape_success") is True
    )

    failed = len(enriched_prospects) - successful

    print()
    print("================================")
    print("ENRICHMENT COMPLETE")
    print("================================")
    print(f"Total prospects: {len(enriched_prospects)}")
    print(f"Successful: {successful}")
    print(f"Failed: {failed}")
    print()
    print(f"Saved to: {OUTPUT_FILE}")


if __name__ == "__main__":
    main()
