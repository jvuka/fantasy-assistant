import { NextRequest, NextResponse } from 'next/server';
import { runStatsServiceTests } from '../../../../lib/yahoo/stats-service';

export async function GET(req: NextRequest) {
  try {
    // Capture console output
    const logs: string[] = [];
    const originalLog = console.log;
    const originalAssert = console.assert;

    // Override console methods to capture output
    console.log = (...args: any[]) => {
      logs.push(args.join(' '));
      originalLog(...args);
    };

    console.assert = (condition: boolean, message?: string) => {
      if (!condition) {
        logs.push(`ASSERTION FAILED: ${message || 'No message'}`);
      }
      originalAssert(condition, message);
    };

    // Run the tests
    runStatsServiceTests();

    // Restore original console methods
    console.log = originalLog;
    console.assert = originalAssert;

    // Check if any assertion failures occurred
    const failures = logs.filter(log => log.includes('ASSERTION FAILED'));

    if (failures.length > 0) {
      return NextResponse.json({
        success: false,
        message: 'Unit tests failed',
        failures,
        allLogs: logs
      }, { status: 500 });
    }

    return NextResponse.json({
      success: true,
      message: 'All unit tests passed!',
      logs
    });

  } catch (error) {
    return NextResponse.json({
      success: false,
      message: 'Error running tests',
      error: error instanceof Error ? error.message : 'Unknown error'
    }, { status: 500 });
  }
}