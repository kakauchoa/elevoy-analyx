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
  nextPageToken?: string;
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

    const cidadeT = cidade.trim();
    const nichoT = nicho.trim();
    const textQuery = `${nichoT} em ${cidadeT}`;

    // Pagina até esgotar todos os resultados (máx. 3 páginas = 60 resultados)
    const allPlaces: PlaceResult[] = [];
    let nextPageToken: string | undefined = undefined;

    do {
      const bodyReq: Record<string, unknown> = {
        textQuery,
        languageCode: "pt-BR",
        maxResultCount: 20,
      };
      if (nextPageToken) bodyReq.pageToken = nextPageToken;

      const res = await fetch("https://places.googleapis.com/v1/places:searchText", {
        method: "POST",
        headers: {
          "X-Goog-Api-Key": config.googlePlacesApiKey,
          "X-Goog-FieldMask":
            "places.id,places.displayName,places.formattedAddress,places.internationalPhoneNumber,places.websiteUri,places.rating,places.userRatingCount,nextPageToken",
          "Content-Type": "application/json",
        },
        body: JSON.stringify(bodyReq),
      });

      const data = (await res.json()) as PlacesResponse;
      if (data.error) {
        if (allPlaces.length === 0) {
          return NextResponse.json({ erro: data.error.message }, { status: 400 });
        }
        break;
      }

      allPlaces.push(...(data.places ?? []));
      nextPageToken = data.nextPageToken;
    } while (nextPageToken);

    // Conta antes para calcular novos inseridos
    const antes = await prisma.prospeccaoGmn.count({
      where: { usuarioId: session.user.id, cidade: cidadeT, nicho: nichoT },
    });

    for (const place of allPlaces) {
      if (!place.id || !place.displayName?.text) continue;
      await prisma.prospeccaoGmn.upsert({
        where: { usuarioId_placeId: { usuarioId: session.user.id, placeId: place.id } },
        create: {
          usuarioId: session.user.id,
          placeId: place.id,
          cidade: cidadeT,
          nicho: nichoT,
          nome: place.displayName.text,
          telefone: place.internationalPhoneNumber ?? null,
          site: place.websiteUri ?? null,
          endereco: place.formattedAddress ?? null,
          avaliacao: place.rating ?? null,
          qtdAvaliacoes: place.userRatingCount ?? null,
        },
        update: {},
      });
    }

    const depois = await prisma.prospeccaoGmn.count({
      where: { usuarioId: session.user.id, cidade: cidadeT, nicho: nichoT },
    });
    const novos = depois - antes;

    await prisma.historicoPesquisaGmn.create({
      data: { usuarioId: session.user.id, cidade: cidadeT, nicho: nichoT },
    });

    return NextResponse.json({ total: allPlaces.length, novos });
  } catch {
    return NextResponse.json({ erro: "Erro interno do servidor" }, { status: 500 });
  }
}
