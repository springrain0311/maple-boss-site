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
      return row;
    }

    try {
      const mapleRes = await fetch(
        `${process.env.NEXT_PUBLIC_SITE_URL}/api/maple?name=${encodeURIComponent(
          row.nickname
        )}`
      );

      const mapleData = await mapleRes.json();

      return {
        ...row,
        character_image: mapleData.character_image || "",
      };
    } catch {
      return row;
    }
  })
);
