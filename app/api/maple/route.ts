const API_KEY = process.env.NEXON_API_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const characterName = searchParams.get("name");

  if (!characterName) {
    return Response.json({
      error: "캐릭터명이 없음",
    });
  }

  try {
    // 1. OCID 조회
    const ocidRes = await fetch(
      `https://open.api.nexon.com/maplestory/v1/id?character_name=${encodeURIComponent(characterName)}`,
      {
        headers: {
          "x-nxopen-api-key": API_KEY,
        },
      }
    );

    const ocidData = await ocidRes.json();

    if (!ocidData.ocid) {
      return Response.json({
        error: "캐릭터를 찾을 수 없음",
      });
    }

    // 2. 기본 정보 조회
    const infoRes = await fetch(
      `https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocidData.ocid}`,
      {
        headers: {
          "x-nxopen-api-key": API_KEY,
        },
      }
    );

    const infoData = await infoRes.json();

    return Response.json({
      name: infoData.character_name,
      level: infoData.character_level,
      job: infoData.character_class,
      world: infoData.world_name,
    });
  } catch (err) {
    return Response.json({
      error: "서버 오류",
    });
  }
}
