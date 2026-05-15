import { NextRequest, NextResponse } from "next/server";
import { getServerSession } from "next-auth";
import { authOptions } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

interface PlaceResult {
  id: string;
  displayName?: { text: string };
  internationalPhoneNumber?: string;
  websiteUri?: string;
  rating?: number;
  userRatingCount?: number;
  formattedAddress?: string;
}

interface PlacesResponse {
  places?: PlaceResult[];
  error?: { message: string };
}

export async function POST(req: NextRequest) {
  try {
    const session = await getServerSession(authOptions);
    if (!session) return NextResponse.json({ erro: "Não autorizado" }, { status: 401 });

    const body = (await req.json()) as { cidade?: string; nicho?: string };
    const { cidade, nicho } = body;
    if (!cidade?.trim() || !nicho?.trim()) {
      return NextResponse.json({ erro: "Cidade e nicho são obrigatórios" }, { status: 400 });
    }

    const config = await prisma.configuracaoPlataforma.findFirst();
    if (!config?.googlePlacesApiKey) {
      return NextResponse.json({ erro: "API Key do Google Places não configurada" }, { status: 503 });
    }

    const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
      method: "POST",
      headers: {
        "X-Goog-Api-Key": config.googlePlacesApiKey,
        "X-Goog-FieldMask": "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        textQuery: `${nicho.trim()} em ${cidade.trim()}`,
        languageCode: "pt-BR",
        maxResultCount: 20,
      }),
    });

    const data = (await res.json()) as PlacesResponse;
    if (data.error) {
      return NextResponse.json({ erro: data.error.message }, { status: 400 });
    }

    const places = data.places ?? [];
    let novos = 0;

    for (const place of places) {
      if (!place.id || !place.displayName?.text) continue;
      try {
        await prisma.prospeccaoGmn.upsert({
          where: { usuarioId_placeId: { usuarioId: session.user.id, placeId: place.id } },
          create: {
            usuarioId: session.user.id,
            placeId: place.id,
            cidade: cidade.trim(),
            nicho: nicho.trim(),
            nome: place.displayName.text,
            telefone: place.internationalPhoneNumber ?? null,
            site: place.websiteUri ?? null,
            endereco: place.formattedAddress ?? null,
            avaliacao: place.rating ?? null,
            qtdAvaliacoes: place.userRatingCount ?? null,
          },
          update: {},
        });
        novos++;
      } catch {
        // já existe, ignora
      }
    }

    // Salva no histórico de pesquisa
    await prisma.historicoPesquisaGmn.create({
      data: { usuarioId: session.user.id, cidade: cidade.trim(), nicho: nicho.trim() },
    });

    return NextResponse.json({ total: places.length, novos });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
