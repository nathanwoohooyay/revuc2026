def classify_timing(player_onsets, beat_times, tolerance_ms=80):
    results = []

    if not beat_times:
        return {"error": "No beat times detected in reference audio."}

    if not player_onsets:
        return {"error": "No player onsets detected."}

    for onset in player_onsets:
        nearest_beat = min(beat_times, key=lambda b: abs(b - onset))
        offset_sec = onset - nearest_beat
        offset_ms = offset_sec * 1000

        if abs(offset_ms) <= tolerance_ms:
            status = "on-time"
        elif offset_ms < 0:
            status = "ahead"
        else:
            status = "behind"

        results.append({
            "player_onset": round(onset, 4),
            "nearest_beat": round(nearest_beat, 4),
            "offset_ms": round(offset_ms, 2),
            "status": status
        })

    return results


def summarize_performance(comparison_results):
    if isinstance(comparison_results, dict) and "error" in comparison_results:
        return comparison_results

    if not comparison_results:
        return {"summary": "No comparison results available."}

    offsets = [item["offset_ms"] for item in comparison_results]
    avg_offset = sum(offsets) / len(offsets)

    on_time_count = sum(1 for item in comparison_results if item["status"] == "on-time")
    ahead_count = sum(1 for item in comparison_results if item["status"] == "ahead")
    behind_count = sum(1 for item in comparison_results if item["status"] == "behind")

    if avg_offset > 80:
        overall = "mostly behind"
    elif avg_offset < -80:
        overall = "mostly ahead"
    else:
        overall = "mostly on-time"

    return {
        "average_offset_ms": round(avg_offset, 2),
        "overall_status": overall,
        "counts": {
            "on_time": on_time_count,
            "ahead": ahead_count,
            "behind": behind_count
        }
    }