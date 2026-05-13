export async function GET() {
  const csvUrl = process.env.GOOGLE_SHEET_CSV_URL;

  if (!csvUrl) {
    return Response.json({ error: "GOOGLE_SHEET_CSV_URL 없음" }, { status: 500 });
  }

  try {
    const res = await fetch(csvUrl, {
      cache: "no-store",
    });

    const text = await res.text();

    const rows = text
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

    return Response.json(rows);
  } catch (error) {
    return Response.json(
      { error: "수로 랭킹 불러오기 실패" },
      { status: 500 }
    );
  }
}
