import type {TestInfo} from '@playwright/test';
import type {ApiResponse} from '../api/http';

type Step = {label: string; run: () => Promise<ApiResponse>};

/** Undo stack: everything a test creates is deleted in reverse order after it finishes. */
export class Cleanup {
    private readonly steps: Step[] = [];

    add(label: string, run: () => Promise<ApiResponse>): void {
        this.steps.push({label, run});
    }

    async run(testInfo: TestInfo): Promise<void> {
        const failures: string[] = [];
        for (const step of this.steps.reverse()) {
            try {
                const res = await step.run();
                // 404 means the test already deleted it — that's fine
                if (![200, 204, 404].includes(res.status)) failures.push(`${step.label}: HTTP ${res.status}`);
            } catch (error) {
                failures.push(`${step.label}: ${(error as Error).message}`);
            }
        }
        // Leftovers are purged before the next run, so a failed cleanup is reported, not fatal
        if (failures.length) testInfo.annotations.push({type: 'cleanup-warning', description: failures.join('; ')});
    }
}
