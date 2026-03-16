import { NextResponse } from "next/server";

type DiscordPayload = {
  title: string;
  description: string;
  url?: string;
};

export async function POST(req: Request) {
  try {
    const webhookUrl = process.env.DISCORD_WEBHOOK_URL;

    console.log("DISCORD_WEBHOOK_URL exists:", !!webhookUrl);

    if (!webhookUrl) {
      return NextResponse.json(
        { error: "DISCORD_WEBHOOK_URL is missing" },
        { status: 500 }
      );
    }

    const body = (await req.json()) as DiscordPayload;

    const discordRes = await fetch(webhookUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        embeds: [
          {
            title: body.title,
            description: body.description,
            url: body.url,
          },
        ],
      }),
    });

    const discordText = await discordRes.text();
    console.log("discord status:", discordRes.status);
    console.log("discord response text:", discordText);

    if (!discordRes.ok) {
      return NextResponse.json(
        {
          error: "Discord webhook failed",
          status: discordRes.status,
          detail: discordText,
        },
        { status: 500 }
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("discord route unexpected error:", error);
    return NextResponse.json(
      {
        error: error instanceof Error ? error.message : "Unexpected server error",
      },
      { status: 500 }
    );
  }
}