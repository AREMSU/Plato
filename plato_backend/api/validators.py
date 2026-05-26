from disposable_email_domains import blocklist
import dns.resolver
import dns.exception


def _extract_domain(email: str) -> str:
    try:
        domain = email.strip().lower().split('@')[-1]
        return domain if domain and '.' in domain else ''
    except Exception:
        return ''


def is_disposable_email(email: str) -> bool:
    """
    Check if an email address belongs to a known disposable/temporary
    email provider (e.g. tempmail.com, guerrillamail.com, yopmail.com).

    Uses the 'disposable-email-domains' package which maintains a
    comprehensive blocklist of ~5,400+ disposable domains.
    """
    domain = _extract_domain(email)
    return domain in blocklist if domain else False


def has_email_dns(email: str) -> bool:
    """
    Check if the email domain has MX DNS records.

    Note: Do not fall back to A records. Many fake domains resolve A but
    cannot receive mail, so we require MX to block them.
    """
    domain = _extract_domain(email)
    if not domain:
        return False

    try:
        dns.resolver.resolve(domain, 'MX')
        return True
    except (dns.resolver.NXDOMAIN, dns.resolver.NoAnswer, dns.resolver.NoNameservers, dns.exception.Timeout):
        return False
