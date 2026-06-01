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
    while len(chosen) < count:                  # pool exhausted -> allow repeats
        chosen.append(rng.choice(unique))
    chosen = chosen[:count]
    return [f"{t} {business_name}".strip() for t in chosen]
