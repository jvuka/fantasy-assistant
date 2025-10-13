// Unit tests for YahooStatsService
// These tests verify that the stats parsing logic works correctly

export class YahooStatsServiceTests {
  static runTests(): void {
    console.log('Running YahooStatsService unit tests...');

    this.testParsePlayerInfo();
    this.testParsePlayerStats();
    this.testParseRosterWithStats();

    console.log('All YahooStatsService unit tests passed!');
  }

  static testParsePlayerInfo(): void {
    const service = yahooStatsService;
    const mockPlayerData = [
      { name: { full: 'Alex Ovechkin' } },
      { display_position: 'LW' },
      { editorial_team_abbr: 'WSH' },
      { player_key: '123.p.456' }
    ];

    const result = service.parsePlayerInfo(mockPlayerData);

    console.assert(result.name === 'Alex Ovechkin', `Expected name 'Alex Ovechkin', got '${result.name}'`);
    console.assert(result.position === 'LW', `Expected position 'LW', got '${result.position}'`);
    console.assert(result.nhl_team === 'WSH', `Expected team 'WSH', got '${result.nhl_team}'`);
    console.assert(result.player_key === '123.p.456', `Expected key '123.p.456', got '${result.player_key}'`);
    console.assert(result.is_goalie === false, `Expected is_goalie false, got ${result.is_goalie}`);
  }

  static testParsePlayerStats(): void {
    const service = yahooStatsService;
    const mockPlayerStats = {
      stats: [
        { stat: { stat_id: '2', value: '25' } }, // Goals
        { stat: { stat_id: '3', value: '15' } }, // Assists
        { stat: { stat_id: '4', value: '12.5' } }, // Points
        { stat: { stat_id: '22', value: '3' } }, // Wins (goalie)
        { stat: { stat_id: '23', value: '2.45' } } // GAA (goalie)
      ]
    };

    const result = service.parsePlayerStats(mockPlayerStats);

    console.assert(result.goals === 25, `Expected goals 25, got ${result.goals}`);
    console.assert(result.assists === 15, `Expected assists 15, got ${result.assists}`);
    console.assert(result.points === 12.5, `Expected points 12.5, got ${result.points}`);
    console.assert(result.wins === 3, `Expected wins 3, got ${result.wins}`);
    console.assert(result.gaa === 2.45, `Expected gaa 2.45, got ${result.gaa}`);
  }

  static testParseRosterWithStats(): void {
    const service = yahooStatsService;
    const playerKeys = ['123.p.456'];
    const playerPositions = new Map([['123.p.456', 'LW']]);

    const mockStatsData = {
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

    const result = service.parseRosterWithStats(playerKeys, playerPositions, mockStatsData);

    console.assert(result.length === 1, `Expected 1 player, got ${result.length}`);
    console.assert(result[0].name === 'Alex Ovechkin', `Expected name 'Alex Ovechkin', got '${result[0].name}'`);
    console.assert(result[0].stats.goals === 25, `Expected goals 25, got ${result[0].stats.goals}`);
    console.assert(result[0].stats.assists === 15, `Expected assists 15, got ${result[0].stats.assists}`);
    console.assert(result[0].selected_position === 'LW', `Expected position 'LW', got '${result[0].selected_position}'`);
    console.assert(result[0].is_benched === false, `Expected is_benched false, got ${result[0].is_benched}`);
  }
}

// Export singleton instance
export const yahooStatsService = new YahooStatsService();

// Export test runner
export const runStatsServiceTests = () => YahooStatsServiceTests.runTests();