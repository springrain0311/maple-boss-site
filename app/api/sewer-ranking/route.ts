export async function GET() {
  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;
  const siteUrl =
    process.env.NEXT_PUBLIC_SITE_URL1 || process.env.NEXT_PUBLIC_SITE_URL;

  if (!csvUrl) {
    return Response.json(
      { error: "GOOGLE_SHEET_CSV_URL 없음" },
      { status: 500 }
    );
  }

  if (!siteUrl) {
    return Response.json(
      { error: "SITE_URL 없음" },
      { status: 500 }
    );
  }

  try {
    const res = await fetch(csvUrl, {
      cache: "no-store",
    });

    const text = await res.text();

    const parsedRows = text
      .trim()
      .split("\n")
      .slice(1)
      .map((line) => {
        const [rank, nickname, score] = line.split(",");

        return {
          rank: Number(rank),
          nickname: nickname?.trim(),
          score: Number(score),
        };
      })
      .filter((row) => row.rank && row.nickname && row.score);

    const rows = await Promise.all(
      parsedRows.map(async (row) => {
        if (row.rank > 3) {
          return {
            ...row,
            character_image: "",
          };
        }

        try {
          const mapleRes = await fetch(
            `${siteUrl}/api/maple?name=${encodeURIComponent(row.nickname)}`
          );

          const mapleData = await mapleRes.json();

          return {
            ...row,
            character_image: mapleData.character_image || "",
          };
        } catch {
          return {
            ...row,
            character_image: "",
          };
        }
      })
    );

    return Response.json(rows);
  } catch (error) {
    return Response.json(
      {
        error: "수로 랭킹 불러오기 실패",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
