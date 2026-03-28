from analyzer import (
    analyze_reference,
    detect_player_onsets,
    detect_chords,
    summarize_chords
)
from compare import classify_timing, summarize_performance

print("Testing drums.wav...")
reference = analyze_reference("samples/drums.wav")
print(reference)

print("\n" + "-" * 40 + "\n")

print("Testing player.wav...")
player = detect_player_onsets("samples/player.wav")
print(player)

print("\n" + "-" * 40 + "\n")

print("Comparing player timing to reference beats...")
comparison = classify_timing(player, reference["beat_times"])
print(comparison)

print("\n" + "-" * 40 + "\n")

print("Performance summary...")
summary = summarize_performance(comparison)
print(summary)

print("\n" + "-" * 40 + "\n")

print("Detecting chords from player.wav...")
chords = detect_chords("samples/player.wav")
print(chords[:15])

print("\n" + "-" * 40 + "\n")

print("Chord summary...")
chord_summary = summarize_chords(chords)
print(chord_summary)