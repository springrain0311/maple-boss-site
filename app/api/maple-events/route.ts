const API_KEY = process.env.NEXON_API_KEY!;

export async function GET() {
  try {
    const res = await fetch(
      "https://open.api.nexon.com/maplestory/v1/notice-event",
      {
        headers: {
          "x-nxopen-api-key": API_KEY,
        },
        cache: "no-store",
      }
    );

    const data = await res.json();

    if (!res.ok) {
      return Response.json(
        {
          error: "메이플 이벤트 조회 실패",
          status: res.status,
          nexonResponse: data,
        },
        { status: 500 }
      );
    }

    return Response.json(data);
  } catch (error) {
    return Response.json(
      {
        error: "서버 오류",
        detail: error instanceof Error ? error.message : String(error),
      },
      { status: 500 }
    );
  }
}
