"""Convert paired chroma-key race sheets into transparent male/female WebP assets."""

from __future__ import annotations

import argparse
from pathlib import Path

from PIL import Image


def non_empty_alpha(image: Image.Image) -> bool:
    alpha = image.getchannel("A")
    return alpha.getbbox() is not None


def remove_small_alpha_components(image: Image.Image, minimum_ratio: float) -> Image.Image:
    alpha = image.getchannel("A")
    width, height = alpha.size
    pixels = alpha.load()
    visited = bytearray(width * height)
    components: list[list[int]] = []

    for start in range(width * height):
        if visited[start] or pixels[start % width, start // width] <= 8:
            continue
        visited[start] = 1
        stack = [start]
        component: list[int] = []
        while stack:
            index = stack.pop()
            component.append(index)
            x, y = index % width, index // width
            for neighbor_x, neighbor_y in (
                (x - 1, y), (x + 1, y), (x, y - 1), (x, y + 1)
            ):
                if not (0 <= neighbor_x < width and 0 <= neighbor_y < height):
                    continue
                neighbor = neighbor_y * width + neighbor_x
                if visited[neighbor] or pixels[neighbor_x, neighbor_y] <= 8:
                    continue
                visited[neighbor] = 1
                stack.append(neighbor)
        components.append(component)

    if not components:
        return image
    largest = max(len(component) for component in components)
    keep_at_least = largest * minimum_ratio
    for component in components:
        if len(component) >= keep_at_least:
            continue
        for index in component:
            pixels[index % width, index // width] = 0
    image.putalpha(alpha)
    return image


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--input", required=True, type=Path)
    parser.add_argument("--race-id", required=True)
    parser.add_argument("--out-dir", required=True, type=Path)
    parser.add_argument("--scale", type=float, default=1.0)
    parser.add_argument("--opacity", type=float, default=1.0)
    parser.add_argument("--remove-small-components", type=float, default=0.0)
    args = parser.parse_args()

    image = Image.open(args.input).convert("RGBA")
    width, height = image.size
    split = width // 2
    if (
        split < 1
        or not 0.1 <= args.scale <= 1.0
        or not 0.1 <= args.opacity <= 1.0
        or not 0.0 <= args.remove_small_components <= 0.5
    ):
        raise ValueError("invalid sheet width, scale, or opacity")

    args.out_dir.mkdir(parents=True, exist_ok=True)
    halves = {
        "male": image.crop((0, 0, split, height)),
        "female": image.crop((split, 0, width, height)),
    }
    for gender, half in halves.items():
        if args.remove_small_components:
            half = remove_small_alpha_components(
                half, args.remove_small_components
            )
        if not non_empty_alpha(half):
            raise ValueError(f"empty {gender} half for {args.race_id}")
        bounds = half.getchannel("A").getbbox()
        assert bounds is not None
        subject = half.crop(bounds)
        if args.opacity < 1.0:
            alpha = subject.getchannel("A").point(
                lambda value: round(value * args.opacity)
            )
            subject.putalpha(alpha)
        max_size = (round(720 * args.scale), round(960 * args.scale))
        subject.thumbnail(max_size, Image.Resampling.LANCZOS)
        half = Image.new("RGBA", (768, 1024), (0, 0, 0, 0))
        position = ((768 - subject.width) // 2, (1024 - subject.height) // 2)
        half.alpha_composite(subject, position)
        output = args.out_dir / f"race-{args.race_id}-{gender}.webp"
        half.save(output, "WEBP", lossless=True, method=6)
        print(output)


if __name__ == "__main__":
    main()
