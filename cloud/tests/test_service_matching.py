# cloud/tests/test_service_matching.py
from service.matching import best_match, is_contactable, match_experts
from service.models import Expert


def _exp(name, **kw):
    base = dict(email=f"{name}@x.com", specialty="neurosurgery",
                phone_e164="+10000000000", contact_opt_in=True)
    base.update(kw)
    return Expert(name=name, **base)


def test_opted_out_and_no_phone_are_excluded():
    optout = _exp("a", contact_opt_in=False)
    nophone = _exp("b", phone_e164="")
    ok = _exp("c")
    assert [e.email for e in match_experts([optout, nophone, ok])] == ["c@x.com"]
    assert not is_contactable(optout) and not is_contactable(nophone) and is_contactable(ok)


def test_specialty_filter_is_case_insensitive():
    neuro = _exp("n", specialty="Neurosurgery")
    gen = _exp("g", specialty="general surgery")
    assert [e.email for e in match_experts([neuro, gen], needed_specialty="neurosurgery")] == ["n@x.com"]


def test_on_call_is_ranked_first():
    a = _exp("a", on_call=False); a.id = 1
    b = _exp("b", on_call=True); b.id = 2
    assert match_experts([a, b])[0].email == "b@x.com"


def test_region_breaks_tie_when_on_call_equal():
    a = _exp("a", region="north"); a.id = 1
    b = _exp("b", region="gilgit"); b.id = 2
    assert match_experts([a, b], region="Gilgit")[0].email == "b@x.com"


def test_no_contactable_returns_empty_and_best_match_none():
    assert match_experts([_exp("a", contact_opt_in=False)]) == []
    assert best_match([]) is None
