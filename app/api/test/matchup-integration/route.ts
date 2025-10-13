import { NextRequest, NextResponse } from 'next/server';

export async function GET(req: NextRequest) {
  try {
    // Test that the matchup API can be imported and called without errors
    // This tests the integration between the matchup API and the stats service

    // Import the matchup API handler dynamically to test it
    const { GET: matchupHandler } = await import('../../yahoo/matchup/[team_key]/route');

    // Create a mock request for a matchup endpoint
    // We'll use a fake team_key that should fail gracefully (authentication error)
    // but should not have import/compilation errors
    const mockUrl = new URL('https://test.com/api/yahoo/matchup/123.t.456');
    const mockRequest = new NextRequest(mockUrl);

    // Call the matchup handler - it should fail with auth error, not import error
    const response = await matchupHandler(mockRequest, { params: { team_key: '123.t.456' } });

    // Check that we got a response (even if it's an error response)
    if (response) {
      return NextResponse.json({
        success: true,
        message: 'Matchup API integration test passed - no import/compilation errors',
        responseStatus: response.status,
        responseType: 'Expected auth error (401) or similar'
      });
    } else {
      return NextResponse.json({
        success: false,
        message: 'Matchup API returned no response'
      }, { status: 500 });
    }

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Matchup API integration test failed',
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}