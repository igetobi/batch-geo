from app.core.keywords import generate_keyword_titles


def test_generates_exact_count():
    titles = generate_keyword_titles(
        services=["cabinet refacing", "custom kitchen cabinets"],
        geo_modifiers=["Sterling Heights", "Sterling Heights MI"],
        landmarks=["Dodge Park", "Lakeside Mall"],
        business_name="My Quality Construction",
        count=50, seed=1,
    )
    assert len(titles) == 50


def test_titles_end_with_business_name():
    titles = generate_keyword_titles(
        services=["cabinet refacing"], geo_modifiers=["Sterling Heights"],
        landmarks=[], business_name="My Quality Construction", count=10, seed=1,
    )
    assert all(t.endswith("My Quality Construction") for t in titles)


def test_landmark_phrases_appear():
    titles = generate_keyword_titles(
        services=["cabinet refacing"], geo_modifiers=["Sterling Heights"],
        landmarks=["Dodge Park"], business_name="X", count=20, seed=1,
    )
    assert any("near Dodge Park" in t for t in titles)


def test_deterministic_with_seed():
    kw = dict(services=["a", "b"], geo_modifiers=["X"], landmarks=["L"],
              business_name="Biz", count=15, seed=42)
    assert generate_keyword_titles(**kw) == generate_keyword_titles(**kw)


def test_unique_until_pool_exhausted():
    # 1 service x 1 modifier x 0 landmarks = 1 unique combo; asking for 5 -> repeats allowed
    titles = generate_keyword_titles(
        services=["s"], geo_modifiers=["m"], landmarks=[],
        business_name="B", count=5, seed=1,
    )
    assert len(titles) == 5
