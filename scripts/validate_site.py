"""Dependency-free validation for the Navigator Consulting static website."""

from __future__ import annotations

from html.parser import HTMLParser
from pathlib import Path
from urllib.parse import unquote, urlsplit


ROOT = Path(__file__).resolve().parents[1]
PAGES = sorted(ROOT.glob("*.html"))
PUBLIC_PAGES = [page for page in PAGES if page.name != "painel.html"]


class PageParser(HTMLParser):
    def __init__(self) -> None:
        super().__init__()
        self.ids: set[str] = set()
        self.duplicate_ids: set[str] = set()
        self.references: list[str] = []
        self.images: list[dict[str, str | None]] = []
        self.h1_count = 0
        self.titles = 0
        self.descriptions = 0
        self.nav_toggles: list[dict[str, str | None]] = []
        self.social_meta: dict[str, str | None] = {}
        self.canonical_links = 0

    def handle_starttag(self, tag: str, attrs: list[tuple[str, str | None]]) -> None:
        data = dict(attrs)
        element_id = data.get("id")
        if element_id:
            if element_id in self.ids:
                self.duplicate_ids.add(element_id)
            self.ids.add(element_id)

        if tag == "h1":
            self.h1_count += 1
        elif tag == "title":
            self.titles += 1
        elif tag == "meta" and data.get("name") == "description":
            self.descriptions += 1
        elif tag == "meta" and data.get("property"):
            self.social_meta[data["property"]] = data.get("content")
        elif tag == "link" and data.get("rel") == "canonical":
            self.canonical_links += 1
        elif tag == "img":
            self.images.append(data)
        elif tag == "button" and data.get("id") == "navToggle":
            self.nav_toggles.append(data)

        reference = data.get("href") if tag in {"a", "link"} else data.get("src")
        if reference and tag in {"a", "link", "img", "script", "iframe"}:
            self.references.append(reference)


def parse_pages() -> dict[str, PageParser]:
    parsed: dict[str, PageParser] = {}
    for page in PAGES:
        parser = PageParser()
        parser.feed(page.read_text(encoding="utf-8"))
        parsed[page.name] = parser
    return parsed


def validate() -> list[str]:
    errors: list[str] = []
    parsed = parse_pages()

    if not PAGES:
        return ["No HTML pages found."]

    for page in PUBLIC_PAGES:
        parser = parsed[page.name]
        if parser.h1_count != 1:
            errors.append(f"{page.name}: expected one h1, found {parser.h1_count}")
        if parser.titles != 1:
            errors.append(f"{page.name}: expected one title element")
        if parser.descriptions != 1:
            errors.append(f"{page.name}: expected one meta description")
        if parser.canonical_links != 1:
            errors.append(f"{page.name}: expected one canonical link")
        for property_name in ("og:title", "og:description", "og:url", "og:image"):
            if not parser.social_meta.get(property_name):
                errors.append(f"{page.name}: missing {property_name}")
        if parser.duplicate_ids:
            errors.append(f"{page.name}: duplicate IDs: {sorted(parser.duplicate_ids)}")
        if len(parser.nav_toggles) != 1:
            errors.append(f"{page.name}: expected one mobile navigation toggle")
        elif parser.nav_toggles[0].get("aria-controls") != "navLinks":
            errors.append(f"{page.name}: navigation toggle must control navLinks")

        for image in parser.images:
            if not (image.get("alt") or "").strip():
                errors.append(f"{page.name}: image missing alt text")

        for reference in parser.references:
            parts = urlsplit(reference)
            if parts.scheme in {"http", "https", "mailto", "tel"}:
                continue

            target_name = unquote(parts.path)
            target = page.parent / target_name if target_name else page
            if not target.exists():
                errors.append(f"{page.name}: missing local reference {target_name}")
                continue

            if parts.fragment and target.suffix.lower() == ".html":
                target_parser = parsed.get(target.name)
                if target_parser and parts.fragment not in target_parser.ids:
                    errors.append(
                        f"{page.name}: missing anchor #{parts.fragment} in {target.name}"
                    )

    css = (ROOT / "css" / "style.css").read_text(encoding="utf-8")
    if css.count("{") != css.count("}"):
        errors.append("css/style.css: unbalanced braces")

    social_preview = ROOT / "images" / "social-preview.jpg"
    if not social_preview.exists():
        errors.append("Social preview image is missing")
    elif social_preview.stat().st_size > 1_000_000:
        errors.append("Social preview image must remain below 1 MB")

    javascript = (ROOT / "js" / "main.js").read_text(encoding="utf-8")
    if "wa.me/258843785602" not in "\n".join(
        page.read_text(encoding="utf-8") for page in PAGES
    ):
        errors.append("WhatsApp contact link is missing")
    if "nav-links" not in javascript or "aria-expanded" not in javascript:
        errors.append("Mobile navigation behavior is missing")

    return errors


if __name__ == "__main__":
    failures = validate()
    if failures:
        print("Validation failed:")
        for failure in failures:
            print(f"- {failure}")
        raise SystemExit(1)
    print(f"Validated {len(PUBLIC_PAGES)} public pages successfully.")
