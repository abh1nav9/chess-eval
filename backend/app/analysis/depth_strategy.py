"""Two-pass depth resolution from eval swing (analysis.md §1.2)."""


def resolve_depth_from_swing(
    ply: int,
    eval_swing_cp: int,
    base_depth: int,
    max_depth: int,
) -> int:
    """Larger swing → deeper search; quiet early opening → shallower."""
    if eval_swing_cp >= 300:
        return min(base_depth + 6, max_depth)
    if eval_swing_cp >= 150:
        return min(base_depth + 2, max_depth)
    if ply < 10:
        return max(base_depth - 4, 12)
    return base_depth
