#!/usr/bin/env python3
"""Pre-warm FastF1 cache with recent race data."""
import fastf1
import os

cache_dir = '/opt/f1-mcp-server/cache'
os.makedirs(cache_dir, exist_ok=True)
fastf1.Cache.enable_cache(cache_dir)

races = [
    (2024, 'Monaco', 'R'),
    (2024, 'Silverstone', 'R'),
    (2024, 'Monza', 'R'),
    (2026, 'Australia', 'R'),
    (2026, 'China', 'R'),
    (2026, 'Japan', 'R'),
    (2026, 'Miami', 'R'),
    (2026, 'Canada', 'R'),
]

for year, gp, session in races:
    try:
        s = fastf1.get_session(year, gp, session)
        s.load(telemetry=False, weather=False, messages=False)
        print(f'Warmed {year} {gp} Race')
    except Exception as e:
        print(f'Skipped {year} {gp}: {e}')
