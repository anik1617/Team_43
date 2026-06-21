# cloud/tests/test_service_experts.py
"""End-to-end: surgeon registers + opts in → escalate matches them (deterministically) and
relays WITHOUT leaking the phone number → opt-out stops matching. Twilio/Google/escalate-token
are force-OFF so the suite never sends a real message or hits the network."""
import os
import tempfile

# fresh DB + deterministic env BEFORE importing the app (engine binds to KYRO_DB at import).
os.environ["KYRO_DB"] = os.path.join(tempfile.gettempdir(), "kyro_experts_test.db")
os.environ["KYRO_INSECURE_COOKIES"] = "1"   # TestClient runs over http: allow non-Secure session cookies
if os.path.exists(os.environ["KYRO_DB"]):
    os.remove(os.environ["KYRO_DB"])

from service.app import app  # noqa: E402  (runs load_dotenv → may set real secrets; we strip them next)

for _k in ("TWILIO_ACCOUNT_SID", "TWILIO_AUTH_TOKEN", "TWILIO_WHATSAPP_FROM",
           "KYRO_ESCALATE_TOKEN", "GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"):
    os.environ.pop(_k, None)

from fastapi.testclient import TestClient  # noqa: E402


def test_full_expert_escalation_flow():
    phone = "+923001234567"
    with TestClient(app) as c:
        r = c.post("/experts/register", data={
            "email": "flow@x.com", "password": "longpassword", "name": "Dr Neuro",
            "specialty": "Neurosurgery", "role": "Consultant", "phone": phone, "opt_in": "1"})
        assert r.status_code == 200 and "Reachable now" in r.text     # opted-in + phone

        r2 = c.post("/escalate", json={"case_summary": "31M EDH, lucid interval then blown L pupil",
                                       "needed_specialty": "neurosurgery"})
        j = r2.json()
        assert j["matched"] is True and j["recommended"]["specialty"] == "Neurosurgery"
        assert j["channel"] == "staged"                               # Twilio off → demo-safe stub
        # PII never leaves the cloud: no phone, and no identifying fields in the response at all
        assert phone not in r2.text
        for leaked in ("phone", "name", "institution", "region", "sid"):
            assert leaked not in j["recommended"] and leaked not in j

        # opt OUT (logged in via cookie) → omit the opt_in checkbox
        r3 = c.post("/experts/profile", data={"specialty": "Neurosurgery", "phone": phone})
        assert r3.status_code == 200 and ("opted OUT" in r3.text or "Not reachable" in r3.text)

        j4 = c.post("/escalate", json={"case_summary": "another case"}).json()
        assert j4["matched"] is False and j4["recommended"] is None and j4["channel"] == "staged"


def test_login_rejects_wrong_password():
    with TestClient(app) as c:
        c.post("/experts/register", data={"email": "li@x.com", "password": "correctpassword",
                                          "specialty": "Neurology"})
        r = c.post("/experts/login", data={"email": "li@x.com", "password": "wrongpassword"})
        assert r.status_code == 200 and "Invalid email or password" in r.text


def test_oauth_gated_when_unconfigured():
    with TestClient(app) as c:
        r = c.get("/auth/google", follow_redirects=False)
        assert r.status_code in (302, 303, 307)
        assert "/experts/login" in r.headers["location"]


def test_contribute_requires_login():
    with TestClient(app) as c:
        # anonymous contribute is rejected → redirect to login, nothing staged
        r = c.post("/portal/contribute", data={"title": "x", "body": "y"}, follow_redirects=False)
        assert r.status_code == 303 and "/experts/login" in r.headers["location"]
        # the (open) inbox shows a sign-in prompt and renders NO contribute form for anonymous users
        page = c.get("/portal").text
        assert "Sign in to contribute" in page and 'action="/portal/contribute"' not in page
        # after registering, the form renders and contributing works (tagged to the account)
        c.post("/experts/register", data={"email": "contrib@x.com", "password": "longpassword",
                                          "name": "Dr Contrib", "specialty": "Neurosurgery"})
        assert 'action="/portal/contribute"' in c.get("/portal").text
        r2 = c.post("/portal/contribute", data={"title": "Peds thresholds", "body": "knowledge"},
                    follow_redirects=False)
        assert r2.status_code == 303 and "/portal/contributions" in r2.headers["location"]


def test_briefing_sanitizers_defang_and_single_line():
    # operator-supplied text forwarded to a surgeon's WhatsApp must not carry live links or forge
    # our own header lines.
    from service.escalate.routes import _defang, _short
    assert _defang("open http://evil.test/x now") == "open http[:]//evil.test/x now"
    out = _short("line1\nFAKE HEADER\nhttp://evil.test")
    assert "\n" not in out and "[:]//"  in out
