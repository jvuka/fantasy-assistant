// Shared service for fetching and parsing Yahoo Fantasy Sports player statistics
// This service centralizes stats logic to avoid duplication between roster and matchup APIs

export interface PlayerStats {
  goals: number;
  assists: number;
  points: number;
  ppp: number;
  hits: number;
  plus_minus: number;
  wins: number;
  gaa: number;
  sv_pct: number;
}

export interface PlayerInfo {
  name: string;
  position: string;
  nhl_team: string;
  player_key: string;
  is_goalie: boolean;
}

export interface RosterPlayer extends PlayerInfo {
  stats: PlayerStats;
  selected_position: string;
  is_benched: boolean;
}

export interface YahooPlayerData {
  player: any[]; // Raw Yahoo API player data structure
}

export interface YahooStatsData {
  fantasy_content: {
    players?: {
      [key: string]: YahooPlayerData;
    } & {
      count?: number;
    };
  };
}

export class YahooStatsService {
  private readonly baseUrl = 'https://fantasysports.yahooapis.com/fantasy/v2';

  /**
   * Fetch player statistics for given player keys
   * @param playerKeys Array of Yahoo player keys
   * @param accessToken OAuth access token
   * @param week Optional week number for weekly stats, null for season stats
   * @returns Promise resolving to raw Yahoo stats data
   */
  async fetchPlayerStats(
    playerKeys: string[],
    accessToken: string,
    week?: number
  ): Promise<YahooStatsData> {
    if (playerKeys.length === 0) {
      throw new Error('No player keys provided');
    }

    const playerKeysStr = playerKeys.join(',');
    let statsUrl: string;

    if (week) {
      statsUrl = `${this.baseUrl}/players;player_keys=${playerKeysStr}/stats;type=week;week=${week}?format=json`;
    } else {
      const currentYear = new Date().getFullYear();
      const currentMonth = new Date().getMonth();
      // NHL season starts in October (month 9)
      const season = currentMonth >= 9 ? currentYear : currentYear - 1;
      statsUrl = `${this.baseUrl}/players;player_keys=${playerKeysStr}/stats;type=season;season=${season}?format=json`;
    }

    const response = await fetch(statsUrl, {
      headers: {
        'Authorization': `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch player stats: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();

    if (!data?.fantasy_content?.players) {
      throw new Error('Invalid stats response: missing fantasy_content.players');
    }

    return data;
  }

  /**
   * Parse raw Yahoo player data into structured player information
   * @param playerData Raw Yahoo player data array
   * @returns Parsed player info
   */
  parsePlayerInfo(playerData: any[]): PlayerInfo {
    let name = 'Unknown';
    let position = 'Unknown';
    let nhl_team = 'Unknown';
    let player_key = '';

    // playerData is an array of objects, find the relevant ones
    for (const obj of playerData) {
      if (obj.name) name = obj.name.full || 'Unknown';
      if (obj.display_position) position = obj.display_position;
      if (obj.editorial_team_abbr) nhl_team = obj.editorial_team_abbr;
      if (obj.player_key) player_key = obj.player_key;
    }

    const is_goalie = position === 'G';

    return {
      name,
      position,
      nhl_team,
      player_key,
      is_goalie,
    };
  }

  /**
   * Parse raw Yahoo stats data into structured PlayerStats
   * @param playerStats Raw Yahoo player stats object
   * @returns Parsed player statistics
   */
  parsePlayerStats(playerStats: any): PlayerStats {
    const stats: PlayerStats = {
      goals: 0,
      assists: 0,
      points: 0,
      ppp: 0,
      hits: 0,
      plus_minus: 0,
      wins: 0,
      gaa: 0,
      sv_pct: 0,
    };

    if (playerStats && playerStats.stats) {
      for (const stat of playerStats.stats) {
        const statId = stat.stat.stat_id;
        const value = stat.stat.value;

        // Player stats
        if (statId === '2') stats.goals = parseInt(value) || 0; // Goals
        else if (statId === '3') stats.assists = parseInt(value) || 0; // Assists
        else if (statId === '4') stats.points = parseFloat(value) || 0; // Fantasy Points
        else if (statId === '13') stats.ppp = parseInt(value) || 0; // Power Play Points
        else if (statId === '31') stats.hits = parseInt(value) || 0; // Hits
        else if (statId === '28') stats.plus_minus = parseInt(value) || 0; // Plus/Minus

        // Goalie stats
        else if (statId === '22') stats.wins = parseInt(value) || 0; // Wins
        else if (statId === '23') stats.gaa = parseFloat(value) || 0; // Goals Against Average
        else if (statId === '24') stats.sv_pct = parseFloat(value) || 0; // Save Percentage
      }
    }

    return stats;
  }

  /**
   * Parse complete roster data for a team
   * @param playerKeys Array of player keys on the roster
   * @param playerPositions Map of player key to selected position
   * @param statsData Raw Yahoo stats data
   * @returns Array of roster players with stats
   */
  parseRosterWithStats(
    playerKeys: string[],
    playerPositions: Map<string, string>,
    statsData: YahooStatsData
  ): RosterPlayer[] {
    const players = statsData.fantasy_content.players;
    const result: RosterPlayer[] = [];

    if (!players) {
      return result;
    }

    for (const key of Object.keys(players).filter(key => key !== 'count')) {
      const playerData = players[key];
      const playerInfoArray = playerData?.player?.[0];
      const playerStats = playerData?.player?.[1]?.player_stats;

      if (playerInfoArray) {
        const playerInfo = this.parsePlayerInfo(playerInfoArray);
        const stats = this.parsePlayerStats(playerStats);

        const selected_position = playerPositions.get(playerInfo.player_key) || 'Unknown';
        const is_benched = selected_position === 'BN';

        result.push({
          ...playerInfo,
          stats,
          selected_position,
          is_benched,
        });
      }
    }

    return result;
  }
}

// Export singleton instance
export const yahooStatsService = new YahooStatsService();