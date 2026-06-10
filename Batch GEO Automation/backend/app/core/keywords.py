import random


def generate_keyword_titles(services, geo_modifiers, landmarks,
                             business_name, count, seed=None):
    combos = []
    for s in services:
        for g in geo_modifiers:
            combos.append(f"{s} {g}")
        for lm in landmarks:
            # use the first geo_modifier as the city anchor
            anchor = geo_modifiers[0] if geo_modifiers else ""
            combos.append(f"{s} near {lm} {anchor}".strip())
    seen, unique = set(), []
    for c in combos:
        norm = " ".join(c.split())
        if norm not in seen:
            seen.add(norm)
            unique.append(norm)
    rng = random.Random(seed)
    rng.shuffle(unique)
    chosen = list(unique)
    # Pool exhausted — cycle through unique titles with a numeric suffix to avoid duplicates
    repeat_counter: dict[str, int] = {}
    while len(chosen) < count:
        base = unique[len(chosen) % len(unique)]
        repeat_counter[base] = repeat_counter.get(base, 1) + 1
        chosen.append(f"{base} {repeat_counter[base]}")
    chosen = chosen[:count]
    return [f"{t} {business_name}".strip() for t in chosen]
