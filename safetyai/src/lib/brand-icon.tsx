import { readFile } from "node:fs/promises";
import { join } from "node:path";
import { ImageResponse } from "next/og";

export async function renderBrandIcon(dimension: number, roundCorners = true) {
  const logo = await readFile(
    join(process.cwd(), "public", "brand", "safetyai-mark-v1.png"),
  );
  const artworkSize = Math.round(dimension * 0.90625);

  return new ImageResponse(
    <div
      style={{
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        width: "100%",
        height: "100%",
        borderRadius: roundCorners ? Math.round(dimension * 0.21875) : 0,
        background: "#13253b",
      }}
    >
      <img
        src={`data:image/png;base64,${logo.toString("base64")}`}
        alt=""
        width={artworkSize}
        height={artworkSize}
      />
    </div>,
    { width: dimension, height: dimension },
  );
}
