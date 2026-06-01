import random


def jitter_coordinates(bbox, count, seed=None):
    rng = random.Random(seed)
    pts = []
    for _ in range(count):
        lat = round(rng.uniform(bbox.min_lat, bbox.max_lat), 8)
        lon = round(rng.uniform(bbox.min_lon, bbox.max_lon), 8)
        pts.append((lat, lon))
    return pts
