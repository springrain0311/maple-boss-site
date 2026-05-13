const API_KEY = process.env.NEXON_API_KEY!;

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const characterName = searchParams.get("name")?.trim();

  if (!characterName) {
    return Response.json({
      error: "캐릭터명이 없음",
    });
  }

  try {
    const ocidRes = await fetch(
      `https://open.api.nexon.com/maplestory/v1/id?character_name=${encodeURIComponent(
        characterName
      )}`,
      {
        headers: {
          "x-nxopen-api-key": API_KEY,
        },
      }
    );

    const ocidData = await ocidRes.json();

    if (!ocidRes.ok || !ocidData.ocid) {
      return Response.json({
        error: "캐릭터를 찾을 수 없음",
        characterName,
        status: ocidRes.status,
        nexonResponse: ocidData,
      });
    }

    const infoRes = await fetch(
      `https://open.api.nexon.com/maplestory/v1/character/basic?ocid=${ocidData.ocid}`,
      {
        headers: {
          "x-nxopen-api-key": API_KEY,
        },
      }
    );

    const infoData = await infoRes.json();

    if (!infoRes.ok) {
      return Response.json({
        error: "캐릭터 기본정보 조회 실패",
        characterName,
        status: infoRes.status,
        nexonResponse: infoData,
      });
    }

    return Response.json({
      name: infoData.character_name,
      level: infoData.character_level,
      job: infoData.character_class,
      world: infoData.world_name,
      character_image: infoData.character_image,
    });
  } catch (err) {
    return Response.json({
      error: "서버 오류",
      detail: err instanceof Error ? err.message : String(err),
    });
  }
}
