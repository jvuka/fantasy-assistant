import { NextRequest, NextResponse } from 'next/server';
import { yahooStatsService } from '../../../../lib/yahoo/stats-service';

export async function GET(req: NextRequest) {
  try {
    // Test what our service expects vs what it might be getting
    // This will help identify why stats are showing as 0

    console.log('Testing data structure expectations...');

    // Test 1: What our service expects for stats data
    const expectedStatsData = {
      fantasy_content: {
        players: {
          '0': {
            player: [
              [
                { name: { full: 'Alex Ovechkin' } },
                { display_position: 'LW' },
                { editorial_team_abbr: 'WSH' },
                { player_key: '123.p.456' }
              ],
              {
                player_stats: {
                  stats: [
                    { stat: { stat_id: '2', value: '25' } }, // Goals
                    { stat: { stat_id: '3', value: '15' } }  // Assists
                  ]
                }
              }
            ]
          }
        }
      }
    };

    const playerKeys = ['123.p.456'];
    const playerPositions = new Map([['123.p.456', 'LW']]);

    console.log('Expected data structure:', JSON.stringify(expectedStatsData, null, 2));

    const result = yahooStatsService.parseRosterWithStats(playerKeys, playerPositions, expectedStatsData as any);

    console.log('Parsed result:', result);

    // Test 2: What if the data structure is different?
    const alternativeStatsData = {
      fantasy_content: {
        players: {
          '0': {
            player: [
              { name: { full: 'Alex Ovechkin' } },
              { display_position: 'LW' },
              { editorial_team_abbr: 'WSH' },
              { player_key: '123.p.456' },
              {
                player_stats: {
                  stats: [
                    { stat: { stat_id: '2', value: '25' } },
                    { stat: { stat_id: '3', value: '15' } }
                  ]
                }
              }
            ]
          }
        }
      }
    };

    console.log('Alternative data structure:', JSON.stringify(alternativeStatsData, null, 2));

    try {
      const altResult = yahooStatsService.parseRosterWithStats(playerKeys, playerPositions, alternativeStatsData as any);
      console.log('Alternative parsed result:', altResult);
    } catch (error) {
      console.log('Alternative structure failed:', error);
    }

    return NextResponse.json({
      success: true,
      message: 'Data structure test completed',
      expectedStructure: {
        path: 'fantasy_content.players[N].player[0] = info array, player[1].player_stats = stats',
        sample: expectedStatsData
      },
      alternativeStructure: {
        path: 'fantasy_content.players[N].player = flat array with stats at end',
        sample: alternativeStatsData
      },
      parsedResult: result
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
      stack: error instanceof Error ? error.stack : undefined
    }, { status: 500 });
  }
}