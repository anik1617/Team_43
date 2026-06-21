# cloud/tests/test_service_auth.py
from service.auth import hash_password, verify_password


def test_hash_is_not_plaintext_and_verifies():
    h = hash_password("s3cret-pw")
    assert "s3cret-pw" not in h and h.startswith("scrypt$")
    assert verify_password("s3cret-pw", h)


def test_wrong_password_fails():
    assert not verify_password("battery staple", hash_password("correct horse"))


def test_tampered_empty_and_oauth_only_hash_fail():
    h = hash_password("pw")
    assert not verify_password("pw", h[:-4] + "AAAA")   # tampered derived key
    assert not verify_password("", h)
    assert not verify_password("pw", None)              # OAuth-only account: no password_hash
    assert not verify_password("pw", "garbage$1$2")


def test_distinct_salts_per_hash():
    assert hash_password("same") != hash_password("same")   # random per-hash salt
