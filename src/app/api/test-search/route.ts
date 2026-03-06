import { NextRequest, NextResponse } from "next/server";
import { SearchClient, HeaderUtils, Config } from "coze-coding-dev-sdk";

export async function POST(request: NextRequest) {
  try {
    const customHeaders = HeaderUtils.extractForwardHeaders(request.headers);
    const { stockName, stockCode } = await request.json();

    const searchConfig = new Config();
    // @ts-ignore
    const searchClient = new SearchClient(searchConfig, customHeaders as any);

    const searchQuery = `${stockName} ${stockCode} 实时价格 最新价`;
    const response = await searchClient.webSearch(searchQuery, 3, false);

    return NextResponse.json({
      query: searchQuery,
      results: response,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: error.message },
      { status: 500 }
    );
  }
}
